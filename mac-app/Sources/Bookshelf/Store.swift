import SwiftUI
import AppKit
import BookshelfCore
import BookshelfWatching
import LibraryOrganization
import LibraryOrganizationUI

@MainActor final class ShelfStore: ObservableObject {
    @Published var settings = LibrarySettings()
    @Published var books: [Book] = []
    @Published var warnings: [String] = []
    @Published var busy = false
    @Published var error: String?
    private var activeURLs: [URL] = []
    private let stateURL: URL
    var iconFiles: FolderIconFiles { FolderIconFiles(directory: stateURL.deletingLastPathComponent().appendingPathComponent("folder-icons")) }
    private var refreshAgain = false
    private lazy var watcher = FolderWatcher { [weak self] in
        Task { await self?.refresh() }
    }
    private let syncConnection: AuthenticatedSyncConnection?
    private var activationObserver: NSObjectProtocol?
    init(stateURL overrideURL: URL? = nil, autoRefresh: Bool = true, enableTestSync: Bool = false, syncConnection: AuthenticatedSyncConnection? = nil) {
        self.syncConnection = syncConnection
        let arguments = ProcessInfo.processInfo.arguments
        testSyncEnabled = enableTestSync || (arguments.contains("--test-library-sync") && arguments.contains("--state"))
        if let overrideURL { stateURL = overrideURL }
        else if let i = arguments.firstIndex(of: "--state"), arguments.count > i + 1 {
            stateURL = URL(fileURLWithPath: arguments[i + 1])
        } else {
            stateURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("ZukanBookshelf/library.json")
        }
        if FileManager.default.fileExists(atPath: stateURL.path) {
            do { settings = try LibrarySettings.load(from: stateURL) }
            catch { self.error = "本棚設定を読み込めません。元の設定を保護するため、変更は保存されません。\n\(error.localizedDescription)"; writeEnabled = false }
        }
        if let i = arguments.firstIndex(of: "--source"), arguments.count > i + 1, settings.sources.isEmpty {
            settings.sources = [SourceFolder(path: arguments[i + 1])]
        }
        if autoRefresh {
        activationObserver = NotificationCenter.default.addObserver(forName: NSApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor [weak self] in await self?.refresh() }
        }
        Task { await refresh() }
        }
    }
    private var writeEnabled = true
    private var testSync: SyncLabSession?
    private let testSyncEnabled: Bool
    @discardableResult func change(_ edit: (inout LibrarySettings) -> Void) -> Bool {
        guard writeEnabled else { return false }
        guard testSync?.blocksLibraryEdits != true else { error = "同期の確認・復元処理中です。同期画面で完了または解除してから編集してください。"; return false }
        var next = settings; edit(&next)
        do { try next.save(to: stateURL); settings = next; Task { await testSync?.captureLibraryChanges() }; return true }
        catch { self.error = "保存できませんでした: \(error.localizedDescription)"; return false }
    }
    private func syncState() -> OrganizationState<OrganizationDocument> {
        var state = OrganizationState<OrganizationDocument>()
        state.folders = settings.folders; state.folderOrder = settings.folderOrder; state.assignments = settings.assignments; state.classifications = settings.classifications
        state.collections = settings.collections.map { value in ReadingCollection(id: value.id, title: value.title, members: value.members.map { OrganizationDocument(id: $0.id, title: $0.title, type: $0.type, version: $0.version, formats: $0.formats, pageCount: $0.pageCount, tags: $0.tags) }) }
        return state
    }
    func makeSyncLab() -> SyncLabSession {
        if testSyncEnabled {
            if let testSync { return testSync }
            let binding = TestLibrarySyncBinding(read: { [weak self] in guard let self else { throw CancellationError() }; return self.syncState() }, apply: { [weak self] state in
                guard let self else { throw CancellationError() }
                guard self.writeEnabled else { throw SyncError.corruptState }
                var next = self.settings
                let icons = Dictionary(uniqueKeysWithValues: next.folders.map { ($0.id, $0.iconFile) })
                let value = try JSONDecoder().decode(OrganizationState<BookReference>.self, from: JSONEncoder().encode(state))
                next.folders = value.folders.map { folder in var folder = folder; folder.iconFile = icons[folder.id] ?? nil; return folder }
                let knownIDs = self.books.map(\.id) + Array(next.assignments.keys) + Array(next.classifications.keys) + next.collections.flatMap { $0.members.map(\.id) }
                func localID(_ id: String) -> String { knownIDs.first { (UUID(uuidString: $0)?.uuidString.lowercased() ?? $0) == id } ?? id }
                next.folderOrder = value.folderOrder
                next.assignments = Dictionary(uniqueKeysWithValues: value.assignments.map { (localID($0.key), $0.value) })
                next.classifications = Dictionary(uniqueKeysWithValues: value.classifications.map { (localID($0.key), $0.value) })
                next.collections = value.collections.map { collection in var collection = collection; collection.members = collection.members.map { member in var member = member; member.id = localID(member.id); return member }; return collection }
                try next.save(to: self.stateURL); self.settings = next
            }, backup: { [weak self] in
                guard let self, self.writeEnabled else { throw SyncError.corruptState }
                // Settings JSON only; source paths/bookmarks are metadata, never followed.
                if FileManager.default.fileExists(atPath: self.stateURL.path) { return try Data(contentsOf: self.stateURL) }
                return try JSONEncoder().encode(self.settings)
            }, restore: { [weak self] data in
                guard let self, self.writeEnabled else { throw SyncError.corruptState }
                let value = try JSONDecoder().decode(LibrarySettings.self, from: data)
                guard value.schemaVersion == 1 else { throw SyncError.corruptState }
                try FileManager.default.createDirectory(at: self.stateURL.deletingLastPathComponent(), withIntermediateDirectories: true)
                try data.write(to: self.stateURL, options: .atomic)
                self.settings = value
            })
            let session = SyncLabSession(directory: stateURL.deletingLastPathComponent().appendingPathComponent("test-library-sync"), seed: syncState(), documents: books.map { OrganizationDocument(id: $0.id, title: $0.latest.title, type: $0.latest.kind, version: $0.latest.version, formats: $0.latest.files.map { $0.pathExtension }, pageCount: $0.latest.pageCount, tags: $0.latest.tags) }, binding: binding, rateLimited: true, connection: syncConnection)
            testSync = session; return session
        }
        func document(_ member: BookReference) -> OrganizationDocument {
            OrganizationDocument(id: member.id, title: member.title, type: member.type, version: member.version, formats: member.formats, pageCount: member.pageCount, tags: member.tags)
        }
        var seed = OrganizationState<OrganizationDocument>()
        seed.folders = settings.folders; seed.folderOrder = settings.folderOrder; seed.assignments = settings.assignments
        seed.classifications = settings.classifications
        seed.collections = settings.collections.map { ReadingCollection(id: $0.id, title: $0.title, members: $0.members.map(document)) }
        var seen = Set<String>()
        let documents = (books.map { document(BookReference(book: $0)) } + seed.collections.flatMap(\.members)).filter { seen.insert($0.id).inserted }
        return SyncLabSession(directory: stateURL.deletingLastPathComponent().appendingPathComponent("sync-lab"), seed: seed, documents: documents)
    }
    func addSource() {
        let panel = NSOpenPanel(); panel.canChooseDirectories = true; panel.canChooseFiles = false
        panel.prompt = "資料フォルダを登録"; panel.message = "outputs または成果物を保存したフォルダを選んでください。元ファイルは変更しません。"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        guard !settings.sources.contains(where: { $0.path == url.path }) else { return }
        do {
            let bookmark = try url.bookmarkData(options: [.withSecurityScope], includingResourceValuesForKeys: nil, relativeTo: nil)
            change { $0.sources.append(SourceFolder(path: url.path, bookmark: bookmark)) }
            Task { await refresh() }
        } catch { self.error = error.localizedDescription }
    }
    func removeSource(_ id: UUID) { change { $0.sources.removeAll { $0.id == id } }; Task { await refresh() } }
    func refresh() async {
        guard !busy else { refreshAgain = true; return }; busy = true
        repeat {
            refreshAgain = false
            let oldURLs = activeURLs
            var roots: [URL] = [], accessWarnings: [String] = []
            activeURLs = []
            for source in settings.sources {
                do {
                    var stale = false
                    let url = try source.bookmark.map { try URL(resolvingBookmarkData: $0, options: [.withSecurityScope, .withoutUI], relativeTo: nil, bookmarkDataIsStale: &stale) } ?? URL(fileURLWithPath: source.path)
                    if url.startAccessingSecurityScopedResource() { activeURLs.append(url) }
                    roots.append(url)
                    if stale { accessWarnings.append("\(source.path): アクセス権の再登録をおすすめします") }
                } catch { accessWarnings.append("\(source.path): \(error.localizedDescription)") }
            }
            if !watcher.watch(roots) { accessWarnings.append("フォルダ監視を開始できないため30秒ごとに自動更新します") }
            let scanRoots = roots
            let result = await Task.detached(priority: .userInitiated) { LibraryScanner.scan(roots: scanRoots) }.value
            books = result.books; warnings = accessWarnings + result.warnings
            for url in oldURLs { url.stopAccessingSecurityScopedResource() }
        } while refreshAgain
        busy = false
    }
    deinit {
        if let activationObserver { NotificationCenter.default.removeObserver(activationObserver) }
        for url in activeURLs { url.stopAccessingSecurityScopedResource() }
    }
    func folderPath(_ id: UUID) -> String {
        var names: [String] = []; var current: UUID? = id; var seen = Set<UUID>()
        while let value = current, seen.insert(value).inserted, let folder = settings.folders.first(where: { $0.id == value }) { names.insert(folder.name, at: 0); current = folder.parentID }
        return names.joined(separator: " / ")
    }
}

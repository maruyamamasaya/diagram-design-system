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
    private var activationObserver: NSObjectProtocol?
    init(stateURL overrideURL: URL? = nil, autoRefresh: Bool = true) {
        let arguments = ProcessInfo.processInfo.arguments
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
    @discardableResult func change(_ edit: (inout LibrarySettings) -> Void) -> Bool {
        guard writeEnabled else { return false }
        var next = settings; edit(&next)
        do { try next.save(to: stateURL); settings = next; return true }
        catch { self.error = "保存できませんでした: \(error.localizedDescription)"; return false }
    }
    func makeSyncLab() -> SyncLabSession {
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

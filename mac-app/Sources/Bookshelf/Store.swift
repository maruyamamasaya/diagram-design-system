import SwiftUI
import AppKit
import BookshelfCore
import BookshelfWatching
import LibraryOrganization
import LibraryOrganizationUI
import CryptoKit
import OSLog

@MainActor final class ShelfStore: ObservableObject {
    private let cloudOnly: Bool
    var usesCloudCatalog: Bool { cloudOnly }
    private var cloudCatalog: [CloudShelfDocument] = []
    private var cloudClient: CloudBookshelfClient?
    private var preparingCloud = Set<String>()
    private var activeCoverLoads = 0
    @Published private(set) var cloudPreviewErrors: Set<String> = []
    @Published var settings = LibrarySettings()
    @Published var books: [Book] = []
    @Published var warnings: [String] = []
    @Published var busy = false
    @Published var error: String?
    @Published private(set) var lifecycle = LibraryLifecycleIndex()
    @Published private(set) var lifecycleBusy = false
    @Published private(set) var lifecycleReadable = true
    var lifecycleEnabled: Bool { Bundle.main.object(forInfoDictionaryKey: "LibraryLifecycleEnabled") as? Bool == true }
    private var lifecycleClient: AuthenticatedLibraryLifecycle?
    private var lifecycleURL: URL?
    var trashEntries: [LibraryLifecycleEntry] { lifecycle.entries.values.filter { $0.status == .trashed || $0.status == .deleting }.sorted { $0.document.title.localizedStandardCompare($1.document.title) == .orderedAscending } }
    func visibleInLibrary(_ id: String) -> Bool { (!lifecycleEnabled || lifecycleReadable) && lifecycle.status(id) == .active }
    private func prepareLifecycle(login: Bool) async throws {
        guard lifecycleEnabled else { throw OrganizationConnectionError.invalidEndpoint }
        guard let config = try OrganizationOIDCConfiguration.bundled() else { throw OrganizationConnectionError.authentication }
        if organizationAuth == nil { organizationAuth = try OrganizationOIDC(config: config) }
        guard let auth = organizationAuth else { throw OrganizationConnectionError.authentication }
        if login {
            do { _ = try await auth.access() }
            catch { try await auth.login() }
        }
        let connection = try auth.connection()
        let namespace = SHA256.hash(data: Data(connection.identityKey.utf8)).map { String(format: "%02x", $0) }.joined()
        let url = stateURL.deletingLastPathComponent().appendingPathComponent("lifecycle-\(namespace).json")
        if lifecycleURL != url {
            do { lifecycle = FileManager.default.fileExists(atPath: url.path) ? try JSONDecoder().decode(LibraryLifecycleIndex.self, from: Data(contentsOf: url)) : LibraryLifecycleIndex(); lifecycleReadable = true }
            catch { lifecycleReadable = false; lifecycle = LibraryLifecycleIndex() }
            lifecycleURL = url
        }
        if lifecycleClient?.connection.identityKey != connection.identityKey {
            lifecycleClient = AuthenticatedLibraryLifecycle(connection: connection)
        }
        try removeDeletedAppCopies()
    }
    private func persistLifecycle() throws {
        guard let lifecycleURL else { throw OrganizationConnectionError.authentication }
        try FileManager.default.createDirectory(at: lifecycleURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(lifecycle).write(to: lifecycleURL, options: .atomic)
        try Data(lifecycleURL.lastPathComponent.utf8).write(to: stateURL.deletingLastPathComponent().appendingPathComponent("lifecycle-account.txt"), options: .atomic)
        try removeDeletedAppCopies()
    }
    private func removeDeletedAppCopies() throws {
        // Source folders contain production originals, not application-owned copies.
        // Only this account's future cloud-copy directory may be cleaned automatically.
        guard let lifecycleURL else { return }
        let root = lifecycleURL.deletingPathExtension().appendingPathExtension("copies")
        guard FileManager.default.fileExists(atPath: root.path) else { return }
        guard try root.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink != true else { throw OrganizationConnectionError.invalidResponse }
        for id in lifecycle.deletedIDs {
            let child = root.appendingPathComponent(id)
            if FileManager.default.fileExists(atPath: child.path) { try FileManager.default.removeItem(at: child) }
        }
    }
    func refreshLifecycle(login: Bool = false) async {
        guard lifecycleEnabled, !lifecycleBusy else { return }
        lifecycleBusy = true; defer { lifecycleBusy = false }
        do {
            try await prepareLifecycle(login: login)
            guard let lifecycleClient else { throw OrganizationConnectionError.authentication }
            let snapshot = try await lifecycleClient.snapshot()
            try lifecycle.merge(snapshot); try persistLifecycle(); lifecycleReadable = true
        } catch { self.error = "共通ゴミ箱を更新できませんでした。接続とログインを確認してください。" }
    }
    func setTrashed(_ ids: Set<String>, trashed: Bool) async {
        guard lifecycleEnabled, !lifecycleBusy else { return }
        lifecycleBusy = true; defer { lifecycleBusy = false }
        do {
            try await prepareLifecycle(login: false)
            guard lifecycleReadable else { throw OrganizationConnectionError.invalidResponse }
            guard let lifecycleClient else { throw OrganizationConnectionError.authentication }
            for rawID in ids.sorted() {
                let id = rawID.lowercased()
                let entry = try await lifecycleClient.move(id: id, revision: lifecycle.entries[id]?.revision ?? 0, trashed: trashed)
                try lifecycle.merge(entry); try persistLifecycle()
            }
            if cloudOnly && !trashed { await refreshCloud() }
        } catch { self.error = "完了した操作は保持しました。残りはゴミ箱を更新してから再試行してください。" }
    }
    func deletionPlans(_ ids: Set<String>) async -> [LibraryDeletionPlan]? {
        guard lifecycleEnabled, !lifecycleBusy else { return nil }
        lifecycleBusy = true; defer { lifecycleBusy = false }
        do {
            try await prepareLifecycle(login: false)
            guard let lifecycleClient else { throw OrganizationConnectionError.authentication }
            var plans: [LibraryDeletionPlan] = []
            for id in ids.sorted() { plans.append(try await lifecycleClient.plan(id: id)) }
            return plans
        } catch { self.error = "削除対象を確認できませんでした。更新してから再試行してください。"; return nil }
    }
    func permanentlyDelete(_ plans: [LibraryDeletionPlan]) async {
        guard lifecycleEnabled, !lifecycleBusy, let lifecycleClient else { return }
        lifecycleBusy = true; defer { lifecycleBusy = false }
        do {
            for plan in plans { let entry = try await lifecycleClient.erase(plan); try lifecycle.merge(entry); try persistLifecycle() }
        } catch { self.error = "削除を完了できない資料があります。削除中の資料は復元できません。更新後、同じ対象で再試行してください。" }
    }
    private var activeURLs: [URL] = []
    private let stateURL: URL
    var iconFiles: FolderIconFiles { FolderIconFiles(directory: stateURL.deletingLastPathComponent().appendingPathComponent("folder-icons")) }
    private var refreshAgain = false
    private lazy var watcher = FolderWatcher { [weak self] in
        Task { await self?.refresh() }
    }
    private var syncConnection: AuthenticatedSyncConnection?
    private var activationObserver: NSObjectProtocol?
    init(stateURL overrideURL: URL? = nil, autoRefresh: Bool = true, enableTestSync: Bool = false, syncConnection: AuthenticatedSyncConnection? = nil) {
        cloudOnly = overrideURL == nil && !ProcessInfo.processInfo.arguments.contains("--state")
        self.syncConnection = syncConnection
        let arguments = ProcessInfo.processInfo.arguments
        testSyncEnabled = enableTestSync || (arguments.contains("--test-library-sync") && arguments.contains("--state"))
        if let overrideURL { stateURL = overrideURL }
        else if let i = arguments.firstIndex(of: "--state"), arguments.count > i + 1 {
            stateURL = URL(fileURLWithPath: arguments[i + 1])
        } else {
            stateURL = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("ZukanBookshelf/library.json")
        }
        if lifecycleEnabled {
            let parent = stateURL.deletingLastPathComponent()
            let marker = parent.appendingPathComponent("lifecycle-account.txt")
            if let name = try? String(contentsOf: marker, encoding: .utf8),
               name.range(of: "^lifecycle-[a-f0-9]{64}\\.json$", options: .regularExpression) != nil {
                let file = parent.appendingPathComponent(name)
                do { lifecycle = try JSONDecoder().decode(LibraryLifecycleIndex.self, from: Data(contentsOf: file)); lifecycleURL = file }
                catch { lifecycleReadable = false; self.error = "共通ゴミ箱の端末記録を読み込めません。接続して更新するまで資料表示を停止します。" }
            }
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
    private var productionSync = false
    private var testSyncEnabled: Bool
    @discardableResult func change(_ edit: (inout LibrarySettings) -> Void) -> Bool {
        guard writeEnabled else { return false }
        guard testSync?.blocksLibraryEdits != true else { error = "同期の確認・復元処理中です。同期画面で完了または解除してから編集してください。"; return false }
        var next = settings; next.folders = folderOrganization.folders; next.assignments = folderOrganization.assignments; next.folderOrder = folderOrganization.folderOrder; edit(&next)
        do { try next.save(to: stateURL); settings = next; Task { await testSync?.captureLibraryChanges() }; return true }
        catch { self.error = "保存できませんでした: \(error.localizedDescription)"; return false }
    }
    private func syncState() -> OrganizationState<OrganizationDocument> {
        var state = OrganizationState<OrganizationDocument>()
        state.folders = settings.folders; state.folderOrder = settings.folderOrder; state.assignments = settings.assignments; state.classifications = settings.classifications
        state.collections = settings.collections.map { value in ReadingCollection(id: value.id, title: value.title, members: value.members.map { OrganizationDocument(id: $0.id, title: $0.title, type: $0.type, version: $0.version, formats: $0.formats, pageCount: $0.pageCount, tags: $0.tags) }) }
        return state
    }
    private var organizationAuth: OrganizationOIDC?
    var organizationSyncAvailable: Bool { (try? OrganizationOIDCConfiguration.bundled()) != nil }
    func connectOrganizationSync() async throws -> SyncLabSession {
        guard let config = try OrganizationOIDCConfiguration.bundled(), writeEnabled else { throw OrganizationConnectionError.authentication }
        if organizationAuth == nil { organizationAuth = try OrganizationOIDC(config: config) }
        guard let auth = organizationAuth else { throw OrganizationConnectionError.authentication }
        // Do not replace a pending session/account. The checkpoint enforces the identity.
        do { _ = try await auth.access() }
        catch { try await auth.login() }
        if let testSync { return testSync }
        // Share the existing API pacer with catalog/cover requests.
        syncConnection = try cloudClient?.connection ?? auth.connection()
        testSyncEnabled = true; productionSync = true
        return makeSyncLab()
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
            let session = SyncLabSession(directory: stateURL.deletingLastPathComponent().appendingPathComponent(productionSync ? "organization-sync" : "test-library-sync"), seed: syncState(), documents: books.map { OrganizationDocument(id: $0.id, title: $0.latest.title, type: $0.latest.kind, version: $0.latest.version, formats: $0.latest.files.map { $0.pathExtension }, pageCount: $0.latest.pageCount, tags: $0.latest.tags) }, binding: binding, rateLimited: true, connection: syncConnection)
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
    func refreshCloud(login: Bool = false) async {
        guard !busy else { return }
        busy = true; defer { busy = false }
        do {
            try await prepareLifecycle(login: login)
            guard let connection = lifecycleClient?.connection, let lifecycleURL else { throw OrganizationConnectionError.authentication }
            let directory = lifecycleURL.deletingPathExtension().appendingPathExtension("copies")
            if cloudClient?.connection.identityKey != connection.identityKey {
                books = []; cloudCatalog = []
                cloudClient = CloudBookshelfClient(connection: connection, directory: directory)
            }
            guard let cloudClient, let lifecycleClient else { throw OrganizationConnectionError.authentication }
            if cloudCatalog.isEmpty {
                cloudCatalog = cloudClient.cachedCatalog()
                books = cloudCatalog.filter { visibleInLibrary($0.id) }.map(cloudClient.book)
            }
            let snapshot = try await lifecycleClient.snapshot()
            try lifecycle.merge(snapshot); try persistLifecycle(); lifecycleReadable = true
            let documents = try await cloudClient.catalog()
            cloudCatalog = documents
            books = documents.filter { visibleInLibrary($0.id) }.map(cloudClient.book)
            warnings = cloudClient.rejectedCount > 0 ? ["情報を検証できない資料が\(cloudClient.rejectedCount)版あります。他の資料は閲覧できます。"] : []; error = nil
        } catch {
            Logger(subsystem: "jp.local.zukan.bookshelf", category: "cloud").error("Catalog refresh failed: \(String(describing: error), privacy: .public)")
            self.error = "本棚の更新に失敗しました。取得済み資料は引き続き開けます。"
        }
    }
    func cloudTaskKey(_ id: String) -> String { id + "/" + String(books.first(where: { $0.id == id })?.latest.version ?? 0) }
    func cloudFormats(_ id: String) -> [String] { cloudCatalog.first { $0.id == id }?.formats.filter { ["pdf", "png", "pptx"].contains($0) } ?? [] }
    @discardableResult func prepareCloudBook(_ id: String, preview: Bool, artifact: String? = nil) async -> URL? {
        guard cloudOnly, let client = cloudClient, let document = cloudCatalog.first(where: { $0.id == id }), visibleInLibrary(id) else { return nil }
        // Keep background covers from reserving the API pacer's entire queue.
        // A selected preview can enter immediately, sharing the same rate limit.
        if !preview {
            while activeCoverLoads >= 2 {
                do { try await Task.sleep(for: .milliseconds(100)) } catch { return nil }
            }
            guard !Task.isCancelled else { return nil }
            activeCoverLoads += 1
        }
        defer { if !preview { activeCoverLoads -= 1 } }
        let key = id + "/" + String(document.version) + "/" + (artifact ?? (preview ? "preview" : "cover"))
        // SwiftUI may cancel/restart selection tasks before the old one unwinds.
        // Wait for that cleanup instead of leaving the new selection unprepared.
        while preparingCloud.contains(key) {
            do { try await Task.sleep(for: .milliseconds(100)) } catch { return nil }
        }
        guard !Task.isCancelled else { return nil }
        preparingCloud.insert(key)
        defer { preparingCloud.remove(key) }
        if preview { cloudPreviewErrors.remove(id) }
        do {
            try await client.prepare(document, preview: preview, artifact: artifact, active: { [weak self] in self?.visibleInLibrary(id) == true && self?.cloudClient === client && self?.cloudCatalog.contains(where: { $0.id == id && $0.version == document.version }) == true })
            guard visibleInLibrary(id), cloudClient === client, let index = books.firstIndex(where: { $0.id == id }) else { return nil }
            books[index] = client.book(document)
            return artifact.flatMap { format in books[index].latest.files.first { $0.pathExtension == format } } ?? books[index].latest.preview
        } catch {
            Logger(subsystem: "jp.local.zukan.bookshelf", category: "cloud").error("Asset fetch failed: \(String(describing: type(of: error)), privacy: .public)")
            if preview, !(error is CancellationError), !Task.isCancelled { cloudPreviewErrors.insert(id) }
            return nil
        }
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
        if cloudOnly { await refreshCloud(); return }
        if lifecycleEnabled { await refreshLifecycle() }
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
    var folderOrganization: OrganizationState<BookReference> {
        var state = settings.organization
        let kinds = Dictionary(books.map { ($0.id, $0.latest.kind) }, uniquingKeysWith: { a, _ in a })
        state.scopeLegacyFolders { id in
            let kind = kinds[id] ?? settings.collections.flatMap(\.members).first(where: { $0.id == id })?.type ?? "presentation"
            return kind == "presentation" ? .presentation : .illustration
        }
        return state
    }
    func folderPath(_ id: UUID) -> String {
        var names: [String] = []; var current: UUID? = id; var seen = Set<UUID>()
        while let value = current, seen.insert(value).inserted, let folder = folderOrganization.folders.first(where: { $0.id == value }) { if !LibraryShelf.isRoot(folder.id) { names.insert(folder.name, at: 0) }; current = folder.parentID }
        return names.joined(separator: " / ")
    }
}

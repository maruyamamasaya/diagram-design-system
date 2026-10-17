import Foundation
import SwiftUI
import LibraryOrganization

/// A separate, durable rehearsal copy. Never writes to the application's live settings.
@MainActor public final class SyncLabSession: ObservableObject, Identifiable {
    public let id = UUID()
    struct Checkpoint: Codable {
        var schemaVersion = 1
        var endpoint: String
        var client: OrganizationSyncClient<OrganizationDocument>
        var initialPlan: OrganizationImportPlan<OrganizationDocument>?
        var imported: Bool
        var lastSynced: Date?
    }
    @Published public private(set) var status = "未接続"
    @Published public private(set) var busy = false
    @Published public private(set) var message: String?
    @Published private var checkpoint: Checkpoint?
    private let sourceDocuments: [OrganizationDocument]
    public var documents: [OrganizationDocument] {
        var seen = Set<String>()
        var result = (sourceDocuments + state.collections.flatMap(\.members)).filter { seen.insert($0.id).inserted }
        for id in Set(state.assignments.keys).union(state.classifications.keys).sorted() where seen.insert(id).inserted {
            result.append(OrganizationDocument(id: id, title: "未取得の資料（\(id)）", type: "unknown", version: 1, formats: [], pageCount: 1, tags: []))
        }
        return result
    }
    private let seed: OrganizationState<OrganizationDocument>
    private var restoreFailed = false
    private let directory: URL
    private let file: URL
    public var endpoint: String { checkpoint?.endpoint ?? "http://127.0.0.1:8765" }
    public var libraryID: String { checkpoint?.client.libraryID.uuidString ?? "" }
    public var state: OrganizationState<OrganizationDocument> {
        guard let checkpoint else { return seed }
        if let plan = checkpoint.initialPlan { return OrganizationSyncProjection.state(from: plan.values.mapValues { SyncRecord(value: $0) }) }
        return OrganizationSyncProjection.state(from: checkpoint.client.records)
    }
    public var pendingCount: Int { checkpoint?.client.pending.count ?? 0 }
    public var conflicts: [SyncReceipt<OrganizationDocument>] { checkpoint?.client.conflicts ?? [] }
    public var initialConflicts: [OrganizationImportConflict<OrganizationDocument>] { checkpoint?.initialPlan?.conflicts ?? [] }
    public var connected: Bool { checkpoint != nil }
    public var imported: Bool { checkpoint?.imported ?? false }
    public var lastSynced: Date? { checkpoint?.lastSynced }
    public var revision: Int { checkpoint?.client.baseline.revision ?? 0 }
    public init(directory: URL, seed: OrganizationState<OrganizationDocument>, documents: [OrganizationDocument]) {
        self.directory = directory; file = directory.appendingPathComponent("checkpoint.json")
        self.seed = seed
        self.sourceDocuments = documents
        if FileManager.default.fileExists(atPath: file.path) {
            do {
                let data = try Data(contentsOf: file)
                let value = try JSONDecoder().decode(Checkpoint.self, from: data)
                try value.client.validate()
                guard value.schemaVersion == 1, value.imported == (value.initialPlan == nil) else { throw SyncError.corruptState }
                guard let url = URL(string: value.endpoint) else { throw SyncError.corruptState }
                _ = try LoopbackOrganizationTransport<OrganizationDocument>(baseURL: url)
                checkpoint = value; status = value.imported ? "検証コピーを復元" : "初回統合の確認待ち"
            } catch { restoreFailed = true; message = "検証データを復元できません。既存データは変更していません。検証コピーを解除してから再作成してください。" }
        }
    }
    private func commit(_ next: Checkpoint) throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try JSONEncoder().encode(next).write(to: file, options: .atomic)
        checkpoint = next
    }
    public func prepare(endpoint: String, libraryID: String) async {
        guard !busy, !restoreFailed, checkpoint == nil else { return }
        busy = true; defer { busy = false }
        do {
            guard let url = URL(string: endpoint), let id = UUID(uuidString: libraryID) else { throw SyncError.invalidValue }
            let transport = try LoopbackOrganizationTransport<OrganizationDocument>(baseURL: url)
            var client = OrganizationSyncClient<OrganizationDocument>(libraryID: id)
            // Fetch without publishing any local values. Failed connection leaves live data untouched.
            try await client.synchronize(with: transport)
            let incoming = try OrganizationSyncProjection.records(from: seed, documentID: { UUID(uuidString: $0)?.uuidString.lowercased() ?? $0 })
            let plan = OrganizationImportPlan(existing: client.baseline.records.mapValues(\.value), incoming: incoming)
            let next = Checkpoint(endpoint: endpoint, client: client, initialPlan: plan, imported: false)
            try commit(next); status = "初回統合の確認待ち"; message = nil
        } catch { status = "接続できません"; message = "模擬サーバーの起動・URL・ライブラリIDを確認してください。" }
    }
    public func chooseInitial(key: String, incoming: Bool) {
        guard !busy, var next = checkpoint else { return }
        next.initialPlan?.resolve(key: key, useIncoming: incoming)
        do { try commit(next); message = nil } catch { message = "確認結果を保存できません。" }
    }
    public func confirmImport() {
        guard !busy, var next = checkpoint, let plan = next.initialPlan else { return }
        do {
            try plan.enqueue(into: &next.client)
            next.initialPlan = nil; next.imported = true
            try commit(next); status = "送信待ち"; message = nil
        } catch { message = "競合やフォルダ階層を確認してください。元の整理情報は保持しています。" }
    }
    public func edit(key: String, value: SyncValue<OrganizationDocument>) {
        guard !busy, var next = checkpoint, next.imported else { return }
        next.client.edit(key: key, value: value)
        do { try commit(next); status = "送信待ち"; message = nil } catch { message = "編集を保存できません。" }
    }
    public func setEndpoint(_ endpoint: String) {
        guard !busy, var next = checkpoint else { return }
        do {
            guard let url = URL(string: endpoint) else { throw SyncError.nonLoopback }
            _ = try LoopbackOrganizationTransport<OrganizationDocument>(baseURL: url)
            next.endpoint = endpoint; try commit(next); message = nil
        } catch { message = "接続先は http://127.0.0.1:ポート を指定してください。" }
    }
    public func synchronize() async {
        guard !busy, var next = checkpoint, next.imported else { return }
        busy = true; defer { busy = false }
        do {
            let transport = try LoopbackOrganizationTransport<OrganizationDocument>(baseURL: URL(string: next.endpoint)!)
            try await next.client.synchronize(with: transport)
            next.lastSynced = Date()
            try commit(next); status = next.client.conflicts.isEmpty ? "同期済み" : "競合の確認待ち"; message = nil
        } catch {
            // Keep partial acknowledgements and unsent operations after a network failure.
            do { try commit(next) } catch { /* previous atomic checkpoint remains replayable */ }
            status = "通信待ち"; message = "送信待ちは保持しています。サーバー復帰後に再試行できます。"
        }
    }
    public func resolve(key: String, keepingLocal: Bool) {
        guard !busy, var next = checkpoint else { return }
        next.client.resolve(key: key, keepingLocal: keepingLocal)
        do { try commit(next); status = next.client.pending.isEmpty ? "確認済み" : "送信待ち"; message = nil }
        catch { message = "解決結果を保存できません。" }
    }
    public func clear() {
        guard !busy else { return }
        do {
            if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) }
            if FileManager.default.fileExists(atPath: directory.path), try FileManager.default.contentsOfDirectory(atPath: directory.path).isEmpty {
                try FileManager.default.removeItem(at: directory)
            }
            checkpoint = nil; restoreFailed = false; status = "未接続"; message = nil
        } catch { message = "検証コピーを解除できません。" }
    }
    public func title(for key: String) -> String {
        let label = OrganizationSyncKey.title(key)
        for folder in state.folders where key == OrganizationSyncKey.folder(folder.id) { return "フォルダ · " + folder.name }
        for collection in state.collections where key == OrganizationSyncKey.collection(collection.id) { return "まとめ · " + collection.title }
        for document in documents where label.hasSuffix(" · " + document.id) { return label.replacingOccurrences(of: document.id, with: document.title) }
        return label
    }
    public func describe(_ value: SyncValue<OrganizationDocument>?) -> String {
        guard let value else { return "設定なし" }
        switch value {
        case .folder(let folder): return "フォルダ：" + folder.name
        case .assignment(let id): return "移動先：" + (state.folders.first { $0.id == id }?.name ?? "削除済みフォルダ")
        case .group(let group): return group.rawValue
        case .tag(let tag): return tag
        case .collection(let collection): return collection.title + "：" + collection.members.map(\.title).joined(separator: " → ")
        case .order(let ids): return ids.map { id in state.folders.first { $0.id == id }?.name ?? "削除済み" }.joined(separator: " → ")
        case .deleted: return "解除・削除済み"
        }
    }
}

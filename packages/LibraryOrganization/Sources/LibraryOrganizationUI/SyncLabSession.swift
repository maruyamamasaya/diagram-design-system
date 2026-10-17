import Foundation
import SwiftUI
import LibraryOrganization

/// Opt-in binding for isolated test libraries. Production callers keep the default rehearsal mode.
@MainActor public struct TestLibrarySyncBinding {
    public var read: () async throws -> OrganizationState<OrganizationDocument>
    public var apply: (OrganizationState<OrganizationDocument>) async throws -> Void
    public var backup: () async throws -> Data
    public var restore: (Data) async throws -> Void
    public init(read: @escaping () async throws -> OrganizationState<OrganizationDocument>, apply: @escaping (OrganizationState<OrganizationDocument>) async throws -> Void, backup: (() async throws -> Data)? = nil, restore: ((Data) async throws -> Void)? = nil) {
        self.read = read; self.apply = apply
        self.backup = backup ?? { try await JSONEncoder().encode(read()) }
        self.restore = restore ?? { data in try await apply(JSONDecoder().decode(OrganizationState<OrganizationDocument>.self, from: data)) }
    }
}

/// Durable sync session; writeback requires an explicit test-library binding.
@MainActor public final class SyncLabSession: ObservableObject, Identifiable {
    public let id = UUID()
    struct Checkpoint: Codable {
        var schemaVersion = 1
        var endpoint: String
        var client: OrganizationSyncClient<OrganizationDocument>
        var initialPlan: OrganizationImportPlan<OrganizationDocument>?
        var imported: Bool
        var lastSynced: Date?
        var observed: [String: SyncValue<OrganizationDocument>]?
        var bound: Bool?
        var applying: [String: SyncValue<OrganizationDocument>]?
    }
    @Published public private(set) var status = "未接続"
    @Published public private(set) var busy = false
    @Published public private(set) var message: String?
    @Published private var checkpoint: Checkpoint?
    @Published private var recovery: SyncRecoveryPoint?
    private var recoveryCorrupt = false
    public var backupDate: Date? { recovery?.createdAt }
    public var canRestoreBackup: Bool { binding != nil && recovery != nil && !busy }
    public var restorationPending: Bool { recovery?.restoring == true }
    public var blocksLibraryEdits: Bool { busy || restorationPending || (connected && !imported) }
    public var localImportCounts: SyncChangeCounts {
        guard let plan = checkpoint?.initialPlan else { return SyncChangeCounts() }
        return .compare(checkpoint?.observed ?? [:], plan.values)
    }
    public var uploadImportCounts: SyncChangeCounts {
        guard let next = checkpoint, let plan = next.initialPlan else { return SyncChangeCounts() }
        return .compare(next.client.baseline.records.mapValues(\.value), plan.values)
    }
    private var recoveryFile: URL { directory.appendingPathComponent("recovery.json") }
    @Published private var throttle = SyncThrottleState()
    private var throttleCorrupt = false
    public let rateLimited: Bool
    public var syncQuota: SyncQuota? { throttle.quota }
    public var nextSyncAt: Date? {
        if let permit = throttle.permit, permit.expiresAt > Date() { return nil }
        return throttle.quota?.nextAllowedAt
    }
    private var throttleFile: URL { directory.appendingPathComponent("sync-throttle.json") }
    private let binding: TestLibrarySyncBinding?
    public var isTestLibrary: Bool { binding != nil }
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
    public init(directory: URL, seed: OrganizationState<OrganizationDocument>, documents: [OrganizationDocument], binding: TestLibrarySyncBinding? = nil, rateLimited: Bool = false) {
        self.rateLimited = rateLimited
        self.binding = binding
        self.directory = directory; file = directory.appendingPathComponent("checkpoint.json")
        self.seed = seed
        self.sourceDocuments = documents
        if rateLimited, FileManager.default.fileExists(atPath: throttleFile.path) {
            do { throttle = try JSONDecoder().decode(SyncThrottleState.self, from: Data(contentsOf: throttleFile)) }
            catch { throttleCorrupt = true; message = "同期回数の記録を読めません。上書きせず同期を停止しています。" }
        }
        if binding != nil, FileManager.default.fileExists(atPath: recoveryFile.path) {
            do {
                let value = try JSONDecoder().decode(SyncRecoveryPoint.self, from: Data(contentsOf: recoveryFile))
                guard value.schemaVersion == 1 else { throw SyncError.corruptState }
                recovery = value
            } catch { recoveryCorrupt = true; message = "管理データのバックアップを読めません。上書きせず同期を停止しています。" }
        }
        if FileManager.default.fileExists(atPath: file.path) {
            do {
                let data = try Data(contentsOf: file)
                let value = try JSONDecoder().decode(Checkpoint.self, from: data)
                try value.client.validate()
                guard (value.bound ?? false) == (binding != nil), binding == nil || value.observed != nil else { throw SyncError.corruptState }
                guard value.schemaVersion == 1, value.imported == (value.initialPlan == nil) else { throw SyncError.corruptState }
                guard let url = URL(string: value.endpoint) else { throw SyncError.corruptState }
                _ = try LoopbackOrganizationTransport<OrganizationDocument>(baseURL: url)
                checkpoint = value; status = value.imported ? (binding == nil ? "検証コピーを復元" : "テスト本棚の同期を復元") : "初回統合の確認待ち"
            } catch { restoreFailed = true; message = "検証データを復元できません。既存データは変更していません。検証コピーを解除してから再作成してください。" }
        }
        if restorationPending { status = "復元待ち・同期停止中" }
        else if recovery?.restored == true && checkpoint == nil { status = "同期を停止して復元済み" }
    }
    private func commit(_ next: Checkpoint) throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try JSONEncoder().encode(next).write(to: file, options: .atomic)
        checkpoint = next
    }
    private func saveThrottle() throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try JSONEncoder().encode(throttle).write(to: throttleFile, options: .atomic)
    }
    private func abandonPermit() {
        guard !throttleCorrupt else { return }
        throttle.attemptID = nil; throttle.permit = nil
        if rateLimited { do { try saveThrottle() } catch { throttleCorrupt = true } }
    }
    private func limitedTransport(endpoint: String, libraryID: UUID, allowExtra: Bool) async throws -> LimitedLoopbackTransport<OrganizationDocument> {
        guard !throttleCorrupt else { throw SyncError.corruptState }
        if throttle.endpoint != endpoint || throttle.libraryID != libraryID {
            throttle = SyncThrottleState(endpoint: endpoint, libraryID: libraryID)
        }
        if !allowExtra, let permit = throttle.permit, permit.expiresAt > Date() {
            return try LimitedLoopbackTransport(baseURL: URL(string: endpoint)!, attemptID: permit.id)
        }
        if !allowExtra, let quota = throttle.quota, let next = quota.nextAllowedAt, next > Date() {
            throw SyncQuotaFailure(reason: "hourly_limit", quota: quota)
        }
        if throttle.permit != nil { throttle.attemptID = nil; throttle.permit = nil }
        let attempt = throttle.attemptID ?? UUID()
        throttle.attemptID = attempt
        try saveThrottle() // repeat admission with the same ID after a lost acknowledgement
        var transport = try LimitedLoopbackTransport<OrganizationDocument>(baseURL: URL(string: endpoint)!, attemptID: attempt)
        var admission = try await transport.reserve(libraryID: libraryID)
        if admission.permit == nil && admission.quota.challenge == nil {
            // An acknowledged reservation may have expired while the app was offline.
            let fresh = UUID(); throttle.attemptID = fresh; try saveThrottle()
            transport = try LimitedLoopbackTransport(baseURL: URL(string: endpoint)!, attemptID: fresh)
            admission = try await transport.reserve(libraryID: libraryID)
        }
        if admission.permit == nil && allowExtra, let challenge = admission.quota.challenge {
            admission = try await transport.reserve(libraryID: libraryID, consent: challenge)
        }
        throttle.quota = admission.quota; throttle.permit = admission.permit
        try saveThrottle()
        guard admission.permit != nil else { throw SyncQuotaFailure(reason: "hourly_limit", quota: admission.quota) }
        return transport
    }
    private func showQuotaFailure(_ failure: SyncQuotaFailure) {
        throttle.quota = failure.quota
        if failure.reason != "hourly_limit" { throttle.permit = nil; throttle.attemptID = nil }
        do { try saveThrottle() } catch { throttleCorrupt = true }
        status = "同期待ち"
        message = failure.reason == "hourly_limit" ? "直近1時間の通常同期は5回までです。編集と送信待ちは保持しています。" : "この同期の受付期限または通信上限に達しました。編集と送信待ちは保持しています。"
    }
    private func saveRecovery(_ value: SyncRecoveryPoint) throws {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try JSONEncoder().encode(value).write(to: recoveryFile, options: .atomic)
        recovery = value
    }
    private func makeBackup() async throws {
        guard let binding else { return }
        let point = SyncRecoveryPoint(payload: try await binding.backup())
        // Retain earlier points without adding a history-management UI.
        let archive = directory.appendingPathComponent("backups")
        try FileManager.default.createDirectory(at: archive, withIntermediateDirectories: true)
        try JSONEncoder().encode(point).write(to: archive.appendingPathComponent(UUID().uuidString + ".json"), options: .atomic)
        try saveRecovery(point)
    }
    public func restoreBackup() async {
        guard !busy, !recoveryCorrupt, let binding, var point = recovery else { return }
        busy = true; defer { busy = false }
        do {
            point.restoring = true
            try saveRecovery(point) // pause durably before touching the library
            try await binding.restore(point.payload)
            if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) }
            checkpoint = nil; restoreFailed = false; abandonPermit()
            point.restoring = false; point.restored = true
            try saveRecovery(point)
            status = "同期を停止して復元済み"; message = "管理データをバックアップ時点へ戻しました。サーバーの情報は変更していません。再接続には初回確認が必要です。"
        } catch { status = "復元待ち・同期停止中"; message = "復元を完了できませんでした。バックアップを保持し、同期は停止しています。復元を再試行してください。" }
    }
    public func prepare(endpoint: String, libraryID: String, allowExtra: Bool = false) async {
        guard !busy, !restoreFailed, !recoveryCorrupt, !restorationPending, checkpoint == nil else { return }
        busy = true; defer { busy = false }
        do {
            guard let url = URL(string: endpoint), let id = UUID(uuidString: libraryID) else { throw SyncError.invalidValue }
            let transport = try LoopbackOrganizationTransport<OrganizationDocument>(baseURL: url)
            do { try await makeBackup() } // management data only, before first import/send
            catch { status = "バックアップできません"; message = "管理データを保護できないため同期を有効にしていません。空き容量や保存先を確認してください。"; return }
            var client = OrganizationSyncClient<OrganizationDocument>(libraryID: id)
            // Fetch without publishing any local values. Failed connection leaves live data untouched.
            if rateLimited {
                let limited = try await limitedTransport(endpoint: endpoint, libraryID: id, allowExtra: allowExtra)
                try await client.synchronize(with: limited)
            } else { try await client.synchronize(with: transport) }
            let source = try await binding?.read() ?? seed
            let incoming = try OrganizationSyncProjection.records(from: source, documentID: { UUID(uuidString: $0)?.uuidString.lowercased() ?? $0 })
            let plan = OrganizationImportPlan(existing: client.baseline.records.mapValues(\.value), incoming: incoming)
            let next = Checkpoint(endpoint: endpoint, client: client, initialPlan: plan, imported: false, observed: incoming, bound: binding != nil)
            try commit(next); status = "初回統合の確認待ち"; message = nil
        } catch let failure as SyncQuotaFailure { showQuotaFailure(failure) }
        catch { status = "接続できません"; message = "模擬サーバーの起動・URL・ライブラリIDを確認してください。" }
    }
    public func chooseInitial(key: String, incoming: Bool) {
        guard !busy, var next = checkpoint else { return }
        next.initialPlan?.resolve(key: key, useIncoming: incoming)
        do { try commit(next); message = nil } catch { message = "確認結果を保存できません。" }
    }
    public func confirmImport() {
        guard !busy, !restorationPending, !recoveryCorrupt, binding == nil || recovery != nil, var next = checkpoint, let plan = next.initialPlan else { return }
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
    private func capture(into next: inout Checkpoint) async throws {
        guard let binding else { return }
        let source = try await OrganizationSyncProjection.records(from: binding.read(), documentID: { UUID(uuidString: $0)?.uuidString.lowercased() ?? $0 })
        let previous = next.observed ?? [:]
        for key in Set(source.keys).union(previous.keys).sorted() where source[key] != previous[key] {
            // A crash after writeback must not turn received state into a new local edit,
            // which would otherwise discard an unresolved conflict on the same key.
            if let applying = next.applying, source[key] == applying[key] { continue }
            next.client.edit(key: key, value: source[key] ?? .deleted)
        }
        next.observed = source
    }
    /// Called after ordinary durable edits; also reconciled on every manual sync/relaunch.
    public func captureLibraryChanges() async {
        guard !busy, !restorationPending, !recoveryCorrupt, var next = checkpoint, next.imported, binding != nil else { return }
        busy = true; defer { busy = false }
        do { try await capture(into: &next); try commit(next); status = next.client.pending.isEmpty ? "確認済み" : "送信待ち"; message = nil }
        catch { message = "本棚の編集を送信待ちへ保存できません。次回同期で再確認します。" }
    }
    public func synchronize(allowExtra: Bool = false) async {
        guard !busy, imported, !restorationPending, !recoveryCorrupt else { return }
        guard let url = URL(string: endpoint), let id = UUID(uuidString: libraryID), let transport = try? LoopbackOrganizationTransport<OrganizationDocument>(baseURL: url) else { return }
        if !rateLimited { await synchronize(with: transport); return }
        busy = true; defer { busy = false }
        let limited: LimitedLoopbackTransport<OrganizationDocument>
        do { limited = try await limitedTransport(endpoint: endpoint, libraryID: id, allowExtra: allowExtra) }
        catch let failure as SyncQuotaFailure { showQuotaFailure(failure); return }
        catch { status = "通信待ち"; message = "同期の受付を確認できません。送信待ちは保持しています。"; return }
        let before = lastSynced
        await performSynchronize(with: limited)
        if lastSynced != nil && lastSynced != before {
            try? await limited.finish(libraryID: id)
            abandonPermit()
        }
    }
    public func synchronize<T: OrganizationSyncTransport>(with transport: T) async where T.Member == OrganizationDocument {
        guard !busy, !restorationPending, !recoveryCorrupt, imported else { return }
        busy = true; defer { busy = false }
        await performSynchronize(with: transport)
    }
    private func performSynchronize<T: OrganizationSyncTransport>(with transport: T) async where T.Member == OrganizationDocument {
        guard var next = checkpoint, next.imported else { return }
        do {
            if binding != nil && recovery == nil { try await makeBackup() } // older test checkpoints
            try await capture(into: &next)
            try commit(next) // durable outbox before sending
            try await next.client.synchronize(with: transport)
            // Ordinary edits may have completed while the request was in flight.
            try await capture(into: &next)
            if binding != nil {
                next.applying = try OrganizationSyncProjection.records(from: OrganizationSyncProjection.state(from: next.client.records), documentID: { $0 })
            }
            try commit(next) // received state remains replayable if writeback fails
        } catch {
            do { try commit(next) } catch { }
            if let failure = error as? SyncQuotaFailure { showQuotaFailure(failure) }
            else { status = "通信待ち"; message = "送信待ちは保持しています。サーバー復帰後に再試行できます。" }
            return
        }
        do {
            if let binding {
                try await binding.apply(OrganizationSyncProjection.state(from: next.client.records))
                next.observed = try await OrganizationSyncProjection.records(from: binding.read(), documentID: { UUID(uuidString: $0)?.uuidString.lowercased() ?? $0 })
            }
            next.applying = nil; next.lastSynced = Date()
            try commit(next); status = next.client.conflicts.isEmpty ? (next.client.pending.isEmpty ? "同期済み" : "送信待ち") : "競合の確認待ち"; message = nil
        } catch { status = "本棚への反映待ち"; message = "受信結果は保存済みです。同期を再試行してください。" }
    }
    public func resolve(key: String, keepingLocal: Bool) {
        guard !busy, var next = checkpoint else { return }
        next.client.resolve(key: key, keepingLocal: keepingLocal)
        do { try commit(next); status = next.client.pending.isEmpty ? "確認済み" : "送信待ち"; message = nil }
        catch { message = "解決結果を保存できません。" }
    }
    public func clear() {
        guard !busy, !restorationPending else { return }
        do {
            if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) }
            if FileManager.default.fileExists(atPath: directory.path), try FileManager.default.contentsOfDirectory(atPath: directory.path).isEmpty {
                try FileManager.default.removeItem(at: directory)
            }
            checkpoint = nil; restoreFailed = false; abandonPermit(); status = "未接続"; message = nil
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

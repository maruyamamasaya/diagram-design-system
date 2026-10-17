import XCTest
import LibraryOrganization
@testable import LibraryOrganizationUI

final class SyncRecoveryTests: XCTestCase {
    func testCountsIgnoreAbsentTombstonesAndCountSettingRemovals() {
        let result = SyncChangeCounts.compare(["a": .tag("元タグ"), "b": .deleted], ["a": .deleted, "b": .deleted, "c": .tag("追加タグ")])
        XCTAssertEqual(result.added, 1); XCTAssertEqual(result.removed, 1); XCTAssertEqual(result.changed, 0)
    }
    @MainActor func testImportCountsChangeWithConflictChoice() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let local = OrganizationFolder(name: "端末")
        var remote = local; remote.name = "サーバー"
        let extra = OrganizationFolder(name: "追加")
        let incoming: [String: SyncValue<OrganizationDocument>] = [OrganizationSyncKey.folder(local.id): .folder(local)]
        let existing: [String: SyncValue<OrganizationDocument>] = [OrganizationSyncKey.folder(remote.id): .folder(remote), OrganizationSyncKey.folder(extra.id): .folder(extra)]
        let plan = OrganizationImportPlan(existing: existing, incoming: incoming)
        let point = SyncLabSession.Checkpoint(endpoint: "http://127.0.0.1:1", client: OrganizationSyncClient<OrganizationDocument>(libraryID: UUID()), initialPlan: plan, imported: false, observed: incoming)
        try JSONEncoder().encode(point).write(to: root.appendingPathComponent("checkpoint.json"))
        let session = SyncLabSession(directory: root, seed: OrganizationState(), documents: [])
        XCTAssertEqual(session.localImportCounts.added, 1)
        XCTAssertEqual(session.localImportCounts.changed, 1)
        XCTAssertEqual(session.initialConflicts.count, 1)
        session.chooseInitial(key: OrganizationSyncKey.folder(local.id), incoming: true)
        XCTAssertEqual(session.localImportCounts.changed, 0)
        XCTAssertEqual(session.initialConflicts.count, 0)
        XCTAssertEqual(session.uploadImportCounts.added, 2)
    }
    @MainActor func testBackupFailureStopsBeforeConnectingAndPreservesSource() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let source = OrganizationState<OrganizationDocument>()
        var applied = false
        let binding = TestLibrarySyncBinding(read: { source }, apply: { _ in applied = true }, backup: { throw SyncError.transport })
        let session = SyncLabSession(directory: root, seed: source, documents: [], binding: binding)
        await session.prepare(endpoint: "http://127.0.0.1:1", libraryID: UUID().uuidString)
        XCTAssertEqual(session.status, "バックアップできません")
        XCTAssertFalse(session.connected); XCTAssertNil(session.backupDate); XCTAssertFalse(applied)
    }
    @MainActor func testRestoreFailurePausesDurablyAndRetryDisconnectsWithoutSending() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        var source = OrganizationState<OrganizationDocument>()
        let original = OrganizationFolder(name: "復元する管理データ"); source.folders = [original]
        var failRestore = true
        let binding = TestLibrarySyncBinding(read: { source }, apply: { source = $0 }, restore: { data in
            if failRestore { throw SyncError.transport }
            source = try JSONDecoder().decode(OrganizationState<OrganizationDocument>.self, from: data)
        })
        var session = SyncLabSession(directory: root, seed: source, documents: [], binding: binding)
        // Even a failed network connection leaves the pre-enable recovery point available.
        await session.prepare(endpoint: "http://127.0.0.1:1", libraryID: UUID().uuidString)
        XCTAssertNotNil(session.backupDate); XCTAssertTrue(session.canRestoreBackup)
        let library = UUID()
        var client = OrganizationSyncClient<OrganizationDocument>(libraryID: library)
        client.edit(key: OrganizationSyncKey.folder(original.id), value: .folder(original))
        let checkpoint = SyncLabSession.Checkpoint(endpoint: "http://127.0.0.1:1", client: client, initialPlan: nil, imported: true, observed: [:], bound: true)
        try JSONEncoder().encode(checkpoint).write(to: root.appendingPathComponent("checkpoint.json"))
        session = SyncLabSession(directory: root, seed: source, documents: [], binding: binding)
        source.folders.append(OrganizationFolder(name: "後の変更"))
        await session.restoreBackup()
        XCTAssertTrue(session.restorationPending)
        session = SyncLabSession(directory: root, seed: source, documents: [], binding: binding)
        XCTAssertTrue(session.blocksLibraryEdits)
        let server = LocalOrganizationSyncServer<OrganizationDocument>(libraryID: library, memberID: { $0.id })
        await session.synchronize(with: server)
        let untouched = try await server.fetch(libraryID: library)
        XCTAssertEqual(untouched.revision, 0)
        XCTAssertEqual(session.pendingCount, 1)
        failRestore = false
        await session.restoreBackup()
        XCTAssertFalse(session.connected); XCTAssertFalse(session.restorationPending)
        XCTAssertEqual(source.folders, [original])
        XCTAssertNotNil(session.backupDate)
    }
}

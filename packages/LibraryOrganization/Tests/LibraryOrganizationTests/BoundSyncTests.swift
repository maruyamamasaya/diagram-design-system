import XCTest
import LibraryOrganization
@testable import LibraryOrganizationUI

final class BoundSyncTests: XCTestCase {
    @MainActor func testOrdinaryEditsReceiveConflictAndApplyFailureRecovery() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let library = UUID()
        let server = LocalOrganizationSyncServer<OrganizationDocument>(libraryID: library, memberID: { $0.id })
        var source = OrganizationState<OrganizationDocument>()
        var failApply = false
        var failAfterApply = false
        let binding = TestLibrarySyncBinding(read: { source }, apply: { value in
            if failApply { throw SyncError.transport }; source = value
            if failAfterApply { throw SyncError.transport }
        })
        let client = OrganizationSyncClient<OrganizationDocument>(libraryID: library)
        let checkpoint = SyncLabSession.Checkpoint(endpoint: "http://127.0.0.1:1", client: client, initialPlan: nil, imported: true, observed: [:], bound: true)
        try JSONEncoder().encode(checkpoint).write(to: root.appendingPathComponent("checkpoint.json"))
        var session = SyncLabSession(directory: root, seed: source, documents: [], binding: binding)
        let folder = OrganizationFolder(name: "普通の本棚で作成")
        source.folders.append(folder)
        await session.captureLibraryChanges()
        XCTAssertEqual(session.pendingCount, 1)
        session = SyncLabSession(directory: root, seed: source, documents: [], binding: binding)
        await session.synchronize(with: server)
        XCTAssertEqual(session.pendingCount, 0)
        var peer = OrganizationSyncClient<OrganizationDocument>(libraryID: library)
        try await peer.synchronize(with: server)
        let remote = OrganizationFolder(name: "別端末の追加")
        peer.edit(key: OrganizationSyncKey.folder(remote.id), value: .folder(remote))
        try await peer.synchronize(with: server)
        failApply = true
        await session.synchronize(with: server)
        XCTAssertEqual(session.status, "本棚への反映待ち")
        XCTAssertFalse(source.folders.contains { $0.id == remote.id })
        failApply = false
        session = SyncLabSession(directory: root, seed: source, documents: [], binding: binding)
        await session.synchronize(with: server)
        XCTAssertTrue(source.folders.contains { $0.id == remote.id })
        source.removeFolder(folder.id)
        await session.captureLibraryChanges()
        var renamed = folder; renamed.name = "同時編集"
        peer.edit(key: OrganizationSyncKey.folder(folder.id), value: .folder(renamed))
        try await peer.synchronize(with: server)
        failAfterApply = true
        await session.synchronize(with: server)
        XCTAssertEqual(session.status, "本棚への反映待ち")
        failAfterApply = false
        session = SyncLabSession(directory: root, seed: source, documents: [], binding: binding)
        await session.synchronize(with: server)
        XCTAssertEqual(session.conflicts.count, 1)
        XCTAssertEqual(source.folders.first { $0.id == folder.id }?.name, "同時編集")
        session.resolve(key: OrganizationSyncKey.folder(folder.id), keepingLocal: true)
        await session.synchronize(with: server)
        XCTAssertTrue(session.conflicts.isEmpty)
        XCTAssertFalse(source.folders.contains { $0.id == folder.id })
        XCTAssertTrue(source.folders.contains { $0.id == remote.id })
    }
}

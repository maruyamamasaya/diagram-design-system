import XCTest
import LibraryOrganization
@testable import LibraryOrganizationUI

final class SyncLabTests: XCTestCase {
    @MainActor func testCheckpointEditsStayIsolatedAndRestoreAndClear() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let directory = root.appendingPathComponent("lab")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let source = root.appendingPathComponent("live-library.json")
        let original = Data("untouched live data".utf8); try original.write(to: source)
        let client = OrganizationSyncClient<OrganizationDocument>(libraryID: UUID())
        let checkpoint = SyncLabSession.Checkpoint(endpoint: "http://127.0.0.1:8765", client: client, initialPlan: nil, imported: true)
        try JSONEncoder().encode(checkpoint).write(to: directory.appendingPathComponent("checkpoint.json"))
        let session = SyncLabSession(directory: directory, seed: OrganizationState(), documents: [])
        XCTAssertTrue(session.connected)
        session.edit(key: OrganizationSyncKey.tag("missing-document", "テスト"), value: .tag("テスト"))
        XCTAssertEqual(session.pendingCount, 1)
        XCTAssertEqual(session.documents.first?.title, "未取得の資料（missing-document）")
        let restored = SyncLabSession(directory: directory, seed: OrganizationState(), documents: [])
        XCTAssertEqual(restored.pendingCount, 1)
        restored.setEndpoint("https://example.com")
        XCTAssertEqual(restored.endpoint, "http://127.0.0.1:8765")
        XCTAssertNotNil(restored.message)
        restored.clear()
        XCTAssertFalse(restored.connected)
        XCTAssertFalse(FileManager.default.fileExists(atPath: directory.appendingPathComponent("checkpoint.json").path))
        XCTAssertEqual(try Data(contentsOf: source), original)
    }
    @MainActor func testCorruptCheckpointIsNotSilentlyOverwritten() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let file = root.appendingPathComponent("checkpoint.json")
        let original = Data("corrupt".utf8); try original.write(to: file)
        let session = SyncLabSession(directory: root, seed: OrganizationState(), documents: [])
        await session.prepare(endpoint: "http://127.0.0.1:1", libraryID: UUID().uuidString)
        XCTAssertEqual(try Data(contentsOf: file), original)
        XCTAssertFalse(session.connected); XCTAssertNotNil(session.message)
        session.clear(); XCTAssertFalse(FileManager.default.fileExists(atPath: file.path))
    }
    func testPortableMemberCanonicalizesUUIDWithoutChangingOpaqueIDs() {
        let id = UUID()
        let value = OrganizationDocument(id: id.uuidString, title: "資料", type: "illustration", version: 1, formats: ["png"], pageCount: 1, tags: [])
        XCTAssertEqual(value.id, id.uuidString.lowercased())
        let other = OrganizationDocument(id: "local-Custom-ID", title: "ローカル", type: "diagram", version: 1, formats: ["pdf"], pageCount: 1, tags: [])
        XCTAssertEqual(other.id, "local-Custom-ID")
    }
}

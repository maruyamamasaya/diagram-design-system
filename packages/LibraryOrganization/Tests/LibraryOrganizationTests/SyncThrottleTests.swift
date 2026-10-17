import XCTest
import LibraryOrganization
@testable import LibraryOrganizationUI

final class SyncThrottleTests: XCTestCase {
    @MainActor func testCorruptQuotaRecordIsNotResetByDisconnect() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let file = root.appendingPathComponent("sync-throttle.json")
        let invalid = Data("corrupt quota record".utf8); try invalid.write(to: file)
        let session = SyncLabSession(directory: root, seed: OrganizationState(), documents: [], rateLimited: true)
        XCTAssertNotNil(session.message)
        session.clear()
        await session.prepare(endpoint: "http://127.0.0.1:1", libraryID: UUID().uuidString)
        XCTAssertFalse(session.connected)
        XCTAssertEqual(try Data(contentsOf: file), invalid)
    }
}

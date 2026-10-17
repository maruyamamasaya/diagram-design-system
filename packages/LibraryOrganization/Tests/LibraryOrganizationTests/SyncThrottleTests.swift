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
    @MainActor func testDisconnectAndPrepareCannotResetPersistedCommunicationWait() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        let now = Date(), id = UUID(), endpoint = "http://127.0.0.1:1"
        var retry = SyncRetryState(); retry.recordFailure(now: now, jitter: 0)
        let state = SyncThrottleState(endpoint: endpoint, libraryID: id, retry: retry)
        let file = root.appendingPathComponent("sync-throttle.json")
        try JSONEncoder().encode(state).write(to: file)
        let session = SyncLabSession(directory: root, seed: OrganizationState(), documents: [], rateLimited: true, retryClock: { now })
        session.clear()
        await session.prepare(endpoint: endpoint, libraryID: id.uuidString, allowExtra: true)
        XCTAssertFalse(session.connected)
        XCTAssertEqual(session.retryAt, retry.nextAttemptAt)
        let persisted = try JSONDecoder().decode(SyncThrottleState.self, from: Data(contentsOf: file))
        XCTAssertEqual(persisted.retry?.failures, 1)
        XCTAssertEqual(session.status, "通信待ち")
    }

}

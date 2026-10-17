import XCTest
@testable import LibraryOrganization

final class SyncEfficiencyTests: XCTestCase {
    func testBackoffSurvivesEncodingAndResetsAfterSuccess() throws {
        let now = Date(timeIntervalSince1970: 1000)
        var state = SyncRetryState()
        for delay in [30.0, 60, 120, 240, 480, 900, 900] {
            state.recordFailure(now: now, jitter: 0)
            XCTAssertEqual(state.nextAttemptAt, now.addingTimeInterval(delay))
            state = try JSONDecoder().decode(SyncRetryState.self, from: JSONEncoder().encode(state))
        }
        state.recordFailure(now: now, serverRetryAfter: now.addingTimeInterval(1800), jitter: 5)
        XCTAssertEqual(state.nextAttemptAt, now.addingTimeInterval(1800))
        state.succeeded(); XCTAssertNil(state.nextAttemptAt); XCTAssertEqual(state.failures, 0)
        state.recordFailure(now: now, jitter: 5)
        XCTAssertEqual(state.nextAttemptAt, now.addingTimeInterval(35))
    }
    func testRetryAfterSecondsAndHTTPDate() {
        let now = Date(timeIntervalSince1970: 0)
        XCTAssertEqual(SyncRetryFailure.retryDate("90", now: now), now.addingTimeInterval(90))
        XCTAssertEqual(SyncRetryFailure.retryDate("Thu, 01 Jan 1970 00:02:00 GMT", now: now), now.addingTimeInterval(120))
        XCTAssertNil(SyncRetryFailure.retryDate("invalid", now: now))
        XCTAssertNil(SyncRetryFailure.retryDate("-1", now: now))
    }
    func testUnchangedNeverAcknowledgesEditsOrAcceptsWrongVersionOrLibrary() throws {
        let id = UUID()
        var snapshot = SyncSnapshot<String>(libraryID: id); snapshot.revision = 7
        snapshot.records["tag/test"] = SyncRecord(value: .tag("kept"), revision: 7)
        let response = LimitedSyncResponse<String>(unchangedRevision: 7)
        let reply = try response.resolved(libraryID: id, operations: [], knownSnapshot: snapshot)
        XCTAssertEqual(reply.snapshot.records, snapshot.records)
        XCTAssertThrowsError(try response.resolved(libraryID: UUID(), operations: [], knownSnapshot: snapshot))
        XCTAssertThrowsError(try response.resolved(libraryID: id, operations: [SyncOperation(key: "x", expectedRevision: 0, value: .deleted)], knownSnapshot: snapshot))
        XCTAssertThrowsError(try LimitedSyncResponse<String>(unchangedRevision: 6).resolved(libraryID: id, operations: [], knownSnapshot: snapshot))
        XCTAssertThrowsError(try LimitedSyncResponse<String>(reply: reply, unchangedRevision: 7).resolved(libraryID: id, operations: [], knownSnapshot: snapshot))
        // Older full replies remain compatible.
        XCTAssertEqual(try LimitedSyncResponse(reply: reply).resolved(libraryID: id, operations: [], knownSnapshot: snapshot).snapshot.revision, 7)
    }
}

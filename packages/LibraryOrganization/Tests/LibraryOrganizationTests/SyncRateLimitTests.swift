import XCTest
@testable import LibraryOrganization

final class SyncRateLimitTests: XCTestCase {
    func testSharedRollingWindowReservationReplayAndSingleUseConsent() throws {
        var ledger = SyncRateLedger(); let start = Date(timeIntervalSince1970: 10000)
        var ids: [UUID] = []
        for offset in 0..<5 {
            let id = UUID(); ids.append(id)
            let admission = ledger.reserve(id: id, now: start.addingTimeInterval(Double(offset)))
            XCTAssertNotNil(admission.permit)
        }
        XCTAssertEqual(ledger.reserve(id: ids[0], now: start.addingTimeInterval(10)).quota.used, 5)
        let sixth = UUID(); let denied = ledger.reserve(id: sixth, now: start.addingTimeInterval(10))
        XCTAssertNil(denied.permit); XCTAssertEqual(denied.quota.nextAllowedAt, start.addingTimeInterval(3600))
        let challenge = try XCTUnwrap(denied.quota.challenge)
        XCTAssertNil(ledger.reserve(id: sixth, consent: UUID(), now: start.addingTimeInterval(11)).permit)
        let approved = ledger.reserve(id: sixth, consent: challenge, now: start.addingTimeInterval(12))
        XCTAssertNotNil(approved.permit); XCTAssertEqual(approved.quota.used, 6)
        XCTAssertEqual(approved.quota.nextAllowedAt, start.addingTimeInterval(3601))
        XCTAssertEqual(ledger.reserve(id: sixth, consent: challenge, now: start.addingTimeInterval(13)).quota.used, 6)
        XCTAssertNil(ledger.reserve(id: UUID(), consent: challenge, now: start.addingTimeInterval(14)).permit)
        let restored = try JSONDecoder().decode(SyncRateLedger.self, from: JSONEncoder().encode(ledger))
        XCTAssertEqual(restored.quota(now: start.addingTimeInterval(14)).used, 6)
        ledger = restored
        XCTAssertNotNil(ledger.reserve(id: UUID(), now: start.addingTimeInterval(3601)).permit)
    }
    func testRequestRetryBatchAndLeaseBudgetsDoNotResetHourlyCount() throws {
        var ledger = SyncRateLedger(); let start = Date(timeIntervalSince1970: 20000), id = UUID()
        _ = ledger.reserve(id: id, now: start)
        for _ in 0..<12 {
            let request = UUID()
            for _ in 0..<3 { try ledger.use(permit: id, request: request, now: start.addingTimeInterval(10)) }
            XCTAssertThrowsError(try ledger.use(permit: id, request: request, now: start.addingTimeInterval(11)))
        }
        XCTAssertThrowsError(try ledger.use(permit: id, request: UUID(), now: start.addingTimeInterval(20)))
        XCTAssertEqual(ledger.quota(now: start.addingTimeInterval(601)).used, 1)
        XCTAssertThrowsError(try ledger.use(permit: id, request: UUID(), now: start.addingTimeInterval(601)))
        let second = UUID(); _ = ledger.reserve(id: second, now: start.addingTimeInterval(100))
        ledger.finish(permit: second)
        XCTAssertThrowsError(try ledger.use(permit: second, request: UUID(), now: start.addingTimeInterval(101)))
        XCTAssertNil(ledger.reserve(id: second, now: start.addingTimeInterval(101)).permit)
        XCTAssertEqual(ledger.quota(now: start.addingTimeInterval(101)).used, 2)
    }
    func testExpiredOrDifferentAttemptConsentCannotGrantAnExtraSession() throws {
        var ledger = SyncRateLedger(); let start = Date(timeIntervalSince1970: 30000)
        for _ in 0..<5 { _ = ledger.reserve(id: UUID(), now: start) }
        let id = UUID(), denied = ledger.reserve(id: UUID(), now: start)
        XCTAssertNil(ledger.reserve(id: id, consent: denied.quota.challenge, now: start).permit)
        let challenge = ledger.reserve(id: id, now: start).quota.challenge
        XCTAssertNil(ledger.reserve(id: id, consent: challenge, now: start.addingTimeInterval(301)).permit)
        XCTAssertEqual(ledger.quota(now: start.addingTimeInterval(3600)).used, 0)
    }
}

import Foundation

public struct SyncRetryFailure: Error, Sendable {
    public var retryAfter: Date?
    public init(retryAfter: Date?) { self.retryAfter = retryAfter }
    public static func retryDate(_ header: String?, now: Date) -> Date? {
        guard let header else { return nil }
        if let seconds = Double(header), seconds.isFinite, seconds >= 0 { return now.addingTimeInterval(seconds) }
        let parser = DateFormatter(); parser.locale = Locale(identifier: "en_US_POSIX")
        parser.timeZone = TimeZone(secondsFromGMT: 0); parser.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        return parser.date(from: header)
    }
}
/// Persisted outside management backups. UI refresh never triggers network requests.
public struct SyncRetryState: Codable, Sendable {
    public private(set) var failures = 0
    public private(set) var nextAttemptAt: Date?
    public init() { }
    public mutating func recordFailure(now: Date, serverRetryAfter: Date? = nil, jitter: TimeInterval) {
        failures = min(failures + 1, 10)
        let delay = min(900, 30 * pow(2, Double(failures - 1))) + max(0, min(jitter, 5))
        nextAttemptAt = max(now.addingTimeInterval(delay), serverRetryAfter ?? now)
    }
    public mutating func succeeded() { failures = 0; nextAttemptAt = nil }
}

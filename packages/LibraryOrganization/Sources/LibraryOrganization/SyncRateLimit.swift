import Foundation

public struct SyncQuota: Codable, Equatable, Sendable {
    public var used: Int
    public var limit: Int = 5
    public var nextAllowedAt: Date?
    public var challenge: UUID?
    public var remaining: Int { max(0, limit - used) }
}
public struct SyncPermit: Codable, Equatable, Sendable {
    public var id: UUID
    public var expiresAt: Date
}
public struct SyncAdmission: Codable, Sendable {
    public var permit: SyncPermit?
    public var quota: SyncQuota
}
public struct SyncQuotaFailure: Error, Codable, Sendable {
    public var reason: String
    public var quota: SyncQuota
    public init(reason: String, quota: SyncQuota) { self.reason = reason; self.quota = quota }
}

/// One ledger per authenticated owner, never per device or untrusted libraryID.
/// The mock's single-owner ledger is saved under its process lock; AWS must use CAS.
public struct SyncRateLedger: Codable, Sendable {
    struct Lease: Codable, Sendable {
        var permit: SyncPermit
        var startedAt: Date
        var closed = false
        var requests: [UUID: Int] = [:]
    }
    struct Challenge: Codable, Sendable {
        var token: UUID
        var expiresAt: Date
    }
    private var leases: [UUID: Lease] = [:]
    private var challenges: [UUID: Challenge] = [:]
    public init() { }
    private mutating func prune(_ now: Date) {
        leases = leases.filter { now.timeIntervalSince($0.value.startedAt) < 3600 }
        challenges = challenges.filter { $0.value.expiresAt > now }
    }
    public func quota(now: Date) -> SyncQuota {
        let starts = leases.values.filter { now.timeIntervalSince($0.startedAt) < 3600 }.map(\.startedAt).sorted()
        return SyncQuota(used: starts.count, nextAllowedAt: starts.count >= 5 ? starts[starts.count - 5].addingTimeInterval(3600) : nil)
    }
    public mutating func reserve(id: UUID, consent: UUID? = nil, now: Date) -> SyncAdmission {
        prune(now)
        if let lease = leases[id] {
            return SyncAdmission(permit: !lease.closed && lease.permit.expiresAt > now ? lease.permit : nil, quota: quota(now: now))
        }
        if quota(now: now).remaining == 0 {
            let accepted = challenges[id].map { $0.token == consent && $0.expiresAt > now } ?? false
            if !accepted {
                if challenges[id] == nil {
                    if challenges.count >= 32, let key = challenges.min(by: { $0.value.expiresAt < $1.value.expiresAt })?.key { challenges.removeValue(forKey: key) }
                    challenges[id] = Challenge(token: UUID(), expiresAt: now.addingTimeInterval(300))
                }
                var value = quota(now: now); value.challenge = challenges[id]?.token
                return SyncAdmission(permit: nil, quota: value)
            }
        }
        challenges.removeValue(forKey: id)
        let permit = SyncPermit(id: id, expiresAt: now.addingTimeInterval(600))
        leases[id] = Lease(permit: permit, startedAt: now)
        return SyncAdmission(permit: permit, quota: quota(now: now))
    }
    public mutating func use(permit: UUID, request: UUID, now: Date) throws {
        prune(now)
        guard var lease = leases[permit], !lease.closed, lease.permit.expiresAt > now else {
            throw SyncQuotaFailure(reason: "permit_expired", quota: quota(now: now))
        }
        let attempts = lease.requests[request] ?? 0
        guard attempts < 3, attempts > 0 || lease.requests.count < 12 else {
            throw SyncQuotaFailure(reason: "request_budget", quota: quota(now: now))
        }
        lease.requests[request] = attempts + 1; leases[permit] = lease
    }
    public mutating func finish(permit: UUID) { leases[permit]?.closed = true }
}

public struct LimitedSyncRequest<Member: Codable & Equatable & Sendable>: Codable, Sendable {
    public var action: String
    public var libraryID: UUID
    public var attemptID: UUID
    public var requestID: UUID
    public var consent: UUID?
    public var operations: [SyncOperation<Member>]?
    public init(action: String, libraryID: UUID, attemptID: UUID, consent: UUID? = nil, operations: [SyncOperation<Member>]? = nil) {
        self.action = action; self.libraryID = libraryID; self.attemptID = attemptID; self.requestID = UUID(); self.consent = consent; self.operations = operations
    }
}
public struct LimitedSyncResponse<Member: Codable & Equatable & Sendable>: Codable, Sendable {
    public var admission: SyncAdmission?
    public var reply: SyncReply<Member>?
    public var failure: SyncQuotaFailure?
    public init(admission: SyncAdmission? = nil, reply: SyncReply<Member>? = nil, failure: SyncQuotaFailure? = nil) {
        self.admission = admission; self.reply = reply; self.failure = failure
    }
}

import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Local-only reservation protocol. One HTTP send per call; the session persists cooldowns.
public struct LimitedLoopbackTransport<Member: Codable & Equatable & Sendable>: OrganizationSyncTransport {
    public let baseURL: URL
    public let attemptID: UUID
    public init(baseURL: URL, attemptID: UUID) throws {
        _ = try LoopbackOrganizationTransport<Member>(baseURL: baseURL)
        self.baseURL = baseURL; self.attemptID = attemptID
    }
    public func reserve(libraryID: UUID, consent: UUID? = nil) async throws -> SyncAdmission {
        let result = try await send(LimitedSyncRequest(action: "begin", libraryID: libraryID, attemptID: attemptID, consent: consent))
        guard let admission = result.admission else { throw SyncError.transport }; return admission
    }
    public func finish(libraryID: UUID) async throws {
        _ = try await send(LimitedSyncRequest(action: "finish", libraryID: libraryID, attemptID: attemptID))
    }
    public func fetch(libraryID: UUID) async throws -> SyncSnapshot<Member> { try await submit(libraryID: libraryID, operations: []).snapshot }
    public func submit(libraryID: UUID, operations: [SyncOperation<Member>]) async throws -> SyncReply<Member> {
        let result = try await send(LimitedSyncRequest(action: "sync", libraryID: libraryID, attemptID: attemptID, operations: operations))
        guard let reply = result.reply else { throw SyncError.transport }; return reply
    }
    public func submit(libraryID: UUID, operations: [SyncOperation<Member>], knownSnapshot: SyncSnapshot<Member>) async throws -> SyncReply<Member> {
        guard knownSnapshot.libraryID == libraryID else { throw SyncError.wrongLibrary }
        let result = try await send(LimitedSyncRequest(action: "sync", libraryID: libraryID, attemptID: attemptID, operations: operations, knownRevision: operations.isEmpty ? knownSnapshot.revision : nil))
        return try result.resolved(libraryID: libraryID, operations: operations, knownSnapshot: knownSnapshot)
    }
    private func send(_ value: LimitedSyncRequest<Member>) async throws -> LimitedSyncResponse<Member> {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 5
        let session = URLSession(configuration: configuration, delegate: NoLimitedRedirect(), delegateQueue: nil)
        defer { session.invalidateAndCancel() }
        var request = URLRequest(url: baseURL.appendingPathComponent("sync/limited"))
        request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(value)
        let data: Data, response: URLResponse
        do { (data, response) = try await session.data(for: request) }
        catch { throw SyncRetryFailure(retryAfter: nil) }
        guard let http = response as? HTTPURLResponse else { throw SyncError.transport }
        if http.statusCode >= 500 { throw SyncRetryFailure(retryAfter: SyncRetryFailure.retryDate(http.value(forHTTPHeaderField: "Retry-After"), now: Date())) }
        guard http.statusCode == 200 || http.statusCode == 429 else { throw SyncError.transport }
        if http.statusCode == 429 {
            if let result = try? JSONDecoder().decode(LimitedSyncResponse<Member>.self, from: data), result.failure != nil || result.admission != nil {
                if let failure = result.failure { throw failure }; return result
            }
            throw SyncRetryFailure(retryAfter: SyncRetryFailure.retryDate(http.value(forHTTPHeaderField: "Retry-After"), now: Date()))
        }
        let result = try JSONDecoder().decode(LimitedSyncResponse<Member>.self, from: data)
        if let failure = result.failure { throw failure }
        return result
    }
}
private final class NoLimitedRedirect: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}

extension LimitedSyncResponse {
    func resolved(libraryID: UUID, operations: [SyncOperation<Member>], knownSnapshot: SyncSnapshot<Member>) throws -> SyncReply<Member> {
        if let revision = unchangedRevision {
            guard operations.isEmpty, reply == nil, admission == nil, failure == nil,
                  knownSnapshot.libraryID == libraryID, revision == knownSnapshot.revision else { throw SyncError.corruptState }
            return SyncReply(receipts: [], snapshot: knownSnapshot)
        }
        guard let reply else { throw SyncError.transport }; return reply
    }
}

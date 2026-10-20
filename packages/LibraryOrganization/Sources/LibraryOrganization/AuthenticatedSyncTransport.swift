import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

public struct OrganizationAccess: Sendable {
    public let token: String
    public let issuer: String
    public let subject: String
    public init(token: String, issuer: String, subject: String) { self.token = token; self.issuer = issuer; self.subject = subject }
}
public enum OrganizationConnectionError: Error { case authentication, accountChanged, invalidEndpoint, invalidBootstrap, oversizedOperation(UUID), invalidResponse }
public struct OrganizationBootstrap: Codable, Sendable {
    public let libraryID: UUID
    public let protocolVersion: Int
    public let limit: Int
    public let windowSeconds: Int
    public let maxOperations: Int
    public let maxBodyBytes: Int?
    public func validate() throws {
        guard protocolVersion == 1, limit == 5, windowSeconds == 3600, (1...50).contains(maxOperations), (512...262144).contains(maxBodyBytes ?? 262144) else { throw OrganizationConnectionError.invalidBootstrap }
    }
}
/// Keep one connection below the existing API stage's one-request/second budget.
/// Reserve the next slot before suspension so concurrent callers cannot share it.
private actor OrganizationRequestPacer {
    private let clock = ContinuousClock()
    private var next: [String: ContinuousClock.Instant] = [:]
    func wait(endpoint: String) async throws {
        let now = clock.now
        let slot = next[endpoint].map { max($0, now) } ?? now
        next[endpoint] = slot.advanced(by: .milliseconds(1100))
        try await clock.sleep(until: slot)
        try Task.checkCancellation()
    }
}
/// Explicitly configured endpoint and account. Never accepts an endpoint from a response.
public struct AuthenticatedSyncConnection: Sendable {
    public let baseURL: URL
    public let issuer: String
    public let subject: String
    public let access: @Sendable (_ forceRefresh: Bool) async throws -> OrganizationAccess
    public let session: URLSession
    private static let pacer = OrganizationRequestPacer()
    public var identityKey: String { [baseURL.absoluteString, issuer, subject].joined(separator: "\n") }
    public init(baseURL: URL, issuer: String, subject: String, session: URLSession? = nil, access: @escaping @Sendable (Bool) async throws -> OrganizationAccess) throws {
        guard baseURL.scheme == "https", baseURL.host != nil, baseURL.user == nil, baseURL.password == nil, baseURL.query == nil, baseURL.fragment == nil,
              baseURL.path.isEmpty || baseURL.path == "/", URL(string: issuer)?.scheme == "https", !subject.isEmpty else { throw OrganizationConnectionError.invalidEndpoint }
        self.baseURL = baseURL; self.issuer = issuer; self.subject = subject; self.access = access
        let config = URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies = false; config.urlCache = nil; config.timeoutIntervalForRequest = 15
        self.session = session ?? URLSession(configuration: config, delegate: OrganizationNoRedirect(), delegateQueue: nil)
    }
    public func bootstrap() async throws -> OrganizationBootstrap {
        let (data, http) = try await request(path: "v1/organization/bootstrap", body: nil)
        if http.statusCode == 429 { throw SyncRetryFailure(retryAfter: SyncRetryFailure.retryDate(http.value(forHTTPHeaderField: "Retry-After"), now: Date())) }
        let result = try JSONDecoder().decode(OrganizationBootstrap.self, from: data); try result.validate(); return result
    }
    public func request(path: String, body: Data?, query: [URLQueryItem] = []) async throws -> (Data, HTTPURLResponse) {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        components.queryItems = query.isEmpty ? nil : query
        guard let url = components.url else { throw OrganizationConnectionError.invalidEndpoint }
        let retryable = body == nil || path.hasSuffix("/access-url")
        var refreshed = false
        var forceRefresh = false
        var retries = 0
        while true {
            try Task.checkCancellation()
            try await Self.pacer.wait(endpoint: baseURL.absoluteString)
            let credentials: OrganizationAccess
            do { credentials = try await access(forceRefresh); forceRefresh = false } catch { throw OrganizationConnectionError.authentication }
            guard credentials.issuer == issuer, credentials.subject == subject else { throw OrganizationConnectionError.accountChanged }
            guard !credentials.token.isEmpty, credentials.token.utf8.count <= 16384, credentials.token.unicodeScalars.allSatisfy({ $0.value >= 33 && $0.value <= 126 }) else { throw OrganizationConnectionError.authentication }
            var request = URLRequest(url: url); request.httpMethod = body == nil ? "GET" : "POST"; request.httpBody = body
            request.setValue("Bearer " + credentials.token, forHTTPHeaderField: "Authorization")
            if body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
            let data: Data, response: URLResponse
            do { (data, response) = try await session.data(for: request, delegate: OrganizationNoRedirect()) }
            catch {
                try Task.checkCancellation()
                guard retryable, retries < 3 else { throw SyncRetryFailure(retryAfter: nil) }
                retries += 1; try await Task.sleep(for: .seconds(Double(retries) + Double.random(in: 0...0.5))); continue
            }
            guard let http = response as? HTTPURLResponse, http.url == url, data.count <= 2 * 1024 * 1024 else { throw OrganizationConnectionError.invalidResponse }
            // A refresh is silent, once only. It must still identify the exact same account.
            if http.statusCode == 401 && !refreshed { refreshed = true; forceRefresh = true; continue }
            if http.statusCode == 401 || http.statusCode == 403 { throw OrganizationConnectionError.authentication }
            if retryable && (http.statusCode == 429 || http.statusCode >= 500), retries < 3 {
                let delay = max(Double(retries + 1), SyncRetryFailure.retryDate(http.value(forHTTPHeaderField: "Retry-After"), now: Date())?.timeIntervalSinceNow ?? 0)
                if delay <= 30 { retries += 1; try await Task.sleep(for: .seconds(delay + Double.random(in: 0...0.5))); continue }
            }
            if http.statusCode >= 500 { throw SyncRetryFailure(retryAfter: SyncRetryFailure.retryDate(http.value(forHTTPHeaderField: "Retry-After"), now: Date())) }
            guard http.statusCode == 200 || http.statusCode == 429, http.mimeType == "application/json" else { throw OrganizationConnectionError.invalidResponse }
            return (data, http)
        }
    }
}
private final class OrganizationNoRedirect: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
public protocol ReservedOrganizationTransport: OrganizationSyncTransport {
    func reserve(libraryID: UUID, consent: UUID?) async throws -> SyncAdmission
    func finish(libraryID: UUID) async throws
}
extension LimitedLoopbackTransport: ReservedOrganizationTransport { }

public struct AuthenticatedOrganizationTransport<Member: Codable & Equatable & Sendable>: ReservedOrganizationTransport {
    public let connection: AuthenticatedSyncConnection
    public let bootstrap: OrganizationBootstrap
    public let attemptID: UUID
    public var maximumBatchesPerSync: Int { 10 }
    public init(connection: AuthenticatedSyncConnection, bootstrap: OrganizationBootstrap, attemptID: UUID) throws {
        try bootstrap.validate(); self.connection = connection; self.bootstrap = bootstrap; self.attemptID = attemptID
    }
    public func batch(libraryID: UUID, operations: [SyncOperation<Member>]) throws -> [SyncOperation<Member>] {
        var result: [SyncOperation<Member>] = []
        for op in operations.prefix(bootstrap.maxOperations) {
            let candidate = result + [op]
            let data = try JSONEncoder().encode(LimitedSyncRequest(action: "sync", libraryID: libraryID, attemptID: attemptID, operations: candidate))
            if data.count > (bootstrap.maxBodyBytes ?? 262144) {
                if result.isEmpty { throw OrganizationConnectionError.oversizedOperation(op.id) }; break
            }
            result = candidate
        }
        return result
    }
    public func reserve(libraryID: UUID, consent: UUID? = nil) async throws -> SyncAdmission {
        let response = try await send(LimitedSyncRequest(action: "begin", libraryID: libraryID, attemptID: attemptID, consent: consent))
        guard let admission = response.admission else { throw OrganizationConnectionError.invalidResponse }; return admission
    }
    public func finish(libraryID: UUID) async throws { _ = try await send(LimitedSyncRequest(action: "finish", libraryID: libraryID, attemptID: attemptID)) }
    public func fetch(libraryID: UUID) async throws -> SyncSnapshot<Member> { try await submit(libraryID: libraryID, operations: []).snapshot }
    public func submit(libraryID: UUID, operations: [SyncOperation<Member>]) async throws -> SyncReply<Member> {
        let response = try await send(LimitedSyncRequest(action: "sync", libraryID: libraryID, attemptID: attemptID, operations: operations))
        guard let reply = response.reply else { throw OrganizationConnectionError.invalidResponse }; return reply
    }
    public func submit(libraryID: UUID, operations: [SyncOperation<Member>], knownSnapshot: SyncSnapshot<Member>) async throws -> SyncReply<Member> {
        let response = try await send(LimitedSyncRequest(action: "sync", libraryID: libraryID, attemptID: attemptID, operations: operations, knownRevision: operations.isEmpty ? knownSnapshot.revision : nil))
        return try response.resolved(libraryID: libraryID, operations: operations, knownSnapshot: knownSnapshot)
    }
    private func send(_ value: LimitedSyncRequest<Member>) async throws -> LimitedSyncResponse<Member> {
        guard value.libraryID == bootstrap.libraryID else { throw SyncError.wrongLibrary }
        let data = try JSONEncoder().encode(value)
        guard data.count <= (bootstrap.maxBodyBytes ?? 262144), (value.operations?.count ?? 0) <= bootstrap.maxOperations else { throw OrganizationConnectionError.invalidResponse }
        let (bytes, http) = try await connection.request(path: "v1/organization/sync", body: data)
        guard let result = try? JSONDecoder().decode(LimitedSyncResponse<Member>.self, from: bytes) else {
            if http.statusCode == 429 { throw SyncRetryFailure(retryAfter: SyncRetryFailure.retryDate(http.value(forHTTPHeaderField: "Retry-After"), now: Date())) }
            throw OrganizationConnectionError.invalidResponse
        }
        if let failure = result.failure { throw failure }
        return result
    }
}

public struct AnyReservedOrganizationTransport<Member: Codable & Equatable & Sendable>: ReservedOrganizationTransport {
    private let reserveBody: @Sendable (UUID, UUID?) async throws -> SyncAdmission
    private let finishBody: @Sendable (UUID) async throws -> Void
    private let submitBody: @Sendable (UUID, [SyncOperation<Member>], SyncSnapshot<Member>?) async throws -> SyncReply<Member>
    private let batchBody: @Sendable (UUID, [SyncOperation<Member>]) throws -> [SyncOperation<Member>]
    public let maximumBatchesPerSync: Int
    public init<T: ReservedOrganizationTransport>(_ transport: T) where T.Member == Member {
        reserveBody = { try await transport.reserve(libraryID: $0, consent: $1) }; finishBody = { try await transport.finish(libraryID: $0) }
        submitBody = { id, ops, snapshot in
            if let snapshot { return try await transport.submit(libraryID: id, operations: ops, knownSnapshot: snapshot) }
            return try await transport.submit(libraryID: id, operations: ops)
        }
        batchBody = { try transport.batch(libraryID: $0, operations: $1) }; maximumBatchesPerSync = transport.maximumBatchesPerSync
    }
    public func batch(libraryID: UUID, operations: [SyncOperation<Member>]) throws -> [SyncOperation<Member>] { try batchBody(libraryID, operations) }
    public func reserve(libraryID: UUID, consent: UUID? = nil) async throws -> SyncAdmission { try await reserveBody(libraryID, consent) }
    public func finish(libraryID: UUID) async throws { try await finishBody(libraryID) }
    public func fetch(libraryID: UUID) async throws -> SyncSnapshot<Member> { try await submitBody(libraryID, [], nil).snapshot }
    public func submit(libraryID: UUID, operations: [SyncOperation<Member>]) async throws -> SyncReply<Member> { try await submitBody(libraryID, operations, nil) }
    public func submit(libraryID: UUID, operations: [SyncOperation<Member>], knownSnapshot: SyncSnapshot<Member>) async throws -> SyncReply<Member> { try await submitBody(libraryID, operations, knownSnapshot) }
}

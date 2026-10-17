import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
public struct LocalSyncRequest<Member: Codable & Equatable & Sendable>: Codable, Sendable {
    public var libraryID: UUID
    public var operations: [SyncOperation<Member>]?
    public init(libraryID: UUID, operations: [SyncOperation<Member>]? = nil) { self.libraryID = libraryID; self.operations = operations }
}
/// Test-only HTTP transport: refuses remote hosts, TLS/production URLs and redirects.
public struct LoopbackOrganizationTransport<Member: Codable & Equatable & Sendable>: OrganizationSyncTransport {
    public let baseURL: URL
    public init(baseURL: URL) throws {
        guard baseURL.scheme == "http", baseURL.host == "127.0.0.1", baseURL.user == nil, baseURL.password == nil,
              baseURL.query == nil, baseURL.fragment == nil, baseURL.path.isEmpty || baseURL.path == "/" else { throw SyncError.nonLoopback }
        self.baseURL = baseURL
    }
    public func fetch(libraryID: UUID) async throws -> SyncSnapshot<Member> {
        let reply: SyncReply<Member> = try await request(LocalSyncRequest(libraryID: libraryID)); return reply.snapshot
    }
    public func submit(libraryID: UUID, operations: [SyncOperation<Member>]) async throws -> SyncReply<Member> {
        try await request(LocalSyncRequest(libraryID: libraryID, operations: operations))
    }
    private func request(_ payload: LocalSyncRequest<Member>) async throws -> SyncReply<Member> {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 5
        let session = URLSession(configuration: configuration, delegate: NoSyncRedirect(), delegateQueue: nil)
        defer { session.invalidateAndCancel() }
        var request = URLRequest(url: baseURL.appendingPathComponent("sync"))
        request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(payload)
        let (data, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse, response.statusCode == 200 else { throw SyncError.transport }
        return try JSONDecoder().decode(SyncReply<Member>.self, from: data)
    }
}
private final class NoSyncRedirect: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}

import XCTest
@testable import LibraryOrganization
import LibraryOrganizationUI

private final class HTTPSStub: URLProtocol, @unchecked Sendable {
    static var handler: (URLRequest) throws -> (Int, Data, [String:String]) = { _ in throw SyncError.transport }
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do { let (status,data,headers) = try Self.handler(request)
            client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: ["Content-Type":"application/json"].merging(headers) { _,v in v })!, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() { }
}
private actor CredentialCounter {
    var calls = 0
    func access(_ refresh: Bool, changed: Bool = false) -> OrganizationAccess { calls += 1; return OrganizationAccess(token: refresh ? "fresh" : "stale", issuer: "https://issuer.example", subject: refresh && changed ? "other" : "owner") }
}
private actor FailSecondBatch: OrganizationSyncTransport {
    typealias Member = String
    let server: LocalOrganizationSyncServer<String>; var calls = 0; let drop: Bool
    init(_ id: UUID, drop: Bool = true) { self.drop = drop; server = LocalOrganizationSyncServer(libraryID: id, memberID: { $0 }) }
    nonisolated var maximumBatchesPerSync: Int { 2 }
    nonisolated func batch(libraryID: UUID, operations: [SyncOperation<String>]) -> [SyncOperation<String>] { Array(operations.prefix(2)) }
    func fetch(libraryID: UUID) async throws -> SyncSnapshot<String> { try await server.fetch(libraryID: libraryID) }
    func submit(libraryID: UUID, operations: [SyncOperation<String>]) async throws -> SyncReply<String> {
        calls += 1; let reply = try await server.submit(libraryID: libraryID, operations: operations)
        if drop && calls == 2 { throw SyncRetryFailure(retryAfter: nil) }; return reply
    }
}
final class HTTPSConnectionTests: XCTestCase {
    func testConcurrentRequestsRespectExistingAPIStartRate() async throws {
        let lock = NSLock()
        var starts: [Date] = []
        let data = try JSONEncoder().encode(bootstrap())
        HTTPSStub.handler = { _ in
            lock.lock(); starts.append(Date()); lock.unlock()
            return (200, data, [:])
        }
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [HTTPSStub.self]
        let connection = try AuthenticatedSyncConnection(baseURL: URL(string:"https://api.example")!, issuer:"https://issuer.example", subject:"owner", session:URLSession(configuration:config)) { _ in
            OrganizationAccess(token:"token",issuer:"https://issuer.example",subject:"owner")
        }
        async let a = connection.bootstrap()
        async let b = connection.bootstrap()
        _ = try await (a, b)
        XCTAssertEqual(starts.count, 2)
        XCTAssertGreaterThanOrEqual(starts[1].timeIntervalSince(starts[0]), 1.0)
    }
    func testReadRetriesThrottleAndServerErrorButDoesNotReplayMutation() async throws {
        var calls = 0
        let body = try JSONEncoder().encode(bootstrap())
        HTTPSStub.handler = { _ in calls += 1; return (calls == 1 ? 429 : calls == 2 ? 503 : 200, body, ["Retry-After":"0"]) }
        _ = try await connection().bootstrap(); XCTAssertEqual(calls,3)
        calls = 0
        HTTPSStub.handler = { _ in calls += 1; return (503,Data(),[:]) }
        do { _ = try await connection().request(path:"v1/library-lifecycle/id/trash",body:Data("{}".utf8));XCTFail("Mutation must fail without automatic replay") } catch { }
        XCTAssertEqual(calls,1)
    }
    let id = UUID()
    func bootstrap(bytes: Int = 262144) -> OrganizationBootstrap { OrganizationBootstrap(libraryID: id, protocolVersion: 1, limit: 5, windowSeconds: 3600, maxOperations: 50, maxBodyBytes: bytes) }
    func connection(_ access: @escaping @Sendable (Bool) async throws -> OrganizationAccess = { _ in OrganizationAccess(token: "test", issuer: "https://issuer.example", subject: "owner") }) throws -> AuthenticatedSyncConnection {
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [HTTPSStub.self]
        return try AuthenticatedSyncConnection(baseURL: URL(string:"https://api.example")!, issuer: "https://issuer.example", subject:"owner",session:URLSession(configuration:config), access:access)
    }
    func testPKCEAndExactCallback() throws {
        XCTAssertEqual(OrganizationPKCE.challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
        XCTAssertEqual(try OrganizationPKCE.random().count,43)
        XCTAssertEqual(try OrganizationPKCE.code(URL(string:"zukanbookshelf://oauth/callback?code=c&state=s")!,redirect:"zukanbookshelf://oauth/callback",state:"s"),"c")
        for value in ["zukanbookshelf://evil/callback?code=c&state=s","zukanbookshelf://oauth/callback?code=c&state=wrong","zukanbookshelf://oauth/callback?code=c&state=s&state=s","zukanbookshelf://oauth/callback?code=c&state=s#fragment"] { XCTAssertThrowsError(try OrganizationPKCE.code(URL(string:value)!,redirect:"zukanbookshelf://oauth/callback",state:"s")) }
    }
    func testCountAndEncodedByteLimitsKeepOrderAndRejectOversizedSingleItem() throws {
        let connection = try connection()
        let transport = try AuthenticatedOrganizationTransport<String>(connection:connection,bootstrap:bootstrap(),attemptID:UUID())
        let ops = (0..<125).map { SyncOperation<String>(key: "tag/\($0)",expectedRevision:0,value:.tag("日本語 \($0)")) }
        XCTAssertEqual(try transport.batch(libraryID:id,operations:ops),Array(ops.prefix(50)))
        let tiny = try AuthenticatedOrganizationTransport<String>(connection:connection,bootstrap:bootstrap(bytes:1024),attemptID:UUID())
        let big = (0..<4).map { SyncOperation<String>(key:"tag/\($0)",expectedRevision:0,value:.tag(String(repeating:"日/\"",count:45))) }
        let batch = try tiny.batch(libraryID:id,operations:big)
        XCTAssertFalse(batch.isEmpty); XCTAssertLessThan(batch.count,big.count)
        let encoded = try JSONEncoder().encode(LimitedSyncRequest(action:"sync",libraryID:id,attemptID:tiny.attemptID,operations:batch))
        XCTAssertLessThanOrEqual(encoded.count,1024)
        XCTAssertThrowsError(try tiny.batch(libraryID:id,operations:[SyncOperation(key:"tag/x",expectedRevision:0,value:.tag(String(repeating:"x",count:5000)))]))
    }
    func testPartialProgressAndLostAckKeepExactOperationIDs() async throws {
        let transport = FailSecondBatch(id); var client = OrganizationSyncClient<String>(libraryID:id)
        for i in 0..<5 { client.edit(key:OrganizationSyncKey.tag("doc","t\(i)"),value:.tag("t\(i)")) }
        let ids = client.pending.map(\.id)
        do { try await client.synchronize(with:transport); XCTFail() } catch is SyncRetryFailure { }
        XCTAssertEqual(client.baseline.revision,2); XCTAssertEqual(client.pending.map(\.id),Array(ids.dropFirst(2)))
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at:url) }
        try client.save(to:url); client = try OrganizationSyncClient.load(from:url)
        try await client.synchronize(with:transport)
        XCTAssertTrue(client.pending.isEmpty); XCTAssertEqual(client.baseline.revision,5); XCTAssertTrue(client.conflicts.isEmpty)
    }
    func testBoundedSessionLeavesRemainingOperationsForNextExplicitSync() async throws {
        let transport = FailSecondBatch(id,drop:false); var client = OrganizationSyncClient<String>(libraryID:id)
        for i in 0..<5 { client.edit(key:OrganizationSyncKey.tag("doc","t\(i)"),value:.tag("t\(i)")) }
        let last = client.pending.last?.id
        try await client.synchronize(with:transport)
        XCTAssertEqual(client.baseline.revision,4); XCTAssertEqual(client.pending.count,1); XCTAssertEqual(client.pending.first?.id,last)
        try await client.synchronize(with:transport); XCTAssertTrue(client.pending.isEmpty); XCTAssertEqual(client.baseline.revision,5)
    }
    @MainActor func testDifferentAccountCannotResumeExistingCheckpointOrSend() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at:root) }
        try FileManager.default.createDirectory(at:root,withIntermediateDirectories:true)
        let old = try connection()
        let checkpoint:[String:Any] = ["schemaVersion":1,"endpoint":old.baseURL.absoluteString,"identityKey":old.identityKey,"client":try JSONSerialization.jsonObject(with:JSONEncoder().encode(OrganizationSyncClient<OrganizationDocument>(libraryID:id))),"imported":true,"bound":false]
        let file = root.appendingPathComponent("checkpoint.json"), original = try JSONSerialization.data(withJSONObject:checkpoint)
        try original.write(to:file)
        let changed = try AuthenticatedSyncConnection(baseURL:old.baseURL,issuer:old.issuer,subject:"other",session:old.session) { _ in throw SyncError.transport }
        HTTPSStub.handler = { _ in XCTFail("Account mismatch must not send");throw SyncError.transport }
        let session = SyncLabSession(directory:root,seed:OrganizationState(),documents:[],connection:changed)
        await session.prepareAuthenticated()
        XCTAssertFalse(session.connected); XCTAssertNotNil(session.message); XCTAssertEqual(try Data(contentsOf:file),original)
    }
    func testRefreshOnceAndRefuseAccountChangeBeforeSecondRequest() async throws {
        let counter = CredentialCounter(); var sends = 0
        let body = try JSONEncoder().encode(bootstrap())
        HTTPSStub.handler = { request in sends += 1; XCTAssertEqual(request.url?.host,"api.example");return request.value(forHTTPHeaderField:"Authorization") == "Bearer stale" ? (401,Data(),[:]) : (200,body,[:]) }
        _ = try await connection { await counter.access($0) }.bootstrap()
        XCTAssertEqual(sends,2)
        sends = 0
        do { _ = try await connection { await counter.access($0,changed:true) }.bootstrap(); XCTFail() } catch OrganizationConnectionError.accountChanged { }
        XCTAssertEqual(sends,1)
        HTTPSStub.handler = { _ in sends += 1;return (401,Data(),[:]) }
        sends = 0
        do { _ = try await connection { await counter.access($0) }.bootstrap(); XCTFail() } catch OrganizationConnectionError.authentication { }
        XCTAssertEqual(sends,2)
    }
    func testRejectHTTPRedirectMalformedBootstrapAnd403() async throws {
        for raw in ["http://api.example", "https://user@api.example", "https://api.example/path", "https://api.example?x=1"] {
            XCTAssertThrowsError(try AuthenticatedSyncConnection(baseURL:URL(string:raw)!,issuer:"https://issuer.example",subject:"owner") { _ in throw SyncError.transport })
        }
        HTTPSStub.handler = { _ in (302,Data(),["Location":"https://elsewhere.example"]) }
        do { _ = try await connection().bootstrap(); XCTFail() } catch OrganizationConnectionError.invalidResponse { }
        HTTPSStub.handler = { _ in (403,Data(),[:]) }
        do { _ = try await connection().bootstrap(); XCTFail() } catch OrganizationConnectionError.authentication { }
        let invalid = Data("{\"libraryID\":\"\(id)\",\"protocolVersion\":1,\"limit\":5,\"windowSeconds\":3600,\"maxOperations\":500}".utf8)
        HTTPSStub.handler = { _ in (200,invalid,[:]) }
        do { _ = try await connection().bootstrap(); XCTFail() } catch OrganizationConnectionError.invalidBootstrap { }
    }
}

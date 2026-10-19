import XCTest
import Foundation
import CryptoKit
import LibraryOrganization
@testable import Bookshelf

private final class ShelfHTTP: URLProtocol, @unchecked Sendable {
    nonisolated(unsafe) static var reply: ((URLRequest) throws -> (Int, Data))?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (code, data) = try Self.reply!(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: code, httpVersion: nil, headerFields: ["Content-Type":request.url?.host == "api.example" ? "application/json" : (request.url?.path.hasSuffix("pdf") == true ? "application/pdf" : "image/png")])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
@MainActor final class CloudBookshelfTests: XCTestCase {
    private let id = "be36f20b-9868-4f9a-bbde-c994213c861e"
    private func session() -> URLSession { let c = URLSessionConfiguration.ephemeral; c.protocolClasses = [ShelfHTTP.self]; return URLSession(configuration: c) }
    private func document(_ value: String) -> [String: Any] { ["id":value,"title":"S3資料","type":"illustration","version":1,"formats":["png","pdf"],"pageCount":1,"tags":[],"updatedAt":"2026-10-19T00:00:00.000Z"] }
    func testCatalogFollowsCursorAndOnlyUsesAuthenticatedAPI() async throws {
        var count = 0
        ShelfHTTP.reply = { request in
            XCTAssertEqual(request.url?.host, "api.example"); XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test")
            let q = URLComponents(url: request.url!, resolvingAgainstBaseURL: false)!.queryItems!
            XCTAssertEqual(q.first(where: { $0.name == "limit" })?.value, "100")
            count += 1
            if count == 1 { return (200, try JSONSerialization.data(withJSONObject: ["items":[self.document(self.id)],"nextCursor":"opaque+/="])) }
            XCTAssertEqual(q.first(where: { $0.name == "cursor" })?.value, "opaque+/=")
            return (200, Data("{\"items\":[],\"nextCursor\":null}".utf8))
        }
        defer { ShelfHTTP.reply = nil }
        let connection = try AuthenticatedSyncConnection(baseURL: URL(string:"https://api.example")!, issuer:"https://issuer.example", subject:"owner", session:session()) { _ in OrganizationAccess(token:"test",issuer:"https://issuer.example",subject:"owner") }
        let client = CloudBookshelfClient(connection:connection,directory:FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        let documents = try await client.catalog(); XCTAssertEqual(documents.map(\.id),[id]); XCTAssertEqual(count,2)
        let book = client.book(documents[0]); XCTAssertTrue(book.latest.files.isEmpty); XCTAssertNil(book.latest.thumbnail)
        XCTAssertEqual(book.latest.remoteFormats,["png","pdf"])
    }
    func testMalformedIdentityCannotBecomeAFilePath() throws {
        let bytes = try JSONSerialization.data(withJSONObject:document("../../private"))
        let d = try JSONDecoder().decode(CloudShelfDocument.self,from:bytes)
        XCTAssertThrowsError(try d.validate())
    }
    func testSignedGrantBindsHostMethodNameTypeSizeAndDigest() throws {
        let bytes = Data("image".utf8), hash = SHA256.hash(data: bytes).map { String(format:"%02x",$0) }.joined()
        let file = CloudShelfFile(name:"slides/001/slide.png",format:"png",sizeBytes:bytes.count,sha256:hash)
        let valid: [String:Any] = ["url":"https://diagram-design-system-676643701781-apne1.s3.ap-northeast-1.amazonaws.com/library/test","method":"GET","expiresAt":"2099-01-01T00:00:00Z","expiresIn":300,"fileName":"slide.png","sizeBytes":bytes.count,"sha256":hash,"contentType":"image/png"]
        func grant(_ v: [String:Any]) throws -> CloudShelfGrant { try JSONDecoder().decode(CloudShelfGrant.self,from:JSONSerialization.data(withJSONObject:v)) }
        try grant(valid).validate(file:file)
        for (key,value) in [("url","https://evil.example/asset"),("method","POST"),("fileName","other.png"),("contentType","text/html"),("sha256",String(repeating:"0",count:64)),("expiresAt","2000-01-01T00:00:00Z")] {
            var bad=valid;bad[key]=value;XCTAssertThrowsError(try grant(bad).validate(file:file))
        }
        XCTAssertTrue(CloudBookshelfClient.matches(bytes,file));XCTAssertFalse(CloudBookshelfClient.matches(Data("bad".utf8),file))
        XCTAssertThrowsError(try CloudShelfFile(name:"../escape.png",format:"png",sizeBytes:1,sha256:hash).validate())
    }
    func testDownloadChecksIntegrityAndCannotResaveAfterDeletion() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root); ShelfHTTP.reply = nil }
        let data = Data("png-bytes".utf8), hash = SHA256.hash(data: Data("png-bytes".utf8)).map { String(format:"%02x",$0) }.joined()
        let file: [String:Any] = ["name":"diagram.png","format":"png","sizeBytes":data.count,"sha256":hash]
        ShelfHTTP.reply = { request in
            if request.url?.host != "api.example" { XCTAssertNil(request.value(forHTTPHeaderField:"Authorization")); return (200,data) }
            if request.url!.path.hasSuffix("access-url") {
                return (200,try JSONSerialization.data(withJSONObject:["url":"https://diagram-design-system-676643701781-apne1.s3.ap-northeast-1.amazonaws.com/library/test","method":"GET","expiresAt":"2099-01-01T00:00:00Z","expiresIn":300,"fileName":"diagram.png","sizeBytes":data.count,"sha256":hash,"contentType":"image/png"]))
            }
            return (200,try JSONSerialization.data(withJSONObject:["id":self.id,"version":1,"files":[file]]))
        }
        let connection = try AuthenticatedSyncConnection(baseURL:URL(string:"https://api.example")!,issuer:"https://issuer.example",subject:"owner",session:session()) { _ in OrganizationAccess(token:"test",issuer:"https://issuer.example",subject:"owner") }
        let client = CloudBookshelfClient(connection:connection,directory:root,session:session())
        let d = try JSONDecoder().decode(CloudShelfDocument.self,from:JSONSerialization.data(withJSONObject:document(id)))
        try await client.prepare(d,preview:false,active:{true})
        XCTAssertNotNil(client.book(d).latest.thumbnail)
        try Data("corrupt".utf8).write(to:client.folder(d).appendingPathComponent("cover.png"))
        XCTAssertNil(client.book(d).latest.thumbnail)
        var checks = 0
        do {
            try await client.prepare(d,preview:true,active:{ checks += 1; return checks == 1 })
            XCTFail("A delayed response must not resave a deleted document")
        } catch { }
        XCTAssertFalse(FileManager.default.fileExists(atPath:client.folder(d).appendingPathComponent("diagram.png").path))
    }
    func testLargePDFPreviewDoesNotWaitForCoverDownload() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root); ShelfHTTP.reply = nil }
        let data = Data(repeating: 37, count: 2_000_000)
        let hash = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        var downloads = 0
        ShelfHTTP.reply = { request in
            if request.url?.host != "api.example" { downloads += 1; return (200, data) }
            if request.url!.path.hasSuffix("access-url") {
                let body = request.httpBody.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
                // URLProtocol can move a request's body to a stream; grant identity
                // and the single resulting download are also checked below.
                if let body { XCTAssertEqual(body["artifact"] as? String, "pdf") }
                return (200, try JSONSerialization.data(withJSONObject: ["url":"https://diagram-design-system-676643701781-apne1.s3.ap-northeast-1.amazonaws.com/document.pdf", "method":"GET", "expiresAt":"2099-01-01T00:00:00Z", "expiresIn":300, "fileName":"document.pdf", "sizeBytes":data.count, "sha256":hash, "contentType":"application/pdf"]))
            }
            return (200, try JSONSerialization.data(withJSONObject: ["id":self.id,"version":1,"files":[
                ["name":"slides/001/slide.png","format":"png","sizeBytes":1,"sha256":String(repeating:"0", count:64)],
                ["name":"document.pdf","format":"pdf","sizeBytes":data.count,"sha256":hash]]]))
        }
        let connection = try AuthenticatedSyncConnection(baseURL: URL(string:"https://api.example")!, issuer:"https://issuer.example", subject:"owner", session:session()) { _ in OrganizationAccess(token:"test",issuer:"https://issuer.example",subject:"owner") }
        let client = CloudBookshelfClient(connection:connection,directory:root,session:session())
        let d = try JSONDecoder().decode(CloudShelfDocument.self,from:JSONSerialization.data(withJSONObject:document(id)))
        try await client.prepare(d,preview:true,active:{true})
        XCTAssertEqual(downloads, 1)
        XCTAssertEqual(client.book(d).latest.preview?.lastPathComponent, "document.pdf")
        XCTAssertEqual(try Data(contentsOf:client.folder(d).appendingPathComponent("document.pdf")), data)
    }
    func testCorruptCachedFilesAreNotExposedAsPreview() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at:root) }
        let connection = try AuthenticatedSyncConnection(baseURL:URL(string:"https://api.example")!,issuer:"https://issuer.example",subject:"owner") { _ in throw OrganizationConnectionError.authentication }
        let c = CloudBookshelfClient(connection:connection,directory:root)
        let d = try JSONDecoder().decode(CloudShelfDocument.self,from:JSONSerialization.data(withJSONObject:document(id)))
        try FileManager.default.createDirectory(at:c.folder(d),withIntermediateDirectories:true)
        try Data("corrupt".utf8).write(to:c.folder(d).appendingPathComponent("diagram.pdf"))
        XCTAssertTrue(c.book(d).latest.files.isEmpty);XCTAssertNil(c.book(d).latest.preview)
    }
}

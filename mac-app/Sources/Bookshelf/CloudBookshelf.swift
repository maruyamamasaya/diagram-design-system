import Foundation
import CryptoKit
import OSLog
import BookshelfCore
import LibraryOrganization

struct CloudShelfDocument: Codable, Equatable {
    let id: String
    let title: String
    let type: String
    let version: Int
    let formats: [String]
    let pageCount: Int
    let tags: [String]
    let updatedAt: String
    func validate() throws {
        guard id.range(of: "^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$", options: .regularExpression) != nil,
              !title.isEmpty, title.count <= 2000, (1...999999).contains(version), (1...999).contains(pageCount),
              ["presentation", "illustration", "roadmap", "flowchart", "architecture", "comparison"].contains(type),
              !formats.isEmpty, Set(formats).isSubset(of: ["pdf", "png", "pptx", "svg"]), Self.date(updatedAt) != nil else { throw OrganizationConnectionError.invalidResponse }
    }
    static func date(_ text: String) -> Date? {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: text) ?? ISO8601DateFormatter().date(from: text)
    }
}
struct CloudShelfFile: Decodable {
    let name: String
    let format: String
    let sizeBytes: Int
    let sha256: String
    var page: Int { name.hasPrefix("slides/") ? Int(name.split(separator: "/")[1]) ?? 1 : 1 }
    func validate() throws {
        guard (1...32_000_000).contains(sizeBytes), sha256.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
              ["png", "pdf", "pptx"].contains(format),
              name.range(of: "^(diagram\\.(png|pdf)|document\\.pdf|presentation\\.pptx|slides/[0-9]{3}/slide\\.png)$", options: .regularExpression) != nil,
              name.hasSuffix("." + format), (1...999).contains(page) else { throw OrganizationConnectionError.invalidResponse }
    }
}
struct CloudShelfGrant: Decodable {
    let url: URL
    let expiresAt: String
    let method: String
    let expiresIn: Int
    let fileName: String
    let sizeBytes: Int
    let sha256: String
    let contentType: String
    func validate(file: CloudShelfFile) throws {
        try file.validate()
        guard url.scheme == "https", url.user == nil, url.password == nil, url.port == nil || url.port == 443,
              ["diagram-design-system-676643701781-apne1.s3.ap-northeast-1.amazonaws.com", "s3.ap-northeast-1.amazonaws.com"].contains(url.host ?? ""),
              method == "GET", (1...900).contains(expiresIn),
              fileName == URL(fileURLWithPath: file.name).lastPathComponent, sizeBytes == file.sizeBytes, sha256 == file.sha256,
              ["png":"image/png", "pdf":"application/pdf", "pptx":"application/vnd.openxmlformats-officedocument.presentationml.presentation"][file.format] == contentType,
              (CloudShelfDocument.date(expiresAt) ?? .distantPast) > Date() else { throw OrganizationConnectionError.invalidResponse }
    }
}
private final class CloudNoRedirect: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}
@MainActor final class CloudBookshelfClient {
    let connection: AuthenticatedSyncConnection
    let directory: URL
    private let session: URLSession
    private var details: [String: [CloudShelfFile]] = [:]
    init(connection: AuthenticatedSyncConnection, directory: URL, session: URLSession? = nil) {
        self.connection = connection; self.directory = directory
        let c = URLSessionConfiguration.ephemeral; c.httpShouldSetCookies = false; c.urlCache = nil; c.timeoutIntervalForRequest = 30
        self.session = session ?? URLSession(configuration: c, delegate: CloudNoRedirect(), delegateQueue: nil)
    }
    private func request<T: Decodable>(_ path: String, query: [URLQueryItem] = [], body: Data? = nil) async throws -> T {
        let (data, http) = try await connection.request(path: path, body: body, query: query)
        Logger(subsystem: "jp.local.zukan.bookshelf", category: "cloud").debug("API status: \(http.statusCode)")
        guard http.statusCode == 200 else { throw OrganizationConnectionError.invalidResponse }
        return try JSONDecoder().decode(T.self, from: data)
    }
    func catalog() async throws -> [CloudShelfDocument] {
        struct Page: Decodable { let items: [CloudShelfDocument]; let nextCursor: String? }
        var result: [CloudShelfDocument] = [], cursor: String?, seen = Set<String>(), pages = 0
        repeat {
            pages += 1; guard pages <= 50 else { throw OrganizationConnectionError.invalidResponse }
            var query = [URLQueryItem(name: "limit", value: "100")]
            if let cursor { query.append(URLQueryItem(name: "cursor", value: cursor)) }
            let page: Page = try await request("v1/diagrams", query: query)
            for item in page.items { try item.validate(); guard !result.contains(where: { $0.id == item.id }) else { throw OrganizationConnectionError.invalidResponse }; result.append(item) }
            guard result.count <= 500 else { throw OrganizationConnectionError.invalidResponse }
            cursor = page.nextCursor
            if let cursor { guard !cursor.isEmpty, seen.insert(cursor).inserted else { throw OrganizationConnectionError.invalidResponse } }
        } while cursor != nil
        return result
    }
    func folder(_ d: CloudShelfDocument) -> URL { directory.appendingPathComponent(d.id).appendingPathComponent(String(d.version)) }
    func book(_ d: CloudShelfDocument) -> Book {
        let root = folder(d)
        let known = details[d.id + "/" + String(d.version)] ?? []
        let files = known.compactMap { file -> URL? in
            let name = file.name.contains("/") ? "diagram.png" : file.name
            let path = root.appendingPathComponent(name)
            guard let data = try? Data(contentsOf: path), Self.matches(data, file) else { return nil }
            return path
        }
        let cover = root.appendingPathComponent("cover.png")
        let thumbnail: URL? = known.first(where: { $0.format == "png" }).flatMap { file in
            guard let data = try? Data(contentsOf: cover), Self.matches(data, file) else { return nil }; return cover
        }
        return Book(id: d.id, editions: [BookEdition(version: d.version, title: d.title, directory: root, files: files,
            thumbnail: thumbnail, pageCount: d.pageCount, kind: d.type, tags: d.tags, modified: CloudShelfDocument.date(d.updatedAt) ?? .distantPast, remoteFormats: d.formats)])
    }
    func prepare(_ d: CloudShelfDocument, preview: Bool, artifact: String? = nil, active: () -> Bool) async throws {
        try d.validate(); guard active() else { return }
        let key = d.id + "/" + String(d.version)
        let files: [CloudShelfFile]
        if let cached = details[key] { files = cached }
        else {
            struct Detail: Decodable { let id: String; let version: Int; let files: [CloudShelfFile] }
            let detail: Detail = try await request("v1/diagrams/" + d.id, query: [URLQueryItem(name: "version", value: String(d.version))])
            guard detail.id == d.id, detail.version == d.version else { throw OrganizationConnectionError.invalidResponse }
            files = detail.files.filter { ["png", "pdf", "pptx"].contains($0.format) }
            for file in files { try file.validate() }
            details[key] = files
        }
        Logger(subsystem: "jp.local.zukan.bookshelf", category: "cloud").debug("Validated detail files: \(files.count)")
        let cover = files.first { $0.format == "png" }
        var wanted = cover.map { [($0, "cover.png")] } ?? []
        if let artifact {
            guard let file = files.first(where: { $0.format == artifact }) else { throw OrganizationConnectionError.invalidResponse }
            wanted = [(file, file.name.contains("/") ? "diagram.png" : file.name)]
        } else if preview, let pdf = files.first(where: { $0.format == "pdf" }) { wanted = [(pdf, pdf.name)] }
        else if preview, let cover { wanted = [(cover, "diagram.png")] }
        for (file, name) in wanted {
            let path = folder(d).appendingPathComponent(name)
            if let data = try? Data(contentsOf: path), Self.matches(data, file) { continue }
            let body = try JSONSerialization.data(withJSONObject: ["version":d.version,"artifact":file.format,"page":file.page,"purpose":"download"])
            let grant: CloudShelfGrant = try await request("v1/diagrams/" + d.id + "/access-url", body: body)
            try grant.validate(file: file)
            Logger(subsystem: "jp.local.zukan.bookshelf", category: "cloud").debug("Starting asset bytes: \(file.sizeBytes)")
            let data = try await Self.download(grant, file: file, session: session)
            Logger(subsystem: "jp.local.zukan.bookshelf", category: "cloud").debug("Received asset bytes: \(data.count)")
            guard Self.matches(data, file), active() else { throw OrganizationConnectionError.invalidResponse }
            try FileManager.default.createDirectory(at: path.deletingLastPathComponent(), withIntermediateDirectories: true)
            try data.write(to: path, options: .atomic)
        }
    }
    // AsyncBytes must be consumed away from MainActor: otherwise every byte can
    // schedule a UI actor hop, leaving multi-megabyte previews apparently stuck.
    nonisolated private static func download(_ grant: CloudShelfGrant, file: CloudShelfFile, session: URLSession) async throws -> Data {
        var request = URLRequest(url: grant.url); request.timeoutInterval = 30
        // The S3 request deliberately carries no API Bearer header.
        let (bytes, response) = try await session.bytes(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200, http.url == grant.url,
              http.mimeType == grant.contentType, http.expectedContentLength < 0 || http.expectedContentLength == Int64(file.sizeBytes) else { throw OrganizationConnectionError.invalidResponse }
        var data = Data(); data.reserveCapacity(file.sizeBytes)
        for try await byte in bytes {
            guard data.count < file.sizeBytes else { throw OrganizationConnectionError.invalidResponse }
            data.append(byte)
        }
        try Task.checkCancellation()
        return data
    }
    static func matches(_ data: Data, _ file: CloudShelfFile) -> Bool {
        data.count == file.sizeBytes && SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() == file.sha256
    }
}

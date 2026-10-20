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
struct CloudShelfFile: Codable {
    let name: String
    let format: String
    let sizeBytes: Int
    let sha256: String
    var page: Int { name.hasPrefix("slides/") ? Int(name.split(separator: "/")[1].replacingOccurrences(of: "slide-", with: "")) ?? 1 : 1 }
    func validate() throws {
        guard LibraryArtifactPolicy.allows(name: name, size: sizeBytes, hash: sha256), sha256.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
              ["png", "pdf", "pptx"].contains(format),
              name.range(of: "^(diagram\\.(png|pdf)|document\\.pdf|presentation\\.pptx|slides/(?:slide-)?[0-9]{3}/slide\\.png)$", options: .regularExpression) != nil,
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
    private struct AssetHTTPFailure: Error { let status: Int }
    private var details: [String: [CloudShelfFile]] = [:]
    private var inUse: [String: Int] = [:]
    private struct CachedDetail: Codable {
        let document: CloudShelfDocument
        let files: [CloudShelfFile]
    }
    // Cache contains only authenticated metadata and verified artifacts, never grants.
    private func cachedFiles(_ d: CloudShelfDocument) -> [CloudShelfFile]? {
        let key = d.id + "/" + String(d.version)
        if let files = details[key] { return files }
        guard (try? d.validate()) != nil else { return nil }
        let path = folder(d).appendingPathComponent("detail.json")
        guard let data = try? Data(contentsOf: path), data.count <= 1_000_000,
              let cached = try? JSONDecoder().decode(CachedDetail.self, from: data),
              cached.document == d, !cached.files.isEmpty, cached.files.count <= 501,
              cached.files.allSatisfy({ (try? $0.validate()) != nil }) else { return nil }
        details[key] = cached.files
        return cached.files
    }
    func pruneCache(maxBytes: Int = Int(LibraryArtifactPolicy.maximumCacheBytes), maxVersions: Int = .max) {
        let fm = FileManager.default
        struct Entry { let url: URL; let key: String; let date: Date; let bytes: Int; let hasPreview: Bool }
        var entries: [Entry] = []
        for id in (try? fm.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.isSymbolicLinkKey])) ?? [] {
            guard UUID(uuidString: id.lastPathComponent) != nil,
                  (try? id.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink) == false else { continue }
            for version in (try? fm.contentsOfDirectory(at: id, includingPropertiesForKeys: [.isSymbolicLinkKey])) ?? [] {
                guard Int(version.lastPathComponent).map({ $0 > 0 }) == true,
                      (try? version.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink) == false else { continue }
                let marker = version.appendingPathComponent("detail.json")
                guard let values = try? marker.resourceValues(forKeys: [.contentModificationDateKey]), let date = values.contentModificationDate else { continue }
                let files = (try? fm.contentsOfDirectory(at: version, includingPropertiesForKeys: [.fileSizeKey])) ?? []
                let bytes = files.reduce(0) { $0 + ((try? $1.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) }
                let hasPreview = files.contains { ["document.pdf", "diagram.pdf", "diagram.png", "presentation.pptx"].contains($0.lastPathComponent) }
                entries.append(Entry(url: version, key: id.lastPathComponent + "/" + version.lastPathComponent, date: date, bytes: bytes, hasPreview: hasPreview))
            }
        }
        // Browsing cover grids must not evict previously opened PDFs: cover-only
        // entries share the byte budget but do not consume the preview quota.
        var total = entries.reduce(0) { $0 + $1.bytes }, count = entries.filter(\.hasPreview).count
        for entry in entries.sorted(by: { $0.date < $1.date }) where total > maxBytes || (entry.hasPreview && count > maxVersions) {
            guard inUse[entry.key] == nil else { continue }
            if (try? fm.removeItem(at: entry.url)) != nil {
                details.removeValue(forKey: entry.key); total -= entry.bytes; if entry.hasPreview { count -= 1 }
            }
        }
    }
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
    private(set) var rejectedCount = 0
    func catalog() async throws -> [CloudShelfDocument] {
        struct Warning: Decodable { let id: String; let version: Int; let code: String }
        struct Page: Decodable { let items: [CloudShelfDocument]; let nextCursor: String?; let warnings: [Warning]? }
        rejectedCount = 0
        var result: [CloudShelfDocument] = [], cursor: String?, seen = Set<String>(), pages = 0
        repeat {
            pages += 1; guard pages <= 50 else { throw OrganizationConnectionError.invalidResponse }
            var query = [URLQueryItem(name: "limit", value: "100")]
            if let cursor { query.append(URLQueryItem(name: "cursor", value: cursor)) }
            let page: Page = try await request("v1/diagrams", query: query)
            rejectedCount = max(rejectedCount, page.warnings?.count ?? 0)
            for item in page.items { try item.validate(); guard !result.contains(where: { $0.id == item.id }) else { throw OrganizationConnectionError.invalidResponse }; result.append(item) }
            guard result.count <= 500 else { throw OrganizationConnectionError.invalidResponse }
            cursor = page.nextCursor
            if let cursor { guard !cursor.isEmpty, seen.insert(cursor).inserted else { throw OrganizationConnectionError.invalidResponse } }
        } while cursor != nil
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try JSONEncoder().encode(result).write(to: directory.appendingPathComponent("catalog.json"), options: .atomic)
        return result
    }
    func cachedCatalog() -> [CloudShelfDocument] {
        guard let data = try? Data(contentsOf: directory.appendingPathComponent("catalog.json")), data.count <= 2_000_000,
              let documents = try? JSONDecoder().decode([CloudShelfDocument].self, from: data), documents.count <= 500,
              documents.allSatisfy({ (try? $0.validate()) != nil }) else { return [] }
        return documents
    }
    func folder(_ d: CloudShelfDocument) -> URL { directory.appendingPathComponent(d.id).appendingPathComponent(String(d.version)) }
    func book(_ d: CloudShelfDocument) -> Book {
        let root = folder(d)
        let known = cachedFiles(d) ?? []
        let files = known.filter { !$0.name.contains("/") || $0.page == 1 }.compactMap { file -> URL? in
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
        inUse[key, default: 0] += 1
        defer { if inUse[key] == 1 { inUse.removeValue(forKey: key) } else { inUse[key, default: 1] -= 1 } }
        let files: [CloudShelfFile]
        if let cached = cachedFiles(d) { files = cached }
        else {
            struct Detail: Decodable { let id: String; let version: Int; let files: [CloudShelfFile] }
            let detail: Detail = try await request("v1/diagrams/" + d.id, query: [URLQueryItem(name: "version", value: String(d.version))])
            guard detail.id == d.id, detail.version == d.version else { throw OrganizationConnectionError.invalidResponse }
            files = detail.files.filter { ["png", "pdf", "pptx"].contains($0.format) }
            for file in files {
                try file.validate()
                guard LibraryArtifactPolicy.allows(name: file.name, size: file.sizeBytes, hash: file.sha256, id: d.id, version: d.version) else { throw OrganizationConnectionError.invalidResponse }
            }
            guard active() else { throw CancellationError() }
            try FileManager.default.createDirectory(at: folder(d), withIntermediateDirectories: true)
            try JSONEncoder().encode(CachedDetail(document: d, files: files)).write(to: folder(d).appendingPathComponent("detail.json"), options: .atomic)
            details[key] = files
        }
        try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: folder(d).appendingPathComponent("detail.json").path)
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
            let data = try await fetch(d, file: file)
            guard Self.matches(data, file), active() else { throw OrganizationConnectionError.invalidResponse }
            try FileManager.default.createDirectory(at: path.deletingLastPathComponent(), withIntermediateDirectories: true)
            try data.write(to: path, options: .atomic)
        }
        pruneCache()
    }
    private func fetch(_ d: CloudShelfDocument, file: CloudShelfFile) async throws -> Data {
        let body = try JSONSerialization.data(withJSONObject: ["version":d.version,"artifact":file.format,"page":file.page,"purpose":"download"])
        for attempt in 0...3 {
            try Task.checkCancellation()
            let grant: CloudShelfGrant = try await request("v1/diagrams/" + d.id + "/access-url", body: body)
            try grant.validate(file: file)
            do { return try await Self.download(grant, file: file, session: session) }
            catch {
                try Task.checkCancellation()
                let retry = (error as? AssetHTTPFailure).map { $0.status == 403 || $0.status == 429 || $0.status >= 500 } ?? (error is URLError)
                guard attempt < 3, retry else { throw error }
                try await Task.sleep(for: .seconds(Double(attempt + 1)))
            }
        }
        throw OrganizationConnectionError.invalidResponse
    }
    // AsyncBytes must be consumed away from MainActor: otherwise every byte can
    // schedule a UI actor hop, leaving multi-megabyte previews apparently stuck.
    nonisolated private static func download(_ grant: CloudShelfGrant, file: CloudShelfFile, session: URLSession) async throws -> Data {
        var request = URLRequest(url: grant.url); request.timeoutInterval = 30
        // The S3 request deliberately carries no API Bearer header.
        let (bytes, response) = try await session.bytes(for: request)
        guard let http = response as? HTTPURLResponse else { throw OrganizationConnectionError.invalidResponse }
        guard http.statusCode == 200 else { throw AssetHTTPFailure(status: http.statusCode) }
        guard http.url == grant.url,
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

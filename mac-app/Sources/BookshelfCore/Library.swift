import Foundation
import LibraryOrganization

public struct BookEdition: Codable, Hashable, Sendable {
    public var version: Int
    public var title: String
    public var directory: URL
    public var files: [URL]
    public var thumbnail: URL?
    public var pageCount: Int
    public var kind: String = "presentation"
    public var tags: [String] = []
    public var modified: Date
    public var remoteFormats: [String]? = nil
    public init(version: Int, title: String, directory: URL, files: [URL], thumbnail: URL?, pageCount: Int, kind: String = "presentation", tags: [String] = [], modified: Date, remoteFormats: [String]? = nil) {
        self.version = version; self.title = title; self.directory = directory; self.files = files
        self.thumbnail = thumbnail; self.pageCount = pageCount; self.kind = kind; self.tags = tags; self.modified = modified; self.remoteFormats = remoteFormats
    }
    public var preview: URL? { files.first { $0.pathExtension.lowercased() == "pdf" } ?? files.first { $0.pathExtension.lowercased() == "png" } ?? files.first }
}
public struct Book: Identifiable, Sendable {
    public var id: String
    public var editions: [BookEdition]
    public var latest: BookEdition { editions[0] }
    public init(id: String, editions: [BookEdition]) { self.id = id; self.editions = editions }
}
public typealias ShelfFolder = OrganizationFolder
public struct SourceFolder: Codable, Identifiable, Sendable {
    public var id: UUID
    public var path: String
    public var bookmark: Data?
    public init(path: String, bookmark: Data? = nil) { id = UUID(); self.path = path; self.bookmark = bookmark }
}
public struct LibrarySettings: Codable, Sendable {
    public var schemaVersion = 1
    public var sources: [SourceFolder] = []
    public var folders: [ShelfFolder] = []
    public var folderOrder: [UUID]?
    public var assignments: [String: UUID] = [:]
    public var classifications: [String: LibraryClassification] = [:]
    public var collections: [ReadingCollection<BookReference>] = []
    public init() {}
    private enum CodingKeys: String, CodingKey { case schemaVersion, sources, folders, folderOrder, assignments, classifications, collections }
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        schemaVersion = try c.decode(Int.self, forKey: .schemaVersion)
        sources = try c.decode([SourceFolder].self, forKey: .sources)
        folders = try c.decode([ShelfFolder].self, forKey: .folders)
        folderOrder = try c.decodeIfPresent([UUID].self, forKey: .folderOrder)
        assignments = try c.decode([String: UUID].self, forKey: .assignments)
        classifications = try c.decodeIfPresent([String: LibraryClassification].self, forKey: .classifications) ?? [:]
        collections = try c.decodeIfPresent([ReadingCollection<BookReference>].self, forKey: .collections) ?? []
    }
    public func descendants(of id: UUID) -> Set<UUID> { organization.descendants(of: id) }
    public mutating func removeFolder(_ id: UUID) {
        var value = organization; value.removeFolder(id)
        folders = value.folders; folderOrder = value.folderOrder; assignments = value.assignments
    }
    public func save(to url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        try encoder.encode(self).write(to: url, options: .atomic)
    }
    public static func load(from url: URL) throws -> Self {
        let value = try JSONDecoder().decode(Self.self, from: Data(contentsOf: url))
        guard value.schemaVersion == 1 else { throw CocoaError(.coderReadCorrupt) }
        return value
    }
}
public struct ScanResult: Sendable {
    public var books: [Book]
    public var warnings: [String]
}
public enum LibraryScanner {
    // Only declared deliverables are indexed. Sources/build files never become separate books.
    public static func scan(roots: [URL]) -> ScanResult {
        let fm = FileManager.default
        var editions: [String: [BookEdition]] = [:], warnings: [String] = []
        var seen = Set<String>()
        for root in roots {
            guard let enumerator = fm.enumerator(at: root, includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey], options: [.skipsHiddenFiles, .skipsPackageDescendants], errorHandler: { url, error in
                warnings.append("\(url.lastPathComponent): \(error.localizedDescription)"); return true
            }) else { warnings.append("読込不可: \(root.path)"); continue }
            for case let url as URL in enumerator {
                if url.lastPathComponent.hasSuffix("-tests") || ["tests", "node_modules", "build", "evidence"].contains(url.lastPathComponent) { enumerator.skipDescendants(); continue }
                if (try? url.resourceValues(forKeys: [.isSymbolicLinkKey]).isSymbolicLink) == true { enumerator.skipDescendants(); continue }
                guard url.lastPathComponent == "metadata.json", seen.insert(url.resolvingSymlinksInPath().path).inserted else { continue }
                do {
                    let (id, edition) = try readMetadata(url)
                    editions[id, default: []].append(edition)
                } catch { warnings.append("\(url.deletingLastPathComponent().path): \(error.localizedDescription)") }
            }
        }
        let books = editions.map { id, values in
            var sorted = values.sorted { $0.version == $1.version ? $0.directory.path < $1.directory.path : $0.version > $1.version }
            let generic = ["document", "presentation", "diagram"]
            if let title = sorted.first(where: { !generic.contains($0.title.lowercased()) })?.title {
                for index in sorted.indices where generic.contains(sorted[index].title.lowercased()) { sorted[index].title = title }
            }
            return Book(id: id, editions: sorted)
        }.sorted { $0.latest.modified > $1.latest.modified }
        return ScanResult(books: books, warnings: warnings)
    }
    static func readMetadata(_ url: URL) throws -> (String, BookEdition) {
        let data = try Data(contentsOf: url)
        guard data.count < 10_000_000, let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let id = (object["presentationId"] ?? object["diagramId"] ?? object["atlasId"] ?? object["id"]) as? String,
              !id.isEmpty, let version = (object["version"] ?? object["presentationVersion"]) as? Int, version > 0 else { throw CocoaError(.fileReadCorruptFile) }
        for key in ["status", "packageStatus"] {
            if let status = object[key] as? String, ["failed", "incomplete", "building", "draft"].contains(status.lowercased()) { throw CocoaError(.fileReadCorruptFile) }
        }
        let base = url.deletingLastPathComponent().resolvingSymlinksInPath()
        let slides = object["slides"] as? [[String: Any]] ?? []
        var artifacts = object["artifacts"] as? [[String: Any]] ?? []
        if let dictionary = object["artifacts"] as? [String: Any] { artifacts += dictionary.keys.map { ["path": $0] } }
        artifacts += object["files"] as? [[String: Any]] ?? []
        for slide in slides { artifacts += slide["artifacts"] as? [[String: Any]] ?? [] }
        // Standard packages record deck exports separately from per-page artifacts.
        for name in ["document.pdf", "presentation.pptx"] where FileManager.default.fileExists(atPath: base.appendingPathComponent(name).path) { artifacts.append(["path": name]) }
        var files: [URL] = []
        for artifact in artifacts {
            guard var path = (artifact["path"] ?? artifact["name"]) as? String else { continue }
            let legacyPrefix = "outputs/" + base.lastPathComponent + "/"
            if path.hasPrefix(legacyPrefix) { path = String(path.dropFirst(legacyPrefix.count)) }
            let components = path.split(separator: "/").map(String.init)
            if components.contains(where: { $0.hasPrefix(".") || ["assets", "evidence", "build", "thumbnails", "source"].contains($0) }) { continue }
            let file = base.appendingPathComponent(path).resolvingSymlinksInPath()
            guard !path.hasPrefix("/"), file.path.hasPrefix(base.path + "/") else { throw CocoaError(.fileReadNoPermission) }
            guard ["pdf", "pptx", "png", "jpg", "jpeg"].contains(file.pathExtension.lowercased()), !file.lastPathComponent.lowercased().contains("thumbnail") else { continue }
            guard FileManager.default.fileExists(atPath: file.path) else { throw CocoaError(.fileNoSuchFile) }
            files.append(file)
        }
        files = Array(Set(files))
        if files.contains(where: { $0.path.hasPrefix(base.appendingPathComponent("delivery").path + "/") }) { files = files.filter { $0.path.hasPrefix(base.appendingPathComponent("delivery").path + "/") } }
        files.sort { $0.path.localizedStandardCompare($1.path) == .orderedAscending }
        guard !files.isEmpty else { throw CocoaError(.fileReadCorruptFile) }
        let thumbnailURL = base.appendingPathComponent("thumbnail.png")
        let thumbnail = FileManager.default.fileExists(atPath: thumbnailURL.path) && thumbnailURL.resolvingSymlinksInPath().path.hasPrefix(base.path + "/") ? thumbnailURL : files.first { $0.pathExtension == "png" }
        let pdfName = files.first { $0.pathExtension == "pdf" }?.deletingPathExtension().lastPathComponent
        let source = (try? Data(contentsOf: base.appendingPathComponent("source.json"))).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
        let title = object["title"] as? String ?? source?["title"] as? String ?? pdfName ?? base.deletingLastPathComponent().deletingLastPathComponent().lastPathComponent
        let modified = (try? url.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
        let pageCount = object["pageCount"] as? Int ?? object["pages"] as? Int ?? object["slideCount"] as? Int ?? object["slides"] as? Int ?? (slides.isEmpty ? nil : slides.count) ?? max(1, files.filter { $0.pathExtension == "png" }.count)
        let schema = object["schemaVersion"] as? String ?? ""
        let kind = schema.hasPrefix("illustration-") ? "illustration" : object["diagramId"] != nil && object["presentationVersion"] == nil ? "diagram" : "presentation"
        return (id, BookEdition(version: version, title: title, directory: base, files: files, thumbnail: thumbnail, pageCount: pageCount, kind: kind, tags: object["tags"] as? [String] ?? [], modified: modified))
    }
}

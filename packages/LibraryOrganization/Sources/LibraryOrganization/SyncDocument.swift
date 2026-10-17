import Foundation

/// Portable metadata only: no URL, bookmark, credentials or downloaded bytes.
public struct OrganizationDocument: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var title: String
    public var type: String
    public var version: Int
    public var formats: [String]
    public var pageCount: Int
    public var tags: [String]
    public init(id: String, title: String, type: String, version: Int, formats: [String], pageCount: Int, tags: [String]) {
        self.id = UUID(uuidString: id)?.uuidString.lowercased() ?? id; self.title = title; self.type = type; self.version = version; self.formats = formats; self.pageCount = pageCount; self.tags = tags
    }
}

extension OrganizationSyncKey {
    public static func title(_ key: String) -> String {
        let parts = key.split(separator: "/")
        if key == order { return "フォルダの並び順" }
        guard parts.count >= 2 else { return key }
        let labels = ["folder": "フォルダ", "assignment": "所属", "group": "グループ", "tag": "タグ", "collection": "まとめ"]
        let id = ["assignment", "group", "tag"].contains(String(parts[0])) ? decoded(parts[1]) ?? String(parts[1]) : String(parts[1])
        return (labels[String(parts[0])] ?? String(parts[0])) + " · " + id
    }
}

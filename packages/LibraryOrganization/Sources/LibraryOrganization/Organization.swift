import Foundation

public struct OrganizationFolder: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var name: String
    public var parentID: UUID?
    public var iconFile: String?
    public init(id: UUID = UUID(), name: String, parentID: UUID? = nil) { self.id = id; self.name = name; self.parentID = parentID }
}

/// Raw values intentionally preserve existing iOS JSON.
public enum LibraryGroup: String, Codable, CaseIterable, Sendable {
    case work = "仕事", personal = "私用", other = "その他"
}
public struct LibraryClassification: Codable, Equatable, Sendable {
    public var group: LibraryGroup
    public var tags: [String]
    public init(group: LibraryGroup = .other, tags: [String] = []) { self.group = group; self.tags = tags }
    public static func normalizedTags(_ tags: [String]) -> [String] {
        var seen = Set<String>()
        return tags.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty && seen.insert($0.lowercased()).inserted }
    }
}
/// Snapshot payload stays adapter-owned, preserving existing offline metadata.
public struct ReadingCollection<Member: Codable & Equatable & Sendable>: Codable, Identifiable, Equatable, Sendable {
    public let id: UUID
    public var title: String
    public var members: [Member]
    public init(id: UUID, title: String, members: [Member]) { self.id = id; self.title = title; self.members = members }
    public func validateStructure(memberID: (Member) -> String) throws {
        guard !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, title.count <= 120,
              !members.isEmpty, members.count <= 100,
              Set(members.map(memberID)).count == members.count else { throw OrganizationError.invalidCollection }
    }

}
public struct OrganizationState<Member: Codable & Equatable & Sendable>: Codable, Sendable {
    public var schemaVersion = 1
    public var folders: [OrganizationFolder] = []
    public var folderOrder: [UUID]?
    public var assignments: [String: UUID] = [:]
    public var classifications: [String: LibraryClassification] = [:]
    public var collections: [ReadingCollection<Member>] = []
    public init() {}
    public mutating func moveBooks(_ ids: Set<String>, to folder: UUID?) {
        guard folder == nil || folders.contains(where: { $0.id == folder }) else { return }
        for id in ids { assignments[id] = folder }
    }
    public func descendants(of id: UUID) -> Set<UUID> {
        var result: Set<UUID> = [id]
        var previous = 0
        while result.count != previous {
            previous = result.count
            for folder in folders where folder.parentID.map(result.contains) == true { result.insert(folder.id) }
        }
        return result
    }
    public mutating func removeFolder(_ id: UUID) {
        let ids = descendants(of: id)
        folders.removeAll { ids.contains($0.id) }
        folderOrder = folderOrder?.filter { !ids.contains($0) }
        assignments = assignments.filter { !ids.contains($0.value) }
    }
    /// Legacy files are read without rewriting them. Caller persists only after successful decoding.
    public static func importing(macSettings: Data? = nil, classifications: Data? = nil, collections: Data? = nil) throws -> Self {
        var result = Self()
        let decoder = JSONDecoder()
        if let macSettings {
            let legacy = try decoder.decode(LegacyFolders<Member>.self, from: macSettings)
            guard legacy.schemaVersion == 1 else { throw OrganizationError.unsupportedVersion }
            result.folders = legacy.folders; result.folderOrder = legacy.folderOrder; result.assignments = legacy.assignments
            result.classifications = legacy.classifications ?? [:]; result.collections = legacy.collections ?? []
        }
        if let classifications {
            for (id, value) in try decoder.decode([String: LibraryClassification].self, from: classifications) {
                guard result.classifications[id] == nil || result.classifications[id] == value else { throw OrganizationError.conflictingImport }
                result.classifications[id] = value
            }
        }
        if let collections {
            for value in try decoder.decode([ReadingCollection<Member>].self, from: collections) {
                if let old = result.collections.first(where: { $0.id == value.id }) {
                    guard old == value else { throw OrganizationError.conflictingImport }
                } else { result.collections.append(value) }
            }
        }
        return result
    }
    public static func load(_ data: Data) throws -> Self {
        let value = try JSONDecoder().decode(Self.self, from: data)
        guard value.schemaVersion == 1 else { throw OrganizationError.unsupportedVersion }
        return value
    }
}
private struct LegacyFolders<Member: Codable & Equatable & Sendable>: Decodable {
    var schemaVersion: Int
    var folders: [OrganizationFolder]
    var folderOrder: [UUID]?
    var assignments: [String: UUID]
    var classifications: [String: LibraryClassification]?
    var collections: [ReadingCollection<Member>]?
}
public enum OrganizationError: Error { case unsupportedVersion, invalidCollection, conflictingImport }

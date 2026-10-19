import Foundation

public enum LibraryDocumentStatus: String, Codable, Sendable { case active, trashed, deleting, deleted }
public struct LibraryLifecycleEntry: Codable, Equatable, Sendable, Identifiable {
    public let id: String
    public let document: OrganizationDocument
    public let revision: Int
    public let status: LibraryDocumentStatus
    public let updatedAt: String
    public init(id: String, document: OrganizationDocument, revision: Int, status: LibraryDocumentStatus, updatedAt: String) {
        self.id = id; self.document = document; self.revision = revision; self.status = status; self.updatedAt = updatedAt
    }
    public func validate() throws {
        guard UUID(uuidString: id)?.uuidString.lowercased() == id, document.id == id, revision > 0,
              !document.title.isEmpty, document.version > 0, document.pageCount > 0,
              ISO8601DateFormatter().date(from: updatedAt) != nil || ISO8601DateFormatter.fractional.date(from: updatedAt) != nil else { throw OrganizationConnectionError.invalidResponse }
    }
}
private extension ISO8601DateFormatter {
    static var fractional: ISO8601DateFormatter { let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; return f }
}
public struct LibraryLifecycleSnapshot: Codable, Sendable {
    public let schemaVersion: String
    public let entries: [LibraryLifecycleEntry]
    public init(entries: [LibraryLifecycleEntry]) { schemaVersion = "library-lifecycle-1.0"; self.entries = entries }
    public func validate() throws {
        guard schemaVersion == "library-lifecycle-1.0", entries.count <= 500,
              Set(entries.map(\.id)).count == entries.count else { throw OrganizationConnectionError.invalidResponse }
        for entry in entries { try entry.validate() }
    }
}
public struct LibraryDeletionPlan: Codable, Sendable, Identifiable {
    public let id: String
    public let revision: Int
    public let digest: String
    public let sizeBytes: Int64
    public let objectCount: Int
    public func validate() throws {
        guard UUID(uuidString: id)?.uuidString.lowercased() == id, revision > 0,
              digest.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
              sizeBytes >= 0, (1...10000).contains(objectCount) else { throw OrganizationConnectionError.invalidResponse }
    }
}
/// Durable document-wide tombstones are independent of folder sync and cache eviction.
/// Once deleted, an older response must never resurrect a device copy.
public struct LibraryLifecycleIndex: Codable, Sendable {
    public private(set) var entries: [String: LibraryLifecycleEntry] = [:]
    public init() {}
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let values = try container.decode([String: LibraryLifecycleEntry].self, forKey: .entries)
        for (id, entry) in values {
            try entry.validate()
            guard id == entry.id else { throw OrganizationConnectionError.invalidResponse }
        }
        entries = values
    }
    public func status(_ id: String) -> LibraryDocumentStatus { entries[id.lowercased()]?.status ?? .active }
    public var deletedIDs: Set<String> { Set(entries.values.filter { $0.status == .deleted }.map(\.id)) }
    public mutating func merge(_ snapshot: LibraryLifecycleSnapshot) throws {
        try snapshot.validate()
        var next = self
        for entry in snapshot.entries { try next.merge(entry) }
        self = next
    }
    public mutating func merge(_ entry: LibraryLifecycleEntry) throws {
        try entry.validate()
        if let old = entries[entry.id], old.status == .deleted || old.revision > entry.revision { return }
        if let old = entries[entry.id], old.revision == entry.revision && old != entry { throw OrganizationConnectionError.invalidResponse }
        entries[entry.id] = entry
    }
}
public struct AuthenticatedLibraryLifecycle: Sendable {
    public let connection: AuthenticatedSyncConnection
    public init(connection: AuthenticatedSyncConnection) { self.connection = connection }
    public func snapshot() async throws -> LibraryLifecycleSnapshot {
        let (data, _) = try await connection.request(path: "v1/library-lifecycle", body: nil)
        let value = try JSONDecoder().decode(LibraryLifecycleSnapshot.self, from: data); try value.validate(); return value
    }
    public func move(id: String, revision: Int, trashed: Bool) async throws -> LibraryLifecycleEntry {
        try validateID(id)
        let body = try JSONEncoder().encode(["revision": revision])
        let (data, _) = try await connection.request(path: "v1/library-lifecycle/\(id)/\(trashed ? "trash" : "restore")", body: body)
        let value = try JSONDecoder().decode(LibraryLifecycleEntry.self, from: data); try value.validate()
        guard value.id == id, value.status == (trashed ? .trashed : .active) else { throw OrganizationConnectionError.invalidResponse }; return value
    }
    public func plan(id: String) async throws -> LibraryDeletionPlan {
        try validateID(id)
        let (data, _) = try await connection.request(path: "v1/library-lifecycle/\(id)/deletion-plan", body: nil)
        let value = try JSONDecoder().decode(LibraryDeletionPlan.self, from: data); try value.validate()
        guard value.id == id else { throw OrganizationConnectionError.invalidResponse }; return value
    }
    public func erase(_ plan: LibraryDeletionPlan) async throws -> LibraryLifecycleEntry {
        try plan.validate()
        let (data, _) = try await connection.request(path: "v1/library-lifecycle/\(plan.id)/delete", body: JSONEncoder().encode(["digest": plan.digest]))
        let value = try JSONDecoder().decode(LibraryLifecycleEntry.self, from: data); try value.validate()
        guard value.id == plan.id, value.status == .deleted else { throw OrganizationConnectionError.invalidResponse }; return value
    }
    private func validateID(_ id: String) throws { guard UUID(uuidString: id)?.uuidString.lowercased() == id else { throw OrganizationConnectionError.invalidResponse } }
}

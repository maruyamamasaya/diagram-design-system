import Foundation

public enum SyncValue<Member: Codable & Equatable & Sendable>: Codable, Equatable, Sendable {
    case folder(OrganizationFolder), assignment(UUID), group(LibraryGroup), tag(String)
    case collection(ReadingCollection<Member>), order([UUID]), deleted
}
public struct SyncRecord<Member: Codable & Equatable & Sendable>: Codable, Equatable, Sendable {
    public var value: SyncValue<Member>
    public var revision: Int
    public init(value: SyncValue<Member>, revision: Int = 0) { self.value = value; self.revision = revision }
}
public struct SyncSnapshot<Member: Codable & Equatable & Sendable>: Codable, Sendable {
    public var libraryID: UUID
    public var revision = 0
    public var records: [String: SyncRecord<Member>] = [:]
    public init(libraryID: UUID) { self.libraryID = libraryID }
}
public struct SyncOperation<Member: Codable & Equatable & Sendable>: Codable, Equatable, Sendable, Identifiable {
    public let id: UUID
    public var key: String
    public var expectedRevision: Int
    public var value: SyncValue<Member>
    public init(id: UUID = UUID(), key: String, expectedRevision: Int, value: SyncValue<Member>) {
        self.id = id; self.key = key; self.expectedRevision = expectedRevision; self.value = value
    }
}
public enum SyncDisposition: String, Codable, Sendable { case accepted, conflict, invalid }
public struct SyncReceipt<Member: Codable & Equatable & Sendable>: Codable, Sendable {
    public var operation: SyncOperation<Member>
    public var disposition: SyncDisposition
    public var current: SyncRecord<Member>?
}
public struct SyncReply<Member: Codable & Equatable & Sendable>: Codable, Sendable {
    public var receipts: [SyncReceipt<Member>]
    public var snapshot: SyncSnapshot<Member>
    public init(receipts: [SyncReceipt<Member>], snapshot: SyncSnapshot<Member>) { self.receipts = receipts; self.snapshot = snapshot }
}
public enum SyncError: Error { case wrongLibrary, corruptState, invalidKey, invalidValue, nonLoopback, transport }
public protocol OrganizationSyncTransport: Sendable {
    associatedtype Member: Codable & Equatable & Sendable
    var maximumBatchesPerSync: Int { get }
    func batch(libraryID: UUID, operations: [SyncOperation<Member>]) throws -> [SyncOperation<Member>]
    func fetch(libraryID: UUID) async throws -> SyncSnapshot<Member>
    func submit(libraryID: UUID, operations: [SyncOperation<Member>]) async throws -> SyncReply<Member>
    func submit(libraryID: UUID, operations: [SyncOperation<Member>], knownSnapshot: SyncSnapshot<Member>) async throws -> SyncReply<Member>
}
public extension OrganizationSyncTransport {
    var maximumBatchesPerSync: Int { Int.max }
    func batch(libraryID: UUID, operations: [SyncOperation<Member>]) throws -> [SyncOperation<Member>] { Array(operations.prefix(500)) }
    func submit(libraryID: UUID, operations: [SyncOperation<Member>], knownSnapshot: SyncSnapshot<Member>) async throws -> SyncReply<Member> {
        try await submit(libraryID: libraryID, operations: operations)
    }
}

/// Keys encode opaque document IDs rather than guessing equality by filename or title.
public enum OrganizationSyncKey {
    public static func folder(_ id: UUID) -> String { "folder/" + id.uuidString.lowercased() }
    public static func assignment(_ id: String) -> String { "assignment/" + encoded(id) }
    public static func group(_ id: String) -> String { "group/" + encoded(id) }
    public static func tag(_ id: String, _ tag: String) -> String { "tag/" + encoded(id) + "/" + encoded(tag.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()) }
    public static func collection(_ id: UUID) -> String { "collection/" + id.uuidString.lowercased() }
    public static let order = "folder-order"
    static func encoded(_ value: String) -> String { Data(value.utf8).base64EncodedString().replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "+", with: "-") }
    static func decoded(_ value: Substring) -> String? {
        Data(base64Encoded: String(value).replacingOccurrences(of: "_", with: "/").replacingOccurrences(of: "-", with: "+")).flatMap { String(data: $0, encoding: .utf8) }
    }
}

/// A local mock authority. No credentials, cloud SDK, or production data access.
public actor LocalOrganizationSyncServer<Member: Codable & Equatable & Sendable>: OrganizationSyncTransport {
    private struct Disk: Codable {
        var schemaVersion = 1
        var snapshot: SyncSnapshot<Member>
        var receipts: [String: SyncReceipt<Member>] = [:]
    }
    private var disk: Disk
    private let memberID: @Sendable (Member) -> String
    public init(libraryID: UUID, memberID: @escaping @Sendable (Member) -> String) {
        disk = Disk(snapshot: SyncSnapshot(libraryID: libraryID)); self.memberID = memberID
    }
    public init(data: Data, memberID: @escaping @Sendable (Member) -> String) throws {
        self.memberID = memberID
        disk = try JSONDecoder().decode(Disk.self, from: data)
        guard disk.schemaVersion == 1, disk.snapshot.revision >= 0 else { throw SyncError.corruptState }
    }
    public func encoded() throws -> Data { try JSONEncoder().encode(disk) }
    public func fetch(libraryID: UUID) throws -> SyncSnapshot<Member> {
        guard libraryID == disk.snapshot.libraryID else { throw SyncError.wrongLibrary }; return disk.snapshot
    }
    public func submit(libraryID: UUID, operations: [SyncOperation<Member>]) throws -> SyncReply<Member> {
        guard libraryID == disk.snapshot.libraryID else { throw SyncError.wrongLibrary }
        guard operations.count <= 500 else { throw SyncError.invalidValue }
        var identities: [UUID: SyncOperation<Member>] = [:]
        for op in operations {
            if let prior = identities[op.id] ?? disk.receipts[op.id.uuidString]?.operation, prior != op { throw SyncError.invalidValue }
            identities[op.id] = op
        }
        var receipts: [SyncReceipt<Member>] = []
        for operation in operations {
            if let receipt = disk.receipts[operation.id.uuidString] {
                guard receipt.operation == operation else { throw SyncError.invalidValue }
                receipts.append(receipt); continue
            }
            let current = disk.snapshot.records[operation.key]
            let disposition: SyncDisposition
            // Tombstoned folders/collections can never be resurrected by an old client.
            if !valid(operation) { disposition = .invalid }
            else if current?.value == operation.value { disposition = .accepted }
            else if (current?.revision ?? 0) != operation.expectedRevision { disposition = .conflict }
            else {
                disk.snapshot.revision += 1
                disk.snapshot.records[operation.key] = SyncRecord(value: operation.value, revision: disk.snapshot.revision)
                if case .deleted = operation.value, operation.key.hasPrefix("folder/") { cascadeDeletedFolder(operation.key) }
                disposition = .accepted
            }
            let receipt = SyncReceipt(operation: operation, disposition: disposition, current: disk.snapshot.records[operation.key])
            disk.receipts[operation.id.uuidString] = receipt; receipts.append(receipt)
        }
        return SyncReply(receipts: receipts, snapshot: disk.snapshot)
    }
    private func valid(_ op: SyncOperation<Member>) -> Bool {
        guard op.expectedRevision >= 0 else { return false }
        let parts = op.key.split(separator: "/", omittingEmptySubsequences: false)
        let tombstone = disk.snapshot.records[op.key]?.value == .deleted
        switch op.value {
        case .folder(let folder):
            guard op.key == OrganizationSyncKey.folder(folder.id), !tombstone, folder.iconFile == nil,
                  !folder.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, folder.name.count <= 120 else { return false }
            var parent = folder.parentID, seen: Set<UUID> = [folder.id]
            while let id = parent {
                guard seen.insert(id).inserted, case .folder(let node)? = disk.snapshot.records[OrganizationSyncKey.folder(id)]?.value else { return false }
                parent = node.parentID
            }
            return true
        case .assignment(let id):
            guard parts.count == 2, parts[0] == "assignment", let document = OrganizationSyncKey.decoded(parts[1]), !document.isEmpty else { return false }
            if case .folder? = disk.snapshot.records[OrganizationSyncKey.folder(id)]?.value { return true }; return false
        case .group:
            return parts.count == 2 && parts[0] == "group" && OrganizationSyncKey.decoded(parts[1]).map { !$0.isEmpty } == true
        case .tag(let tag):
            guard parts.count == 3, parts[0] == "tag", let id = OrganizationSyncKey.decoded(parts[1]), !id.isEmpty,
                  LibraryClassification.normalizedTags([tag]) == [tag] else { return false }
            return op.key == OrganizationSyncKey.tag(id, tag)
        case .collection(let collection):
            // Member-specific ID/type validation belongs to the caller's URL-free adapter.
            return op.key == OrganizationSyncKey.collection(collection.id) && !tombstone &&
                !collection.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && collection.title.count <= 120 &&
                !collection.members.isEmpty && collection.members.count <= 100 && Set(collection.members.map(memberID)).count == collection.members.count
        case .order(let ids):
            return op.key == OrganizationSyncKey.order && Set(ids).count == ids.count && ids.allSatisfy { id in
                if case .folder? = disk.snapshot.records[OrganizationSyncKey.folder(id)]?.value { return true }; return false
            }
        case .deleted:
            if parts.count == 2, let id = UUID(uuidString: String(parts[1])) {
                if parts[0] == "folder" { return op.key == OrganizationSyncKey.folder(id) }
                if parts[0] == "collection" { return op.key == OrganizationSyncKey.collection(id) }
            }
            if parts.count == 2, let id = OrganizationSyncKey.decoded(parts[1]), !id.isEmpty {
                if parts[0] == "assignment" { return op.key == OrganizationSyncKey.assignment(id) }
                if parts[0] == "group" { return op.key == OrganizationSyncKey.group(id) }
            }
            if parts.count == 3, parts[0] == "tag", let id = OrganizationSyncKey.decoded(parts[1]), !id.isEmpty,
               let tag = OrganizationSyncKey.decoded(parts[2]), !tag.isEmpty { return op.key == OrganizationSyncKey.tag(id, tag) }
            return false
        }
    }
    private func cascadeDeletedFolder(_ key: String) {
        var deleted: Set<String> = [key], again = true
        while again {
            again = false
            for (key, record) in disk.snapshot.records {
                if case .folder(let folder) = record.value, let parent = folder.parentID, deleted.contains(OrganizationSyncKey.folder(parent)) {
                    disk.snapshot.records[key] = SyncRecord(value: .deleted, revision: disk.snapshot.revision)
                    deleted.insert(key); again = true
                }
            }
        }
        for (key, record) in disk.snapshot.records {
            if case .assignment(let id) = record.value, deleted.contains(OrganizationSyncKey.folder(id)) {
                disk.snapshot.records[key] = SyncRecord(value: .deleted, revision: disk.snapshot.revision)
            }
            if case .order(let ids) = record.value {
                disk.snapshot.records[key] = SyncRecord(value: .order(ids.filter { !deleted.contains(OrganizationSyncKey.folder($0)) }), revision: disk.snapshot.revision)
            }
        }
    }
}

/// Value type: callers serialize mutations and atomically save after editing/before sending.
public struct OrganizationSyncClient<Member: Codable & Equatable & Sendable>: Codable, Sendable {
    public let libraryID: UUID
    public private(set) var baseline: SyncSnapshot<Member>
    public private(set) var pending: [SyncOperation<Member>] = []
    public private(set) var conflicts: [SyncReceipt<Member>] = []
    private var schemaVersion = 1
    public init(libraryID: UUID) { self.libraryID = libraryID; baseline = SyncSnapshot(libraryID: libraryID) }
    public var records: [String: SyncRecord<Member>] {
        var result = baseline.records
        for op in pending { result[op.key] = SyncRecord(value: op.value, revision: result[op.key]?.revision ?? 0) }
        return result
    }
    /// Unsent edits on one key are compacted; an uncertain sent operation retains its exact ID/payload.
    public mutating func edit(key: String, value: SyncValue<Member>) {
        let previous = pending.last { $0.key == key }
        let expected = previous?.expectedRevision ?? baseline.records[key]?.revision ?? 0
        let operation = SyncOperation(key: key, expectedRevision: expected, value: value)
        if let index = pending.firstIndex(where: { $0.key == key }) { pending[index] = operation }
        else { pending.append(operation) }
        conflicts.removeAll { $0.operation.key == key }
    }
    public mutating func synchronize<T: OrganizationSyncTransport>(with transport: T) async throws where T.Member == Member {
        // Parent creation must precede children and assignments, even after offline edits.
        var folders = pending.filter { if case .folder = $0.value { return true }; return false }
        var ordered: [SyncOperation<Member>] = []
        while !folders.isEmpty {
            let ready = folders.filter { op in
                guard case .folder(let folder) = op.value, let parent = folder.parentID else { return true }
                return !folders.contains { $0.key == OrganizationSyncKey.folder(parent) }
            }
            if ready.isEmpty { ordered += folders; break } // invalid cycles get explicit rejection receipts
            ordered += ready
            let ids = Set(ready.map(\.id)); folders.removeAll { ids.contains($0.id) }
        }
        ordered += pending.filter { op in if case .folder = op.value { return false }; return true }
        pending = ordered
        var sentBatches = 0
        repeat {
            let batch = try transport.batch(libraryID: libraryID, operations: pending)
            guard pending.isEmpty || !batch.isEmpty, batch == Array(pending.prefix(batch.count)) else { throw SyncError.invalidValue }
            let reply = try await transport.submit(libraryID: libraryID, operations: batch, knownSnapshot: baseline)
            guard reply.snapshot.libraryID == libraryID else { throw SyncError.wrongLibrary }
            guard reply.snapshot.revision >= baseline.revision,
                  reply.receipts.count == batch.count,
                  Set(reply.receipts.map { $0.operation.id }).count == batch.count,
                  reply.receipts.allSatisfy({ receipt in batch.contains(receipt.operation) }) else { throw SyncError.corruptState }
            baseline = reply.snapshot
            conflicts += reply.receipts.filter { $0.disposition != .accepted }
            pending.removeFirst(batch.count); sentBatches += 1
        } while !pending.isEmpty && sentBatches < transport.maximumBatchesPerSync
    }

    /// Keeping remote drops only the conflicted local proposal; retaining local needs a fresh operation.
    public mutating func resolve(key: String, keepingLocal: Bool) {
        guard let conflict = conflicts.last(where: { $0.operation.key == key }) else { return }
        conflicts.removeAll { $0.operation.key == key }
        if keepingLocal { edit(key: key, value: conflict.operation.value) }
    }
    public func save(to url: URL) throws {
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(self).write(to: url, options: .atomic)
    }
    public static func load(from url: URL) throws -> Self {
        let value = try JSONDecoder().decode(Self.self, from: Data(contentsOf: url))
        try value.validate(); return value
    }
    public func validate() throws {
        guard schemaVersion == 1, baseline.libraryID == libraryID, baseline.revision >= 0,
              Set(pending.map(\.id)).count == pending.count,
              Set(pending.map(\.key)).count == pending.count,
              pending.allSatisfy({ $0.expectedRevision >= 0 }) else { throw SyncError.corruptState }

    }
}

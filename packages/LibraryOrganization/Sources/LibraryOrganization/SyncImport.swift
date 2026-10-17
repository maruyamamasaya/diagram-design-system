import Foundation

public enum OrganizationSyncProjection {
    /// Explicit identity conversion: callers decide which local/cloud documents are the same.
    /// No titles/paths are used for matching. Source settings are never rewritten.
    public static func records<Member>(from state: OrganizationState<Member>, documentID: (String) -> String) throws -> [String: SyncValue<Member>] {
        guard state.schemaVersion == 1 else { throw SyncError.corruptState }
        var records: [String: SyncValue<Member>] = [:]
        func insert(_ key: String, _ value: SyncValue<Member>) throws {
            guard records[key] == nil || records[key] == value else { throw SyncError.invalidValue }; records[key] = value
        }
        for var folder in state.folders {
            folder.iconFile = nil // Device-local image filenames are never synchronized.
            try insert(OrganizationSyncKey.folder(folder.id), .folder(folder))
        }
        if let order = state.folderOrder { try insert(OrganizationSyncKey.order, .order(order)) }
        for (id, folder) in state.assignments { try insert(OrganizationSyncKey.assignment(documentID(id)), .assignment(folder)) }
        for (id, classification) in state.classifications {
            let id = documentID(id)
            try insert(OrganizationSyncKey.group(id), .group(classification.group))
            for tag in LibraryClassification.normalizedTags(classification.tags) { try insert(OrganizationSyncKey.tag(id, tag), .tag(tag)) }
        }
        for collection in state.collections { try insert(OrganizationSyncKey.collection(collection.id), .collection(collection)) }
        return records
    }
    public static func state<Member>(from records: [String: SyncRecord<Member>]) -> OrganizationState<Member> {
        var state = OrganizationState<Member>()
        for record in records.values {
            if case .folder(let folder) = record.value { state.folders.append(folder) }
            if case .collection(let collection) = record.value { state.collections.append(collection) }
            if case .order(let order) = record.value { state.folderOrder = order }
        }
        let folders = Set(state.folders.map(\.id))
        for (key, record) in records.sorted(by: { $0.key < $1.key }) {
            let parts = key.split(separator: "/")
            guard parts.count >= 2, let id = OrganizationSyncKey.decoded(parts[1]) else { continue }
            switch record.value {
            case .assignment(let folder) where folders.contains(folder): state.assignments[id] = folder
            case .group(let group):
                var value = state.classifications[id] ?? LibraryClassification(); value.group = group; state.classifications[id] = value
            case .tag(let tag):
                var value = state.classifications[id] ?? LibraryClassification(); value.tags.append(tag); state.classifications[id] = value
            default: break
            }
        }
        state.folderOrder = state.folderOrder?.filter(folders.contains)
        state.folders.sort { $0.id.uuidString < $1.id.uuidString }
        state.collections.sort { $0.id.uuidString < $1.id.uuidString }
        return state
    }
}

public struct OrganizationImportConflict<Member: Codable & Equatable & Sendable>: Codable, Sendable {
    public var key: String
    public var existing: SyncValue<Member>
    public var incoming: SyncValue<Member>
}
public struct OrganizationImportPlan<Member: Codable & Equatable & Sendable>: Codable, Sendable {
    public private(set) var values: [String: SyncValue<Member>]
    public private(set) var conflicts: [OrganizationImportConflict<Member>] = []
    public init(existing: [String: SyncValue<Member>], incoming: [String: SyncValue<Member>]) {
        values = existing
        for (key, value) in incoming.sorted(by: { $0.key < $1.key }) {
            if let old = values[key], old != value {
                // Same normalized tag, different capitalization: preserve existing display spelling.
                if case .tag = old, case .tag = value { continue }
                conflicts.append(OrganizationImportConflict(key: key, existing: old, incoming: value))
            } else { values[key] = value }
        }
    }
    public mutating func resolve(key: String, useIncoming: Bool) {
        guard let conflict = conflicts.first(where: { $0.key == key }) else { return }
        values[key] = useIncoming ? conflict.incoming : conflict.existing
        conflicts.removeAll { $0.key == key }
    }
    /// Call only after review; no server/client changes while initial conflicts remain.
    public func enqueue(into client: inout OrganizationSyncClient<Member>) throws {
        guard conflicts.isEmpty else { throw SyncError.invalidValue }
        // Import parents before children, assignments/order after folders.
        var remaining = values
        var available = Set(client.records.compactMap { key, record in ifCaseFolder(record.value) ? key : nil })
        while remaining.contains(where: { ifCaseFolder($0.value) }) {
            let ready = remaining.filter { _, value in
                guard case .folder(let folder) = value else { return false }
                return folder.parentID.map { available.contains(OrganizationSyncKey.folder($0)) } ?? true
            }.sorted { $0.key < $1.key }
            guard !ready.isEmpty else { throw SyncError.invalidValue }
            for (key, _) in ready { available.insert(key); remaining.removeValue(forKey: key) }
        }
        // Recompute after validation so a bad hierarchy never leaves a partial local outbox.
        remaining = values
        var copy = client
        while !remaining.isEmpty {
            let ready = remaining.filter { _, value in
                guard case .folder(let folder) = value else { return !remaining.contains { ifCaseFolder($0.value) } }
                return folder.parentID.map { parent in
                    if case .folder? = copy.records[OrganizationSyncKey.folder(parent)]?.value { return true }; return false
                } ?? true
            }.sorted { $0.key < $1.key }
            guard !ready.isEmpty else { throw SyncError.invalidValue }
            for (key, value) in ready {
                if copy.records[key]?.value != value { copy.edit(key: key, value: value) }
                remaining.removeValue(forKey: key)
            }
        }
        client = copy
    }
}
private func ifCaseFolder<Member>(_ value: SyncValue<Member>) -> Bool {
    if case .folder = value { return true }; return false
}

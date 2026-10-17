import Foundation

/// Selection uses document IDs so new editions do not change membership.
public struct BookSelection: Sendable {
    public private(set) var ids: Set<String> = []
    public private(set) var focusedID: String?
    private var anchor: String?
    public init() {}
    public mutating func click(_ id: String, orderedIDs: [String], toggle: Bool = false, extend: Bool = false) {
        guard orderedIDs.contains(id) else { return }
        if extend, let anchor, let first = orderedIDs.firstIndex(of: anchor), let last = orderedIDs.firstIndex(of: id) {
            let range = Set(orderedIDs[min(first, last)...max(first, last)])
            ids = toggle ? ids.union(range) : range
        } else if toggle {
            if !ids.insert(id).inserted { ids.remove(id) }
            anchor = id
        } else { ids = [id]; anchor = id }
        focusedID = ids.contains(id) ? id : orderedIDs.first(where: ids.contains)
    }
    public mutating func retainVisible(_ orderedIDs: [String]) {
        ids.formIntersection(orderedIDs)
        if focusedID.map(ids.contains) != true { focusedID = orderedIDs.first(where: ids.contains) }
        if anchor.map(orderedIDs.contains) != true { anchor = focusedID }
    }
    public mutating func selectAll(_ orderedIDs: [String]) {
        ids = Set(orderedIDs); focusedID = orderedIDs.first; anchor = focusedID
    }
    public mutating func clear() { ids = []; focusedID = nil; anchor = nil }
    public func targets(for id: String) -> Set<String> { ids.contains(id) ? ids : [id] }
    public func dragPayload(for id: String) -> String {
        String(data: try! JSONEncoder().encode(targets(for: id).sorted()), encoding: .utf8)!
    }
    public static func droppedIDs(_ payloads: [String], known: Set<String>) -> Set<String> {
        Set(payloads.flatMap { payload -> [String] in
            if let data = payload.data(using: .utf8), let ids = try? JSONDecoder().decode([String].self, from: data) { return ids }
            return [payload]
        }).intersection(known)
    }
}

extension LibrarySettings {
    /// A single settings transaction moves every selected document, across all its editions.
    public mutating func moveBooks(_ ids: Set<String>, to folderID: UUID?) {
        var value = organization; value.moveBooks(ids, to: folderID)
        assignments = value.assignments
    }
}

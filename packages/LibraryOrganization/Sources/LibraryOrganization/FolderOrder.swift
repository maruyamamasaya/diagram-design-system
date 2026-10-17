import Foundation

extension OrganizationState {
    /// Preserve the old alphabetical path order until the first manual rearrangement.
    public var orderedFolders: [OrganizationFolder] {
        func path(_ folder: OrganizationFolder) -> String {
            var names = [folder.name], parent = folder.parentID, visited: Set<UUID> = [folder.id]
            while let id = parent, visited.insert(id).inserted, let node = folders.first(where: { $0.id == id }) {
                names.insert(node.name, at: 0); parent = node.parentID
            }
            return names.joined(separator: " / ")
        }
        let ranks = Dictionary((folderOrder ?? []).enumerated().map { ($0.element, $0.offset) }, uniquingKeysWith: min)
        return folders.sorted {
            let a = ranks[$0.id], b = ranks[$1.id]
            if a != b { return (a ?? Int.max) < (b ?? Int.max) }
            let lhs = path($0), rhs = path($1)
            return lhs == rhs ? $0.id.uuidString < $1.id.uuidString : lhs < rhs
        }
    }
    @discardableResult public mutating func reorderFolder(_ id: UUID, relativeTo target: UUID, after: Bool) -> Bool {
        guard id != target, folders.contains(where: { $0.id == id }), folders.contains(where: { $0.id == target }) else { return false }
        var order = orderedFolders.map(\.id)
        order.removeAll { $0 == id }
        guard let index = order.firstIndex(of: target) else { return false }
        order.insert(id, at: index + (after ? 1 : 0))
        folderOrder = order
        return true
    }
}

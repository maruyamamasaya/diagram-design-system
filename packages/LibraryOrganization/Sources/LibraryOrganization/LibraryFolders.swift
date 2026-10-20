import Foundation

/// Namespaces use ordinary folders so the existing sync wire format stays compatible.
public enum LibraryShelf: String, Sendable {
    case illustration, presentation
    public var title: String { self == .illustration ? "図解" : "プレゼン" }
    public var rootID: UUID { UUID(uuidString: self == .illustration ? "724B684D-B209-4C06-9E17-81481B52A001" : "724B684D-B209-4C06-9E17-81481B52A002")! }
    public static func isRoot(_ id: UUID) -> Bool { id == illustration.rootID || id == presentation.rootID }
}

extension OrganizationState {
    /// Old ordered sets become ordinary folder destinations. Keep their snapshots as
    /// supplemental memberships: a document may have belonged to several old sets.
    public mutating func integrateFolders() {
        if !collections.isEmpty { ensureShelf(.illustration) }
        for collection in collections where !folders.contains(where: { $0.id == collection.id }) {
            folders.append(OrganizationFolder(id: collection.id, name: collection.title, parentID: LibraryShelf.illustration.rootID))
        }
    }
    /// Split the former shared tree into two independent trees, including empty folders.
    /// Keep original IDs for presentations and derive stable IDs for illustrations so
    /// two offline clients produce identical migrations.
    public mutating func scopeLegacyFolders(documentShelf: (String) -> LibraryShelf) {
        integrateFolders()
        let scoped = descendants(of: LibraryShelf.illustration.rootID).union(descendants(of: LibraryShelf.presentation.rootID))
        let legacy = folders.filter { !scoped.contains($0.id) }
        func copyID(_ id: UUID) -> UUID {
            var bytes = id.uuid; bytes.0 ^= 0x80
            return UUID(uuid: bytes)
        }
        // Metadata for offline documents can arrive after the tree was split.
        let illustrationIDs = descendants(of: LibraryShelf.illustration.rootID)
        let presentationIDs = descendants(of: LibraryShelf.presentation.rootID)
        for (id, folder) in assignments where presentationIDs.contains(folder) && illustrationIDs.contains(copyID(folder)) && documentShelf(id) == .illustration {
            assignments[id] = copyID(folder)
        }
        guard !legacy.isEmpty else { return }
        ensureShelf(.illustration); ensureShelf(.presentation)
        let ids = Set(legacy.map(\.id))
        for folder in legacy {
            if let index = folders.firstIndex(where: { $0.id == folder.id }) {
                folders[index].parentID = folder.parentID.flatMap { ids.contains($0) ? $0 : nil } ?? LibraryShelf.presentation.rootID
            }
            let id = copyID(folder.id)
            if !folders.contains(where: { $0.id == id }) {
                var copy = folder; copy.id = id
                copy.parentID = folder.parentID.flatMap { ids.contains($0) ? copyID($0) : nil } ?? LibraryShelf.illustration.rootID
                folders.append(copy)
            }
        }
        for (id, folder) in assignments where ids.contains(folder) && documentShelf(id) == .illustration { assignments[id] = copyID(folder) }
        if let order = folderOrder {
            folderOrder = order.flatMap { ids.contains($0) ? [$0, copyID($0)] : [$0] }
        }
    }
    public mutating func ensureShelf(_ shelf: LibraryShelf) {
        if !folders.contains(where: { $0.id == shelf.rootID }) { folders.append(OrganizationFolder(id: shelf.rootID, name: shelf.title)) }
    }
    @discardableResult public mutating func createFolder(name: String, shelf: LibraryShelf, parentID: UUID? = nil) -> UUID {
        integrateFolders(); ensureShelf(shelf)
        let folder = OrganizationFolder(name: name, parentID: parentID ?? shelf.rootID)
        folders.append(folder); return folder.id
    }
    public func folders(in shelf: LibraryShelf) -> [OrganizationFolder] {
        var state = self; state.integrateFolders()
        let other: LibraryShelf = shelf == .illustration ? .presentation : .illustration
        let excluded = state.descendants(of: other.rootID)
        return state.orderedFolders.filter { !LibraryShelf.isRoot($0.id) && !excluded.contains($0.id) }
    }
    public func containsDocument(_ id: String, in folder: UUID, memberID: (Member) -> String) -> Bool {
        let children = descendants(of: folder)
        if assignments[id].map(children.contains) == true { return true }
        return collections.contains { children.contains($0.id) && $0.members.contains { memberID($0).lowercased() == id.lowercased() } }
    }
    public func isFiled(_ id: String, memberID: (Member) -> String) -> Bool {
        assignments[id].map { destination in !LibraryShelf.isRoot(destination) && folders.contains(where: { $0.id == destination }) } == true || collections.contains { $0.members.contains { memberID($0).lowercased() == id.lowercased() } }
    }
    public mutating func moveDocuments(_ ids: Set<String>, to folder: UUID?, memberID: (Member) -> String) {
        integrateFolders()
        let destination = folder.flatMap { LibraryShelf.isRoot($0) ? nil : $0 }
        guard destination == nil || folders.contains(where: { $0.id == destination }) else { return }
        let keys = Set(ids.map { $0.lowercased() })
        for index in collections.indices where collections[index].id != destination {
            collections[index].members.removeAll { keys.contains(memberID($0).lowercased()) }
        }
        collections.removeAll { $0.members.isEmpty }
        moveBooks(ids, to: destination)
    }
    public mutating func removeIntegratedFolder(_ id: UUID) {
        integrateFolders()
        let removed = descendants(of: id)
        collections.removeAll { removed.contains($0.id) }
        removeFolder(id)
    }
}

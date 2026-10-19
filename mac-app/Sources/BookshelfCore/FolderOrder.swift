import Foundation
import LibraryOrganization
extension LibrarySettings {
    public var organization: OrganizationState<BookReference> {
        var value = OrganizationState<BookReference>()
        value.folders = folders; value.folderOrder = folderOrder; value.assignments = assignments; value.collections = collections; value.integrateFolders()
        return value
    }
    public var orderedFolders: [ShelfFolder] { organization.orderedFolders }
    @discardableResult public mutating func reorderFolder(_ id: UUID, relativeTo target: UUID, after: Bool) -> Bool {
        var value = organization
        guard value.reorderFolder(id, relativeTo: target, after: after) else { return false }
        folderOrder = value.folderOrder; return true
    }
}

extension LibrarySettings {
    public mutating func createFolder(name: String, shelf: LibraryShelf, parentID: UUID? = nil) {
        var value = organization
        _ = value.createFolder(name: name, shelf: shelf, parentID: parentID)
        folders = value.folders
    }
}

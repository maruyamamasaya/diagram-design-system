import Foundation
import LibraryOrganization
extension LibrarySettings {
    var organization: OrganizationState<String> {
        var value = OrganizationState<String>()
        value.folders = folders; value.folderOrder = folderOrder; value.assignments = assignments
        return value
    }
    public var orderedFolders: [ShelfFolder] { organization.orderedFolders }
    @discardableResult public mutating func reorderFolder(_ id: UUID, relativeTo target: UUID, after: Bool) -> Bool {
        var value = organization
        guard value.reorderFolder(id, relativeTo: target, after: after) else { return false }
        folderOrder = value.folderOrder; return true
    }
}

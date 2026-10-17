import XCTest
@testable import BookshelfCore

final class FolderOrderTests: XCTestCase {
    func testMoveUpDownAndPersistWithoutChangingFoldersOrAssignments() throws {
        let a = ShelfFolder(name: "A"), b = ShelfFolder(name: "B"), c = ShelfFolder(name: "C")
        var state = LibrarySettings(); state.folders = [c, a, b]; state.assignments = ["book": b.id]
        XCTAssertEqual(state.orderedFolders.map(\.id), [a.id, b.id, c.id])
        XCTAssertTrue(state.reorderFolder(c.id, relativeTo: a.id, after: false))
        XCTAssertEqual(state.orderedFolders.map(\.id), [c.id, a.id, b.id])
        XCTAssertTrue(state.reorderFolder(c.id, relativeTo: b.id, after: true))
        XCTAssertEqual(state.orderedFolders.map(\.id), [a.id, b.id, c.id])
        XCTAssertTrue(state.reorderFolder(b.id, relativeTo: a.id, after: false))
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".json")
        defer { try? FileManager.default.removeItem(at: url) }
        try state.save(to: url); let restored = try LibrarySettings.load(from: url)
        XCTAssertEqual(restored.orderedFolders.map(\.id), [b.id, a.id, c.id])
        XCTAssertEqual(restored.folders, [c, a, b]); XCTAssertEqual(restored.assignments, ["book": b.id])
    }
    func testNewDeletedAndNestedFoldersKeepIdentityAndHierarchy() {
        let parent = ShelfFolder(name: "Parent"), other = ShelfFolder(name: "Other")
        var child = ShelfFolder(name: "Child", parentID: parent.id); child.iconFile = "example.png"
        var state = LibrarySettings(); state.folders = [parent, child, other]
        state.reorderFolder(child.id, relativeTo: other.id, after: false)
        XCTAssertEqual(state.orderedFolders.first?.id, child.id)
        XCTAssertEqual(state.folders.first(where: { $0.id == child.id })?.parentID, parent.id)
        XCTAssertEqual(state.folders.first(where: { $0.id == child.id })?.iconFile, "example.png")
        let added = ShelfFolder(name: "AAA"); state.folders.append(added)
        XCTAssertEqual(state.orderedFolders.last?.id, added.id)
        state.removeFolder(parent.id)
        XCTAssertFalse(state.folderOrder?.contains(child.id) ?? true)
        XCTAssertEqual(Set(state.orderedFolders.map(\.id)), [other.id, added.id])
    }
    func testRejectUnknownOrSelfAndReadsLegacySettings() throws {
        let a = ShelfFolder(name: "A"), b = ShelfFolder(name: "B")
        var state = LibrarySettings(); state.folders = [b, a]
        XCTAssertFalse(state.reorderFolder(a.id, relativeTo: a.id, after: true))
        XCTAssertFalse(state.reorderFolder(UUID(), relativeTo: b.id, after: true))
        XCTAssertNil(state.folderOrder)
        let data = try JSONEncoder().encode(state)
        XCTAssertNil(try JSONDecoder().decode(LibrarySettings.self, from: data).folderOrder)
        XCTAssertEqual(state.orderedFolders.map(\.id), [a.id, b.id])
    }
}

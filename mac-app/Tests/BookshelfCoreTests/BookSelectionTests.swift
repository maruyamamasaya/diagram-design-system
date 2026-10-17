import XCTest
@testable import BookshelfCore

final class BookSelectionTests: XCTestCase {
    let order = ["a", "b", "c", "d"]
    func testToggleRangeAndHiddenSelection() {
        var selection = BookSelection()
        selection.click("a", orderedIDs: order)
        selection.click("c", orderedIDs: order, toggle: true)
        XCTAssertEqual(selection.ids, ["a", "c"])
        selection.click("d", orderedIDs: order, extend: true)
        XCTAssertEqual(selection.ids, ["c", "d"])
        selection.click("a", orderedIDs: order, toggle: true, extend: true)
        XCTAssertEqual(selection.ids, Set(order))
        selection.retainVisible(["b", "c"])
        XCTAssertEqual(selection.ids, ["b", "c"])
        XCTAssertTrue(selection.focusedID.map(selection.ids.contains) == true)
        selection.click("b", orderedIDs: ["b", "c"], toggle: true)
        XCTAssertEqual(selection.ids, ["c"])
        selection.clear(); XCTAssertTrue(selection.ids.isEmpty)
    }
    func testBatchDragAndUnselectedContextTarget() {
        var selection = BookSelection(); selection.selectAll(["a", "b"])
        XCTAssertEqual(selection.targets(for: "c"), ["c"])
        XCTAssertEqual(BookSelection.droppedIDs([selection.dragPayload(for: "a")], known: Set(order)), ["a", "b"])
        XCTAssertEqual(BookSelection.droppedIDs(["a", "untrusted", "[\"b\",\"missing\"]"], known: Set(order)), ["a", "b"])
    }
    func testBatchMovePersistsAndUnfilesOnlyTargets() throws {
        var state = LibrarySettings(); let folder = ShelfFolder(name: "まとめ先")
        state.folders = [folder]; state.assignments = ["d": folder.id]
        state.moveBooks(["a", "b", "c"], to: folder.id)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".json")
        defer { try? FileManager.default.removeItem(at: url) }
        try state.save(to: url); state = try LibrarySettings.load(from: url)
        XCTAssertEqual(state.assignments.count, 4)
        state.moveBooks(["a", "c"], to: nil)
        XCTAssertNil(state.assignments["a"]); XCTAssertNil(state.assignments["c"])
        XCTAssertEqual(state.assignments["b"], folder.id); XCTAssertEqual(state.assignments["d"], folder.id)
        state.moveBooks(["b"], to: UUID()); XCTAssertEqual(state.assignments["b"], folder.id)
    }
}

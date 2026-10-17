import XCTest
import AppKit
import BookshelfCore
@testable import Bookshelf

@MainActor final class MockDrag: NSObject, NSDraggingInfo {
    var draggingDestinationWindow: NSWindow? { nil }
    var draggingSourceOperationMask: NSDragOperation { .move }
    var draggingLocation: NSPoint { .zero }
    var draggedImageLocation: NSPoint { .zero }
    nonisolated var draggedImage: NSImage? { nil }
    let draggingPasteboard = NSPasteboard.withUniqueName()
    var draggingSource: Any?
    var draggingSequenceNumber: Int { 1 }
    var draggingFormation: NSDraggingFormation = .none
    var animatesToDestination = false
    var numberOfValidItemsForDrop = 1
    var springLoadingHighlight: NSSpringLoadingHighlight { .none }
    func slideDraggedImage(to screenPoint: NSPoint) {}
    override nonisolated func namesOfPromisedFilesDropped(atDestination dropDestination: URL) -> [String]? { nil }
    func resetSpringLoading() {}
    func enumerateDraggingItems(options enumOpts: NSDraggingItemEnumerationOptions, for view: NSView?, classes classArray: [AnyClass], searchOptions: [NSPasteboard.ReadingOptionKey: Any], using block: (NSDraggingItem, Int, UnsafeMutablePointer<ObjCBool>) -> Void) {}
}
final class DragTests: XCTestCase {
    @MainActor func testFolderMouseDragReordersOnReleaseAndCancelsWithoutMoving() async throws {
        _ = NSApplication.shared
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 300, height: 300), styleMask: [.titled], backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        defer { window.close() }
        let source = FolderDropView(frame: NSRect(x: 0, y: 30, width: 200, height: 26)); source.folderID = UUID()
        let target = FolderDropView(frame: NSRect(x: 0, y: 100, width: 200, height: 26)); target.folderID = UUID()
        window.contentView?.addSubview(source); window.contentView?.addSubview(target)
        var moves = 0; var clicked = 0; var after: Bool?
        source.select = { clicked += 1 }
        target.reorder = { id, position in
            XCTAssertEqual(id, source.folderID); moves += 1; after = position; return true
        }
        func event(_ type: NSEvent.EventType, _ y: CGFloat) throws -> NSEvent {
            try XCTUnwrap(NSEvent.mouseEvent(with: type, location: NSPoint(x: 80, y: y), modifierFlags: [], timestamp: 0, windowNumber: window.windowNumber, context: nil, eventNumber: 0, clickCount: 1, pressure: 1))
        }
        source.mouseDown(with: try event(.leftMouseDown, 40))
        source.mouseDragged(with: try event(.leftMouseDragged, 120))
        XCTAssertEqual(moves, 0)
        source.mouseUp(with: try event(.leftMouseUp, 120))
        XCTAssertEqual(moves, 1); XCTAssertEqual(after, false); XCTAssertEqual(clicked, 0)
        source.mouseDown(with: try event(.leftMouseDown, 40))
        source.mouseDragged(with: try event(.leftMouseDragged, 105))
        source.cancelOperation(nil)
        source.mouseUp(with: try event(.leftMouseUp, 105))
        XCTAssertEqual(moves, 1); XCTAssertEqual(clicked, 0)
        source.mouseDown(with: try event(.leftMouseDown, 40))
        source.mouseUp(with: try event(.leftMouseUp, 40))
        XCTAssertEqual(clicked, 1)
    }
    @MainActor func testCardMouseDragMovesFullSelectionOnlyOnRelease() async throws {
        _ = NSApplication.shared
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 500, height: 300), styleMask: [.titled], backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        defer { window.close() }
        let source = CardMouseView(frame: NSRect(x: 250, y: 30, width: 200, height: 200))
        let target = FolderDropView(frame: NSRect(x: 10, y: 100, width: 200, height: 26))
        window.contentView?.addSubview(source); window.contentView?.addSubview(target)
        var selection = BookSelection(); selection.selectAll(["a", "b"])
        source.payload = { selection.dragPayload(for: "a") }
        var received: [String] = []; var clicks = 0
        source.click = { _, _ in clicks += 1 }
        target.receive = { received.append($0); return true }
        func event(_ type: NSEvent.EventType, _ x: CGFloat, _ y: CGFloat) throws -> NSEvent {
            try XCTUnwrap(NSEvent.mouseEvent(with: type, location: NSPoint(x: x, y: y), modifierFlags: [], timestamp: 0, windowNumber: window.windowNumber, context: nil, eventNumber: 0, clickCount: 1, pressure: 1))
        }
        source.mouseDown(with: try event(.leftMouseDown, 300, 100))
        source.mouseDragged(with: try event(.leftMouseDragged, 80, 112))
        XCTAssertTrue(received.isEmpty)
        source.mouseUp(with: try event(.leftMouseUp, 80, 112))
        XCTAssertEqual(received.count, 1)
        XCTAssertEqual(Set(try JSONDecoder().decode([String].self, from: Data(received[0].utf8))), ["a", "b"])
        XCTAssertEqual(selection.ids, ["a", "b"]); XCTAssertEqual(clicks, 0)
        source.mouseDown(with: try event(.leftMouseDown, 300, 100))
        source.mouseDragged(with: try event(.leftMouseDragged, 80, 112))
        source.cancelOperation(nil)
        source.mouseUp(with: try event(.leftMouseUp, 80, 112))
        XCTAssertEqual(received.count, 1)
        source.mouseDown(with: try event(.leftMouseDown, 300, 100))
        source.mouseDragged(with: try event(.leftMouseDragged, 80, 112))
        source.mouseUp(with: try event(.leftMouseUp, 220, 200))
        XCTAssertEqual(received.count, 1)
        source.mouseDown(with: try event(.leftMouseDown, 300, 100))
        source.mouseUp(with: try event(.leftMouseUp, 300, 100))
        XCTAssertEqual(clicks, 1)
    }
    @MainActor func testUnfiledDropClearsOnlySelectedAssignmentsAndRejectsFolderReorder() async throws {
        let folder = ShelfFolder(name: "保持するフォルダ")
        var state = LibrarySettings(); state.folders = [folder]
        state.moveBooks(["a", "b", "c"], to: folder.id)
        let target = FolderDropView() // nil folder ID represents the fixed Unfiled row.
        target.receive = { payload in
            let ids = BookSelection.droppedIDs([payload], known: ["a", "b", "c"])
            state.moveBooks(ids, to: nil); return !ids.isEmpty
        }
        let drag = MockDrag(); drag.draggingSource = CardMouseView()
        drag.draggingPasteboard.setString("[\"a\",\"b\"]", forType: .string)
        XCTAssertEqual(target.draggingEntered(drag), .move)
        XCTAssertTrue(target.performDragOperation(drag))
        XCTAssertEqual(state.assignments, ["c": folder.id])
        XCTAssertEqual(state.folders.map(\.id), [folder.id])
        let source = FolderDropView(); source.folderID = folder.id
        drag.draggingSource = source
        drag.draggingPasteboard.setString(folder.id.uuidString, forType: folderDragType)
        XCTAssertEqual(target.draggingEntered(drag), [])
        XCTAssertFalse(target.performDragOperation(drag))
        drag.draggingPasteboard.releaseGlobally()
    }
    @MainActor func testNativeDropMovesSelectedIDsTogether() async throws {
        let source = CardMouseView(frame: NSRect(x: 0, y: 0, width: 200, height: 200))
        var selection = BookSelection(); selection.selectAll(["a", "b"])
        source.payload = { selection.dragPayload(for: "a") }
        let drag = MockDrag(); drag.draggingSource = source
        drag.draggingPasteboard.setString(source.payload(), forType: .string)
        var state = LibrarySettings(); let folder = ShelfFolder(name: "移動先"); state.folders = [folder]
        let target = FolderDropView(frame: NSRect(x: 0, y: 0, width: 200, height: 24))
        target.receive = { payload in
            let ids = BookSelection.droppedIDs([payload], known: ["a", "b", "c"])
            state.moveBooks(ids, to: folder.id); return !ids.isEmpty
        }
        XCTAssertEqual(target.draggingEntered(drag), .move)
        XCTAssertTrue(target.prepareForDragOperation(drag))
        XCTAssertTrue(target.performDragOperation(drag))
        XCTAssertEqual(state.assignments, ["a": folder.id, "b": folder.id])
        XCTAssertEqual(selection.ids, ["a", "b"])
        XCTAssertEqual(target.draggingUpdated(drag), [])
        drag.draggingPasteboard.releaseGlobally()
    }
    @MainActor func testFolderDragUsesInsertionAndNeverMovesDocuments() async {
        let source = FolderDropView(); source.folderID = UUID()
        let target = FolderDropView(frame: NSRect(x: 0, y: 0, width: 200, height: 24)); target.folderID = UUID()
        let drag = MockDrag(); drag.draggingSource = source
        drag.draggingPasteboard.setString(source.folderID!.uuidString, forType: folderDragType)
        var movedID: UUID?; var afterTarget: Bool?; var documentReceive = false
        target.reorder = { id, after in movedID = id; afterTarget = after; return true }
        target.receive = { _ in documentReceive = true; return true }
        XCTAssertEqual(target.draggingEntered(drag), .move)
        // Hover-end notifications can arrive before the drop is prepared.
        target.draggingEnded(drag)
        XCTAssertTrue(target.prepareForDragOperation(drag))
        XCTAssertTrue(target.performDragOperation(drag))
        XCTAssertEqual(movedID, source.folderID); XCTAssertEqual(afterTarget, true)
        XCTAssertFalse(documentReceive)
        drag.draggingSource = target
        XCTAssertEqual(target.draggingEntered(drag), [])
        drag.draggingSource = NSObject()
        XCTAssertEqual(target.draggingEntered(drag), [])
        drag.draggingPasteboard.releaseGlobally()
    }
    @MainActor func testRejectsExternalDragAndClearsCancelledHover() async {
        let drag = MockDrag(); drag.draggingSource = NSObject()
        drag.draggingPasteboard.setString("[\"a\"]", forType: .string)
        let target = FolderDropView()
        var called = false; target.receive = { _ in called = true; return true }
        XCTAssertEqual(target.draggingEntered(drag), [])
        XCTAssertFalse(target.performDragOperation(drag)); XCTAssertFalse(called)
        let source = CardMouseView(); drag.draggingSource = source
        XCTAssertEqual(target.draggingEntered(drag), .move)
        target.draggingExited(drag)
        XCTAssertEqual(target.draggingUpdated(drag), [])
        XCTAssertEqual(target.draggingEntered(drag), .move)
        target.draggingEnded(drag)
        XCTAssertEqual(target.draggingUpdated(drag), [])
        drag.draggingPasteboard.releaseGlobally()
    }
}

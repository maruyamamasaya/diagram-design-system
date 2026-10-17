import AppKit
import SwiftUI

let folderDragType = NSPasteboard.PasteboardType("jp.local.zukan.bookshelf.folder")

struct FolderDropSurface: NSViewRepresentable {
    var folderID: UUID? = nil
    var folderTitle: String = "フォルダ"
    var reorder: (UUID, Bool) -> Bool = { _, _ in false }
    var menu: () -> NSMenu = { NSMenu() }
    var select: () -> Void
    var receive: (String) -> Bool
    func makeNSView(context: Context) -> FolderDropView {
        let view = FolderDropView(); view.registerForDraggedTypes([.string, folderDragType]); return view
    }
    func updateNSView(_ view: FolderDropView, context: Context) { view.folderID = folderID; view.folderTitle = folderTitle; view.reorder = reorder; view.contextMenu = menu; view.select = select; view.receive = receive }
}
final class FolderDropView: NSView, NSDraggingSource {
    var folderID: UUID?
    var folderTitle = "フォルダ"
    var reorder: (UUID, Bool) -> Bool = { _, _ in false }
    private var insertionAfter: Bool?
    var contextMenu: () -> NSMenu = { NSMenu() }
    override func menu(for event: NSEvent) -> NSMenu? { contextMenu() }
    var select: () -> Void = {}
    var receive: (String) -> Bool = { _ in false }
    private var highlighted = false { didSet { needsDisplay = true } }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
    private static let rows = NSHashTable<FolderDropView>.weakObjects()
    static func documentTarget(at point: NSPoint, in window: NSWindow) -> FolderDropView? {
        rows.allObjects.filter {
            $0.window === window && !$0.isHiddenOrHasHiddenAncestor &&
            $0.convert($0.bounds, to: nil).insetBy(dx: 0, dy: -4).contains(point)
        }.min { abs($0.convert($0.bounds, to: nil).midY - point.y) < abs($1.convert($1.bounds, to: nil).midY - point.y) }
    }
    func highlightDocuments(_ active: Bool) { insertionAfter = nil; highlighted = active }
    private var press: NSEvent?
    private var dragging = false
    private weak var folderDragTarget: FolderDropView?
    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        if window != nil { Self.rows.add(self) } else { Self.rows.remove(self) }
    }
    override func mouseDown(with event: NSEvent) { press = event; dragging = false }
    private func target(at point: NSPoint) -> FolderDropView? {
        guard let window else { return nil }
        return Self.rows.allObjects.filter { candidate in
            guard candidate !== self, candidate.folderID != nil, candidate.window === window, !candidate.isHiddenOrHasHiddenAncestor else { return false }
            return candidate.convert(candidate.bounds, to: nil).insetBy(dx: 0, dy: -4).contains(point)
        }.min {
            abs($0.convert($0.bounds, to: nil).midY - point.y) < abs($1.convert($1.bounds, to: nil).midY - point.y)
        }
    }
    private func showInsertion(at point: NSPoint) {
        let next = target(at: point)
        if next !== folderDragTarget { folderDragTarget?.highlighted = false; folderDragTarget?.insertionAfter = nil }
        folderDragTarget = next
        if let next {
            let local = next.convert(point, from: nil)
            next.insertionAfter = next.isFlipped ? local.y >= next.bounds.midY : local.y < next.bounds.midY
            next.highlighted = true
        }
    }
    override func mouseDragged(with event: NSEvent) {
        guard let press, folderID != nil,
              hypot(event.locationInWindow.x - press.locationInWindow.x, event.locationInWindow.y - press.locationInWindow.y) >= 4 else { return }
        dragging = true
        NSCursor.closedHand.set()
        showInsertion(at: event.locationInWindow)
    }
    override func mouseUp(with event: NSEvent) {
        if dragging {
            showInsertion(at: event.locationInWindow)
            if let folderID, let target = folderDragTarget, let after = target.insertionAfter { _ = target.reorder(folderID, after) }
        } else if press != nil { select() }
        folderDragTarget?.highlighted = false; folderDragTarget?.insertionAfter = nil
        folderDragTarget = nil; press = nil; dragging = false
        NSCursor.arrow.set()
    }
    override func cancelOperation(_ sender: Any?) {
        folderDragTarget?.highlighted = false; folderDragTarget?.insertionAfter = nil
        folderDragTarget = nil; press = nil; dragging = false
        NSCursor.arrow.set()
    }
    func draggingSession(_ session: NSDraggingSession, sourceOperationMaskFor context: NSDraggingContext) -> NSDragOperation { context == .withinApplication ? .move : [] }
    private func movedFolder(_ sender: NSDraggingInfo) -> UUID? {
        guard folderID != nil, let source = sender.draggingSource as? FolderDropView,
              let value = sender.draggingPasteboard.string(forType: folderDragType), let id = UUID(uuidString: value),
              source.folderID == id, id != folderID else { return nil }
        return id
    }
    private func updateInsertion(_ sender: NSDraggingInfo) {
        let point = convert(sender.draggingLocation, from: nil)
        insertionAfter = isFlipped ? point.y >= bounds.midY : point.y < bounds.midY
        needsDisplay = true
    }
    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        highlighted = false; insertionAfter = nil
        if movedFolder(sender) != nil { highlighted = true; updateInsertion(sender); return .move }
        guard sender.draggingSource is CardMouseView, sender.draggingPasteboard.string(forType: .string) != nil else { return [] }
        highlighted = true; return .move
    }
    override func draggingUpdated(_ sender: NSDraggingInfo) -> NSDragOperation {
        if movedFolder(sender) != nil { updateInsertion(sender) }
        return highlighted ? .move : []
    }
    override func draggingExited(_ sender: NSDraggingInfo?) { highlighted = false; insertionAfter = nil }
    override func draggingEnded(_ sender: NSDraggingInfo) { highlighted = false; insertionAfter = nil }
    override func concludeDragOperation(_ sender: NSDraggingInfo?) { highlighted = false; insertionAfter = nil }
    override func prepareForDragOperation(_ sender: NSDraggingInfo) -> Bool {
        movedFolder(sender) != nil || (sender.draggingSource is CardMouseView && sender.draggingPasteboard.string(forType: .string) != nil)
    }
    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        defer { highlighted = false; insertionAfter = nil }
        if let moved = movedFolder(sender) {
            updateInsertion(sender)
            return reorder(moved, insertionAfter ?? false)
        }
        guard sender.draggingSource is CardMouseView, let value = sender.draggingPasteboard.string(forType: .string) else { return false }
        return receive(value)
    }
    override func draw(_ dirtyRect: NSRect) {
        if highlighted, let after = insertionAfter {
            NSColor.controlAccentColor.setFill()
            let top = isFlipped ? bounds.minY : bounds.maxY - 2
            let bottom = isFlipped ? bounds.maxY - 2 : bounds.minY
            NSRect(x: 0, y: after ? bottom : top, width: bounds.width, height: 2).fill()
        } else if highlighted {
            NSColor.controlAccentColor.withAlphaComponent(0.25).setFill()
            NSBezierPath(roundedRect: bounds, xRadius: 5, yRadius: 5).fill()
        }
    }
}

final class FolderMenuAction: NSMenuItem {
    private let handler: () -> Void
    init(_ title: String, handler: @escaping () -> Void) {
        self.handler = handler
        super.init(title: title, action: #selector(invoke), keyEquivalent: "")
        target = self
    }
    required init(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    @objc private func invoke() { handler() }
}

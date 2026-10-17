import AppKit
import SwiftUI

/// AppKit owns the mouse tracking so a drag never first collapses the selection.
struct CardDragSurface: NSViewRepresentable {
    var payload: () -> String
    var click: (NSEvent.ModifierFlags, Int) -> Void
    func makeNSView(context: Context) -> CardMouseView { CardMouseView() }
    func updateNSView(_ view: CardMouseView, context: Context) {
        view.payload = payload; view.click = click
    }
}
final class CardMouseView: NSView, NSDraggingSource {
    var payload: () -> String = { "[]" }
    var click: (NSEvent.ModifierFlags, Int) -> Void = { _, _ in }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
    private var press: NSEvent?
    private var value: String?
    private weak var dropTarget: FolderDropView?
    override func mouseDown(with event: NSEvent) { press = event; value = nil }
    override func mouseDragged(with event: NSEvent) {
        guard let press, let window,
              hypot(event.locationInWindow.x - press.locationInWindow.x, event.locationInWindow.y - press.locationInWindow.y) >= 4 else { return }
        if value == nil { value = payload() }
        let next = FolderDropView.documentTarget(at: event.locationInWindow, in: window)
        if next !== dropTarget { dropTarget?.highlightDocuments(false) }
        dropTarget = next
        next?.highlightDocuments(true)
        let ids = (try? JSONDecoder().decode([String].self, from: Data((value ?? "[]").utf8))) ?? []
        NSCursor(image: dragImage(count: ids.count), hotSpot: NSPoint(x: 12, y: 12)).set()
    }
    private func dragImage(count: Int) -> NSImage {
        let image = NSImage(size: NSSize(width: 170, height: 52))
        image.lockFocus()
        NSColor.controlAccentColor.setFill()
        NSBezierPath(roundedRect: NSRect(x: 0, y: 0, width: 170, height: 52), xRadius: 12, yRadius: 12).fill()
        ("\(count) 冊の資料" as NSString).draw(at: NSPoint(x: 18, y: 16), withAttributes: [.font: NSFont.boldSystemFont(ofSize: 16), .foregroundColor: NSColor.white])
        image.unlockFocus()
        return image
    }
    override func mouseUp(with event: NSEvent) {
        if let value, let window {
            // Resolve at release: a stale hover must never move documents elsewhere.
            if let target = FolderDropView.documentTarget(at: event.locationInWindow, in: window) { _ = target.receive(value) }
        } else if let press { click(press.modifierFlags, press.clickCount) }
        clearDrag()
    }
    override func cancelOperation(_ sender: Any?) { clearDrag() }
    private func clearDrag() {
        dropTarget?.highlightDocuments(false)
        dropTarget = nil; press = nil; value = nil
        NSCursor.arrow.set()
    }
    func draggingSession(_ session: NSDraggingSession, sourceOperationMaskFor context: NSDraggingContext) -> NSDragOperation { context == .withinApplication ? .move : [] }
}

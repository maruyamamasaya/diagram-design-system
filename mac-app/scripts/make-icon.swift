import AppKit

// Resolution-independent AppKit artwork; coordinates use a 1024-point canvas.
func color(_ hex: UInt32) -> NSColor {
    NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
}
func roundRect(_ rect: NSRect, _ radius: CGFloat, _ fill: NSColor) {
    fill.setFill(); NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}
func draw() {
    let background = NSBezierPath(roundedRect: NSRect(x: 64, y: 64, width: 896, height: 896), xRadius: 202, yRadius: 202)
    NSGradient(starting: color(0x264F59), ending: color(0x102C35))!.draw(in: background, angle: -90)
    roundRect(NSRect(x: 169, y: 228, width: 686, height: 566), 58, color(0x10262C))
    roundRect(NSRect(x: 193, y: 250, width: 638, height: 522), 40, color(0x193B42))
    // A warm wooden frame makes the silhouette read as a bookshelf at Dock sizes.
    roundRect(NSRect(x: 161, y: 204, width: 46, height: 600), 16, color(0xD7B78A))
    roundRect(NSRect(x: 817, y: 204, width: 46, height: 600), 16, color(0xD7B78A))
    roundRect(NSRect(x: 161, y: 774, width: 702, height: 44), 16, color(0xF0D5AE))
    func book(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ hex: UInt32) {
        roundRect(NSRect(x: x + 7, y: y - 6, width: w, height: h), 10, NSColor.black.withAlphaComponent(0.17))
        roundRect(NSRect(x: x, y: y, width: w, height: h), 10, color(hex))
        roundRect(NSRect(x: x + 10, y: y + 9, width: 5, height: h - 18), 2, NSColor.white.withAlphaComponent(0.16))
        roundRect(NSRect(x: x + 20, y: y + h - 46, width: w - 34, height: 7), 3, NSColor.white.withAlphaComponent(0.65))
        roundRect(NSRect(x: x + 20, y: y + 28, width: w - 34, height: 5), 2, NSColor.white.withAlphaComponent(0.35))
    }
    book(238, 518, 94, 201, 0xEBCB8B)
    book(346, 518, 86, 228, 0xF08B6B)
    book(446, 518, 104, 182, 0xECE5D5)
    NSGraphicsContext.saveGraphicsState()
    let transform = AffineTransform(translationByX: 666, byY: 518)
    (transform as NSAffineTransform).concat()
    let rotation = AffineTransform(rotationByDegrees: 14); (rotation as NSAffineTransform).concat()
    book(0, 0, 92, 218, 0x78B3B1)
    NSGraphicsContext.restoreGraphicsState()
    book(240, 276, 106, 169, 0x78B3B1)
    book(360, 276, 83, 183, 0xECE5D5)
    book(457, 276, 94, 160, 0xD39775)
    // A pair of laid-flat folios adds a recognizable second shelf.
    roundRect(NSRect(x: 584, y: 276, width: 188, height: 53), 9, color(0xEBCB8B))
    roundRect(NSRect(x: 599, y: 291, width: 156, height: 22), 4, color(0xFFF1D7))
    roundRect(NSRect(x: 594, y: 341, width: 174, height: 51), 9, color(0xF08B6B))
    roundRect(NSRect(x: 609, y: 356, width: 142, height: 20), 4, color(0xFFE9D8))
    for y: CGFloat in [242, 488] {
        roundRect(NSRect(x: 177, y: y - 10, width: 670, height: 18), 6, NSColor.black.withAlphaComponent(0.25))
        roundRect(NSRect(x: 151, y: y, width: 722, height: 38), 12, color(0xE3C298))
        roundRect(NSRect(x: 163, y: y + 26, width: 698, height: 8), 4, color(0xF8DFB7))
    }
}
let directory = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
for (points, scale) in [(16,1),(16,2),(32,1),(32,2),(128,1),(128,2),(256,1),(256,2),(512,1),(512,2)] {
    let pixels = points * scale
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixels, pixelsHigh: pixels, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let transform = AffineTransform(scale: CGFloat(pixels) / 1024); (transform as NSAffineTransform).concat()
    draw(); NSGraphicsContext.restoreGraphicsState()
    let suffix = scale == 2 ? "@2x" : ""
    try bitmap.representation(using: .png, properties: [:])!.write(to: directory.appendingPathComponent("icon_\(points)x\(points)\(suffix).png"))
}

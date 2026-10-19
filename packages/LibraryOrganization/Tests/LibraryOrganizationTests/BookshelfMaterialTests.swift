#if os(macOS)
import XCTest
import SwiftUI
import ImageIO
import UniformTypeIdentifiers
@testable import LibraryOrganizationUI

final class BookshelfMaterialTests: XCTestCase {
    @MainActor func testMaterialPixelsContainTextureAtSidebarAndToolbarSizes() throws {
        for theme in BookshelfTheme.allCases {
            for size in [CGSize(width: 240, height: 640), CGSize(width: 900, height: 52)] {
                let renderer = ImageRenderer(content: BookshelfMaterial()
                    .environment(\.bookshelfTheme, theme)
                    .frame(width: size.width, height: size.height))
                renderer.scale = 2
                let image = try XCTUnwrap(renderer.cgImage)
                if let root = ProcessInfo.processInfo.environment["BOOKSHELF_MATERIAL_EVIDENCE"] {
                    let url = URL(fileURLWithPath: root).appendingPathComponent("\(theme.rawValue)-\(Int(size.width)).png")
                    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                    let output = try XCTUnwrap(CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil))
                    CGImageDestinationAddImage(output, image, nil)
                    XCTAssertTrue(CGImageDestinationFinalize(output))
                }
                XCTAssertEqual(image.width, Int(size.width * 2))
                XCTAssertEqual(image.height, Int(size.height * 2))
                // A missing named image still renders the panel/gradient successfully.
                // Require actual texture variation on a horizontal line, away from UI text.
                let w = image.width, h = image.height
                var pixels = [UInt8](repeating: 0, count: w * h * 4)
                try pixels.withUnsafeMutableBytes { bytes in
                    let context = try XCTUnwrap(CGContext(data: bytes.baseAddress, width: w, height: h,
                        bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue))
                    context.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
                }
                let tones = (w / 10 ..< w * 9 / 10).map { x -> Double in
                    let i = ((h / 2) * w + x) * 4
                    return (Double(pixels[i]) + Double(pixels[i + 1]) + Double(pixels[i + 2])) / 3
                }
                XCTAssertGreaterThan(try XCTUnwrap(tones.max()) - XCTUnwrap(tones.min()), 3,
                    "\(theme.rawValue), \(size): material must contain visible texture, not only a flat gradient")
            }
        }
    }
}
#endif

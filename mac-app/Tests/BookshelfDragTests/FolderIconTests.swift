import XCTest
import AppKit
import ImageIO
import BookshelfCore
@testable import Bookshelf

final class FolderIconTests: XCTestCase {
    func testCopiesAndDownsamplesImageIndependentlyOfSource() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let source = root.appendingPathComponent("original.png")
        let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 512, pixelsHigh: 256, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
        memset(bitmap.bitmapData!, 255, bitmap.bytesPerRow * bitmap.pixelsHigh)
        try bitmap.representation(using: .png, properties: [:])!.write(to: source)
        let files = FolderIconFiles(directory: root.appendingPathComponent("icons"))
        let name = try files.importImage(source)
        try FileManager.default.removeItem(at: source)
        let copiedURL = try XCTUnwrap(files.url(for: name))
        let imageSource = try XCTUnwrap(CGImageSourceCreateWithURL(copiedURL as CFURL, nil))
        let properties = try XCTUnwrap(CGImageSourceCopyPropertiesAtIndex(imageSource, 0, nil) as? [CFString: Any])
        XCTAssertEqual(properties[kCGImagePropertyPixelWidth] as? Int, 128)
        XCTAssertEqual(properties[kCGImagePropertyPixelHeight] as? Int, 64)
        XCTAssertNil(files.url(for: "../external.png"))
        files.remove(name); XCTAssertFalse(FileManager.default.fileExists(atPath: copiedURL.path))
    }
    func testBadImageDoesNotCreateAnIconAndLegacyFoldersStillLoad() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let source = root.appendingPathComponent("bad.png"); try Data("invalid".utf8).write(to: source)
        let files = FolderIconFiles(directory: root.appendingPathComponent("icons"))
        XCTAssertThrowsError(try files.importImage(source))
        XCTAssertFalse(FileManager.default.fileExists(atPath: files.directory.path))
        let folder = try JSONDecoder().decode(ShelfFolder.self, from: Data("{\"id\":\"00000000-0000-0000-0000-000000000001\",\"name\":\"既存\"}".utf8))
        XCTAssertNil(folder.iconFile)
        var state = LibrarySettings(); var custom = folder; custom.iconFile = UUID().uuidString + ".png"; state.folders = [custom]
        let url = root.appendingPathComponent("state.json"); try state.save(to: url)
        XCTAssertEqual(try LibrarySettings.load(from: url).folders.first?.iconFile, custom.iconFile)
    }
}

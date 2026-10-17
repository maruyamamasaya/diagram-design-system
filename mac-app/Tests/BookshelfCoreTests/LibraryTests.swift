import XCTest
@testable import BookshelfCore

final class LibraryTests: XCTestCase {
    func fixture(_ root: URL, version: Int, id: String = "book-1", path: String = "diagram.pdf") throws -> URL {
        let directory = root.appendingPathComponent("\(id)/versions/\(version)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        if !path.contains("..") { try Data("pdf".utf8).write(to: directory.appendingPathComponent(path)) }
        let metadata: [String: Any] = ["diagramId": id, "version": version, "title": "日本語の資料", "artifacts": [["name": path]]]
        try JSONSerialization.data(withJSONObject: metadata).write(to: directory.appendingPathComponent("metadata.json"))
        return directory
    }
    func temporary() throws -> URL {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: root) }
        return root
    }
    func testVersionsAndOverlappingRoots() throws {
        let root = try temporary(); _ = try fixture(root, version: 1); _ = try fixture(root, version: 3)
        let scan = LibraryScanner.scan(roots: [root, root.appendingPathComponent("book-1")])
        XCTAssertEqual(scan.books.count, 1); XCTAssertEqual(scan.books.first?.editions.map(\.version), [3, 1]); XCTAssertTrue(scan.warnings.isEmpty)
    }
    func testTraversalAndMissingFilesAreRejected() throws {
        let root = try temporary(); _ = try fixture(root, version: 1, path: "../outside.pdf")
        let directory = try fixture(root, version: 2, id: "missing")
        try FileManager.default.removeItem(at: directory.appendingPathComponent("diagram.pdf"))
        let scan = LibraryScanner.scan(roots: [root]); XCTAssertTrue(scan.books.isEmpty); XCTAssertEqual(scan.warnings.count, 2)
    }
    func testFolderPersistenceAndRemovalDoesNotDeleteArtifacts() throws {
        let root = try temporary(); let directory = try fixture(root, version: 1)
        let parent = ShelfFolder(name: "技術"); let child = ShelfFolder(name: "AI", parentID: parent.id)
        var state = LibrarySettings(); state.folders = [parent, child]; state.assignments = ["book-1": child.id]
        let file = root.appendingPathComponent("state.json"); try state.save(to: file)
        state = try LibrarySettings.load(from: file)
        XCTAssertEqual(state.descendants(of: parent.id), [parent.id, child.id]); XCTAssertEqual(state.assignments["book-1"], child.id)
        state.removeFolder(parent.id); XCTAssertTrue(state.folders.isEmpty); XCTAssertTrue(state.assignments.isEmpty)
        XCTAssertTrue(FileManager.default.fileExists(atPath: directory.appendingPathComponent("diagram.pdf").path))
    }
    func testStandardPackageAndDictionaryArtifacts() throws {
        let root = try temporary()
        let dir = root.appendingPathComponent("standard")
        try FileManager.default.createDirectory(at: dir.appendingPathComponent("slides/001"), withIntermediateDirectories: true)
        try Data("image".utf8).write(to: dir.appendingPathComponent("slides/001/slide.png"))
        let metadata: [String: Any] = ["presentationId": "standard", "presentationVersion": 2, "slides": [["artifacts": [["path": "slides/001/slide.png"]]]]]
        try JSONSerialization.data(withJSONObject: metadata).write(to: dir.appendingPathComponent("metadata.json"))
        let dictionaryDir = try fixture(root, version: 1, id: "dictionary")
        let dictionary: [String: Any] = ["presentationId": "dictionary", "version": 1, "slides": 12, "artifacts": ["diagram.pdf": ["bytes": 3]]]
        try JSONSerialization.data(withJSONObject: dictionary).write(to: dictionaryDir.appendingPathComponent("metadata.json"))
        let result = LibraryScanner.scan(roots: [root])
        XCTAssertEqual(result.books.count, 2); XCTAssertTrue(result.warnings.isEmpty)
        XCTAssertEqual(result.books.first(where: { $0.id == "standard" })?.latest.pageCount, 1)
        XCTAssertEqual(result.books.first(where: { $0.id == "dictionary" })?.latest.pageCount, 12)
    }
    func testActualOutputs() throws {
        guard let path = ProcessInfo.processInfo.environment["BOOKSHELF_TEST_OUTPUTS"] else { throw XCTSkip("Set BOOKSHELF_TEST_OUTPUTS for real-output scan") }
        let scan = LibraryScanner.scan(roots: [URL(fileURLWithPath: path)])
        XCTAssertGreaterThan(scan.books.count, 10)
        XCTAssertTrue(scan.books.allSatisfy { !$0.latest.files.isEmpty })
        print("REAL OUTPUTS: \(scan.books.count) books, \(scan.books.reduce(0) { $0 + $1.editions.count }) editions, \(scan.warnings.count) warnings")
        for warning in scan.warnings.prefix(8) { print(warning) }
    }
}

import XCTest
import BookshelfCore
@testable import BookshelfWatching

final class FolderWatcherTests: XCTestCase {
    @MainActor func testNestedCreationRevisionAndStop() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let created = expectation(description: "new nested package")
        let revised = expectation(description: "new version")
        let stopped = expectation(description: "no callback after stop"); stopped.isInverted = true
        var stage = 1
        let watcher = FolderWatcher(quietInterval: 0.15, maximumDelay: 1) {
            let scan = LibraryScanner.scan(roots: [root])
            if stage == 1, scan.books.first?.latest.version == 1 { stage = 2; created.fulfill() }
            else if stage == 2, scan.books.first?.latest.version == 2 { stage = 3; revised.fulfill() }
            else if stage == 4 { stopped.fulfill() }
        }
        XCTAssertTrue(watcher.watch([root]))
        func create(_ version: Int) throws {
            let dir = root.appendingPathComponent("new/versions/\(version)")
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try Data("test".utf8).write(to: dir.appendingPathComponent("diagram.pdf"))
            try JSONSerialization.data(withJSONObject: ["diagramId": "watch-test", "version": version, "title": "自動更新", "artifacts": [["name": "diagram.pdf"]]]).write(to: dir.appendingPathComponent("metadata.json"), options: .atomic)
        }
        // Allow FSEvents to establish its baseline before creating a new directory tree.
        try await Task.sleep(nanoseconds: 500_000_000)
        try create(1)
        await fulfillment(of: [created], timeout: 8)
        // Calling watch with unchanged roots must not tear down the running stream.
        XCTAssertTrue(watcher.watch([root]))
        try create(2)
        await fulfillment(of: [revised], timeout: 8)
        watcher.stop(); stage = 4; try create(3)
        await fulfillment(of: [stopped], timeout: 1.5)
    }

    @MainActor func testSwitchingRootsObservesNewSource() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let a = root.appendingPathComponent("a"), b = root.appendingPathComponent("b")
        for url in [a, b] { try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true) }
        defer { try? FileManager.default.removeItem(at: root) }
        let newRoot = expectation(description: "new root observed")
        var switched = false
        let watcher = FolderWatcher(quietInterval: 0.1, maximumDelay: 0.5) {
            // FSEvents may coalesce ancestor invalidations during stream replacement.
            // Only a real change in the newly watched tree counts as the expected update.
            if switched, FileManager.default.fileExists(atPath: b.appendingPathComponent("observed.txt").path) {
                switched = false; newRoot.fulfill()
            }
        }
        XCTAssertTrue(watcher.watch([a])); XCTAssertTrue(watcher.watch([b]))
        try await Task.sleep(nanoseconds: 500_000_000)
        try Data().write(to: a.appendingPathComponent("ignored.txt"))
        switched = true
        try Data().write(to: b.appendingPathComponent("observed.txt"))
        await fulfillment(of: [newRoot], timeout: 8)
        watcher.stop()
    }
}

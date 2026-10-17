import XCTest
import BookshelfCore
import LibraryOrganization
@testable import Bookshelf

final class SyncAdapterTests: XCTestCase {
    @MainActor func testSyncFactoryCopiesOrganizationWithoutChangingLiveLibrary() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let file = root.appendingPathComponent("library.json")
        let id = UUID().uuidString
        var settings = LibrarySettings()
        var folder = ShelfFolder(name: "保持するフォルダ"); folder.iconFile = "keep.png"
        settings.folders = [folder]; settings.assignments[id] = folder.id
        settings.setClassification(for: id, group: .work, tags: ["保持するタグ"])
        settings.sources = [SourceFolder(path: "/test/source-not-scanned")]
        try settings.save(to: file)
        let before = try Data(contentsOf: file)
        let store = ShelfStore(stateURL: file, autoRefresh: false)
        let session = store.makeSyncLab()
        XCTAssertEqual(session.state.folders, settings.folders)
        XCTAssertEqual(session.state.classifications[id]?.tags, ["保持するタグ"])
        XCTAssertEqual(session.state.assignments[id], folder.id)
        XCTAssertFalse(session.connected)
        session.edit(key: OrganizationSyncKey.group(id), value: .group(.personal)) // unavailable before explicit import
        session.clear()
        XCTAssertEqual(store.settings.assignments, settings.assignments)
        XCTAssertEqual(store.settings.classifications, settings.classifications)
        XCTAssertEqual(try Data(contentsOf: file), before)
        XCTAssertFalse(FileManager.default.fileExists(atPath: root.appendingPathComponent("sync-lab/checkpoint.json").path))
    }
}

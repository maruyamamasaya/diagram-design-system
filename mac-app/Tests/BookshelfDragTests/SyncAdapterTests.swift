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

extension SyncAdapterTests {
    @MainActor func testBoundReceiveKeepsSourceAndIconsAndCapturesOrdinaryEdits() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let file = root.appendingPathComponent("library.json")
        var settings = LibrarySettings()
        var folder = ShelfFolder(name: "ローカル"); folder.iconFile = "keep.png"
        settings.folders = [folder]; settings.sources = [SourceFolder(path: "/synthetic-only")]
        let id = UUID().uuidString
        settings.assignments[id] = folder.id
        settings.setClassification(for: id, group: .work, tags: ["元タグ"])
        try settings.save(to: file)
        let store = ShelfStore(stateURL: file, autoRefresh: false, enableTestSync: true)
        let library = UUID()
        let directory = root.appendingPathComponent("test-library-sync")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        // An imported empty session discovers normal source changes on the next sync.
        let payload: [String: Any] = ["schemaVersion": 1, "endpoint": "http://127.0.0.1:1", "client": try JSONSerialization.jsonObject(with: JSONEncoder().encode(OrganizationSyncClient<OrganizationDocument>(libraryID: library))), "imported": true, "observed": [:], "bound": true]
        try JSONSerialization.data(withJSONObject: payload).write(to: directory.appendingPathComponent("checkpoint.json"))
        let session = store.makeSyncLab()
        let server = LocalOrganizationSyncServer<OrganizationDocument>(libraryID: library, memberID: { $0.id })
        await session.synchronize(with: server)
        var peer = OrganizationSyncClient<OrganizationDocument>(libraryID: library)
        try await peer.synchronize(with: server)
        var renamed = folder; renamed.name = "受信した名前"; renamed.iconFile = nil
        peer.edit(key: OrganizationSyncKey.folder(folder.id), value: .folder(renamed))
        peer.edit(key: OrganizationSyncKey.tag(id.lowercased(), "受信タグ"), value: .tag("受信タグ"))
        try await peer.synchronize(with: server)
        await session.synchronize(with: server)
        XCTAssertEqual(store.settings.folders.first?.name, "受信した名前")
        XCTAssertEqual(store.settings.folders.first?.iconFile, "keep.png")
        XCTAssertEqual(store.settings.sources.first?.path, "/synthetic-only")
        XCTAssertEqual(store.settings.assignments[id], folder.id)
        XCTAssertTrue(store.settings.classifications[id]?.tags.contains("受信タグ") == true)
        store.change { $0.setClassification(for: id, group: .personal, tags: ["通常編集"]) }
        await session.synchronize(with: server)
        try await peer.synchronize(with: server)
        XCTAssertEqual(OrganizationSyncProjection.state(from: peer.records).classifications[id.lowercased()]?.tags, ["通常編集"])
        XCTAssertTrue(FileManager.default.fileExists(atPath: file.appendingPathExtension("before-sync").path))
    }
}

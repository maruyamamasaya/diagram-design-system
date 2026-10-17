import XCTest
@testable import LibraryOrganization
final class OrganizationTests: XCTestCase {
    struct Snapshot: Codable, Equatable, Sendable { var id: String; var version: Int; var title: String }
    func testLegacyImportRoundTripPreservesFoldersTagsAndCollectionOrder() throws {
        let id = UUID()
        let mac = """
        {"schemaVersion":1,"sources":[{"path":"/private/device"}],"folders":[{"id":"\(id)","name":"技術","iconFile":"folder.png"}],"folderOrder":["\(id)"],"assignments":{"old-ID":"\(id)"}}
        """
        let tags = #"{"old-ID":{"group":"仕事","tags":["AWS"," 読む "]}}"#
        let collections = """
        [{"id":"\(UUID())","title":"入門","members":[{"id":"b","version":2,"title":"二"},{"id":"a","version":1,"title":"一"}]}]
        """
        let state = try OrganizationState<Snapshot>.importing(macSettings: Data(mac.utf8), classifications: Data(tags.utf8), collections: Data(collections.utf8))
        let data = try JSONEncoder().encode(state)
        let copy = try OrganizationState<Snapshot>.load(data)
        XCTAssertEqual(copy.folders.first?.iconFile, "folder.png")
        XCTAssertEqual(copy.assignments["old-ID"], id)
        XCTAssertEqual(copy.classifications["old-ID"]?.tags, ["AWS", " 読む "])
        XCTAssertEqual(copy.collections.first?.members.map(\.id), ["b", "a"])
        XCTAssertFalse(String(decoding: data, as: UTF8.self).contains("/private/device"))
    }
    func testLegacyMissingIconAndOrderAndUnsupportedVersion() throws {
        let old = #"{"schemaVersion":1,"folders":[],"assignments":{}}"#
        XCTAssertNil(try OrganizationState<String>.importing(macSettings: Data(old.utf8)).folderOrder)
        XCTAssertThrowsError(try OrganizationState<String>.importing(macSettings: Data(old.replacingOccurrences(of: ":1", with: ":2").utf8)))
        XCTAssertThrowsError(try OrganizationState<String>.importing(classifications: Data("broken".utf8)))
        var state = OrganizationState<String>(); state.schemaVersion = 9
        XCTAssertThrowsError(try OrganizationState<String>.load(JSONEncoder().encode(state)))
    }
    func testCollectionStructureRejectsDuplicatesWithoutReordering() throws {
        let value = ReadingCollection(id: UUID(), title: "読む順", members: ["b", "a"])
        try value.validateStructure(memberID: { $0 })
        XCTAssertEqual(value.members, ["b", "a"])
        XCTAssertThrowsError(try ReadingCollection(id: UUID(), title: "重複", members: ["A", "a"]).validateStructure(memberID: { $0.lowercased() }))
        XCTAssertThrowsError(try ReadingCollection<String>(id: UUID(), title: "空", members: []).validateStructure(memberID: { $0 }))
    }
    func testSelectionMovesAndTagNormalization() {
        var state = OrganizationState<String>(); let folder = OrganizationFolder(name: "資料"); state.folders = [folder]
        state.moveBooks(["a", "b"], to: folder.id)
        state.moveBooks(["a"], to: nil)
        state.moveBooks(["b"], to: UUID())
        XCTAssertEqual(state.assignments, ["b": folder.id])
        XCTAssertEqual(LibraryClassification.normalizedTags([" AWS ", "aws", "", "図解"]), ["AWS", "図解"])
    }
}

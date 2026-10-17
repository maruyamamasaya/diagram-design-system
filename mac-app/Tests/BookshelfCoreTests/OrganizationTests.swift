import XCTest
import LibraryOrganization
@testable import BookshelfCore
final class OrganizationTests: XCTestCase {
    func book(_ id: String, kind: String = "illustration", tags: [String] = [], version: Int = 1) -> Book {
        Book(id: id, editions: [BookEdition(version: version, title: id, directory: URL(fileURLWithPath: "/tmp/original"), files: [URL(fileURLWithPath: "/tmp/original/diagram.pdf")], thumbnail: nil, pageCount: 1, kind: kind, tags: tags, modified: .distantPast)])
    }
    func testOldSettingsKeepFoldersSourcesAssignmentsAndEmptyOrganization() throws {
        let folder = UUID()
        let data = Data("""
        {"schemaVersion":1,"sources":[],"folders":[{"id":"\(folder)","name":"技術"}],"folderOrder":["\(folder)"],"assignments":{"a":"\(folder)"}}
        """.utf8)
        var state = try JSONDecoder().decode(LibrarySettings.self, from: data)
        XCTAssertTrue(state.classifications.isEmpty); XCTAssertTrue(state.collections.isEmpty)
        state.setClassification(for: "a", group: .work, tags: [" AWS ", "aws", "", "読む"])
        let collection = ReadingCollection(id: UUID(), title: "順番", members: [BookReference(book: book("b")), BookReference(book: book("a"))])
        try state.saveCollection(collection)
        let copy = try JSONDecoder().decode(LibrarySettings.self, from: JSONEncoder().encode(state))
        XCTAssertEqual(copy.folders.first?.id, folder); XCTAssertEqual(copy.assignments, ["a": folder]); XCTAssertEqual(copy.folderOrder, [folder])
        XCTAssertEqual(copy.classifications["a"]?.tags, ["AWS", "読む"]); XCTAssertEqual(copy.collections, [collection])
        XCTAssertFalse(String(decoding: try JSONEncoder().encode(copy.collections), as: UTF8.self).contains("/tmp/original"))
    }
    func testCollectionLimitsResolutionAndRemovalKeepClassificationAndFolders() throws {
        var state = LibrarySettings(); state.folders = [ShelfFolder(name: "保持")]
        let a = book("a", tags: ["原本タグ"]), b = book("b")
        XCTAssertEqual(state.classification(for: a).tags, ["原本タグ"])
        state.setClassification(for: a.id, group: .personal, tags: [])
        XCTAssertTrue(state.classification(for: a).tags.isEmpty)
        let id = UUID()
        try state.saveCollection(ReadingCollection(id: id, title: "図解", members: [BookReference(book: b), BookReference(book: a)]))
        XCTAssertEqual(state.members(of: state.collections[0], books: [book("a", version: 2), b]).map(\.id), ["b", "a"])
        XCTAssertEqual(state.members(of: state.collections[0], books: [book("a", version: 2)]).first?.latest.version, 2)
        XCTAssertEqual(state.collections[0].members.count, 2) // missing references stay in snapshot
        XCTAssertThrowsError(try state.saveCollection(ReadingCollection(id: id, title: "", members: [BookReference(book: a)])))
        XCTAssertThrowsError(try state.saveCollection(ReadingCollection(id: id, title: "重複", members: [BookReference(book: a), BookReference(book: a)])))
        XCTAssertThrowsError(try state.saveCollection(ReadingCollection(id: id, title: "プレゼン", members: [BookReference(book: book("deck", kind: "presentation"))])))
        state.collections.removeAll()
        XCTAssertEqual(state.folders.count, 1); XCTAssertEqual(state.classifications["a"]?.group, .personal)
    }
}

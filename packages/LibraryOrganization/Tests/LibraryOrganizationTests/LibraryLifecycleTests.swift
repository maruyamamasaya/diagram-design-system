import XCTest
@testable import LibraryOrganization

final class LibraryLifecycleTests: XCTestCase {
    let id = "11111111-1111-4111-8111-111111111111"
    func entry(_ revision: Int, _ status: LibraryDocumentStatus) -> LibraryLifecycleEntry {
        LibraryLifecycleEntry(id: id, document: OrganizationDocument(id: id, title: "資料", type: "presentation", version: 1, formats: ["pdf"], pageCount: 1, tags: []), revision: revision, status: status, updatedAt: "2026-10-19T00:00:00.000Z")
    }
    func testDeletionSurvivesRestartAndStaleResponsesCannotResurrectCopies() throws {
        var index = LibraryLifecycleIndex()
        try index.merge(entry(1, .trashed)); try index.merge(entry(2, .deleted))
        var restored = try JSONDecoder().decode(LibraryLifecycleIndex.self, from: JSONEncoder().encode(index))
        try restored.merge(entry(1, .active)); try restored.merge(entry(3, .active))
        XCTAssertEqual(restored.status(id), .deleted)
        XCTAssertEqual(restored.deletedIDs, [id])
        try restored.merge(LibraryLifecycleSnapshot(entries: []))
        XCTAssertEqual(restored.status(id), .deleted)
    }
    func testSameRevisionConflictAndInvalidSnapshotLeaveStateUnchanged() throws {
        var index = LibraryLifecycleIndex(); try index.merge(entry(1, .trashed))
        XCTAssertThrowsError(try index.merge(entry(1, .active)))
        XCTAssertEqual(index.status(id), .trashed)
        XCTAssertThrowsError(try index.merge(LibraryLifecycleSnapshot(entries: [entry(2, .deleted), entry(2, .deleted)])))
        XCTAssertEqual(index.status(id), .trashed)
        try index.merge(entry(2, .active)); XCTAssertEqual(index.status(id), .active)
    }
}

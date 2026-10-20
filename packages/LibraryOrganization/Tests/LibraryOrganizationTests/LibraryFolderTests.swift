import XCTest
@testable import LibraryOrganization

final class LibraryFolderTests: XCTestCase {
    func testCategoryRootsAreNeverFiledDestinations() {
        var state = OrganizationState<String>();state.ensureShelf(.presentation);state.ensureShelf(.illustration)
        state.assignments["new"] = LibraryShelf.presentation.rootID
        XCTAssertFalse(state.isFiled("new",memberID:{$0}))
        let folder = state.createFolder(name:"美術史",shelf:.presentation)
        state.moveDocuments(["new"],to:folder,memberID:{$0})
        XCTAssertTrue(state.isFiled("new",memberID:{$0}))
        XCTAssertTrue(state.containsDocument("new",in:folder,memberID:{$0}))
        state.moveDocuments(["new"],to:LibraryShelf.presentation.rootID,memberID:{$0})
        XCTAssertFalse(state.isFiled("new",memberID:{$0}));XCTAssertNil(state.assignments["new"])
        XCTAssertFalse(state.folders(in:.presentation).contains { LibraryShelf.isRoot($0.id) })
    }
    func testLegacyFoldersPreserveOverlappingMembershipAndOrder() throws {
        var state = OrganizationState<String>()
        let first = UUID(), second = UUID()
        state.collections = [.init(id: first, title: "A", members: ["two", "one"]), .init(id: second, title: "B", members: ["one"])]
        state.integrateFolders(); state.integrateFolders()
        XCTAssertEqual(state.folders.count, 3)
        XCTAssertEqual(state.collections[0].members, ["two", "one"])
        XCTAssertTrue(state.containsDocument("one", in: first, memberID: { $0 }))
        XCTAssertTrue(state.containsDocument("one", in: second, memberID: { $0 }))
        XCTAssertTrue(state.isFiled("one", memberID: { $0 }))
        let restored = try OrganizationState<String>.load(JSONEncoder().encode(state))
        XCTAssertEqual(restored.folders(in: .illustration).count, 2)
        XCTAssertTrue(restored.folders(in: .presentation).isEmpty)
    }
    func testMoveOutOfLegacyFoldersAndRemoveKeepsOtherMemberships() {
        var state = OrganizationState<String>()
        let first = UUID(), second = UUID()
        state.collections = [.init(id: first, title: "A", members: ["one", "two"]), .init(id: second, title: "B", members: ["one"])]
        let target = state.createFolder(name: "New", shelf: .illustration)
        state.moveDocuments(["one"], to: target, memberID: { $0 })
        XCTAssertFalse(state.containsDocument("one", in: first, memberID: { $0 }))
        XCTAssertFalse(state.containsDocument("one", in: second, memberID: { $0 }))
        XCTAssertTrue(state.containsDocument("one", in: target, memberID: { $0 }))
        XCTAssertTrue(state.folders.contains { $0.id == second }) // empty folder remains
        state.removeIntegratedFolder(first)
        XCTAssertTrue(state.collections.isEmpty)
        XCTAssertEqual(state.assignments["one"], target)
        state.moveDocuments(["one"], to: nil, memberID: { $0 })
        XCTAssertFalse(state.isFiled("one", memberID: { $0 }))
    }
    func testSharedLegacyTreeSplitsWithoutLosingUnknownDocumentsOrIcons() throws {
        var state = OrganizationState<String>()
        var root = OrganizationFolder(name: "技術"); root.iconFile = "icon.png"
        let child = OrganizationFolder(name: "子", parentID: root.id)
        state.folders = [root, child]; state.folderOrder = [root.id, child.id]
        state.assignments = ["diagram": child.id, "deck": child.id, "offline": root.id]
        state.scopeLegacyFolders { $0 == "diagram" ? .illustration : .presentation }
        let copy = try XCTUnwrap(state.folders(in: .illustration).first { $0.name == "子" })
        XCTAssertNotEqual(copy.id, child.id)
        XCTAssertEqual(state.assignments["diagram"], copy.id)
        XCTAssertEqual(state.assignments["deck"], child.id)
        XCTAssertEqual(state.assignments["offline"], root.id)
        XCTAssertEqual(state.folders(in: .illustration).first { $0.name == "技術" }?.iconFile, "icon.png")
        let encoded = try JSONEncoder().encode(state)
        state.scopeLegacyFolders { _ in .illustration }
        XCTAssertEqual(state.folders.count, 6)
        XCTAssertEqual(state.assignments["deck"], copy.id)
        var peer = try OrganizationState<String>.load(encoded)
        peer.scopeLegacyFolders { _ in .presentation }
        XCTAssertEqual(peer.folders, state.folders)
        XCTAssertEqual(peer.assignments["deck"], child.id)
        state.removeIntegratedFolder(copy.parentID!)
        XCTAssertEqual(state.folders(in: .presentation).count, 2)
    }
    func testNamespacesAndNestedFoldersStayIndependent() {
        var state = OrganizationState<String>()
        let a = state.createFolder(name: "同名", shelf: .illustration)
        let b = state.createFolder(name: "同名", shelf: .presentation)
        let child = state.createFolder(name: "子", shelf: .illustration, parentID: a)
        XCTAssertEqual(Set(state.folders(in: .illustration).map(\.id)), [a, child])
        XCTAssertEqual(state.folders(in: .presentation).map(\.id), [b])
        state.moveDocuments(["item"], to: child, memberID: { $0 })
        XCTAssertTrue(state.containsDocument("item", in: a, memberID: { $0 }))
        state.removeIntegratedFolder(a)
        XCTAssertEqual(state.folders(in: .presentation).map(\.id), [b])
        XCTAssertNil(state.assignments["item"])
    }
}

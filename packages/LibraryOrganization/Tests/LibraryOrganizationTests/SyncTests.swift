import XCTest
@testable import LibraryOrganization

private actor LoseReply: OrganizationSyncTransport {
    typealias Member = String
    let server: LocalOrganizationSyncServer<String>
    var drop = true
    init(_ server: LocalOrganizationSyncServer<String>) { self.server = server }
    func fetch(libraryID: UUID) async throws -> SyncSnapshot<String> { try await server.fetch(libraryID: libraryID) }
    func submit(libraryID: UUID, operations: [SyncOperation<String>]) async throws -> SyncReply<String> {
        let reply = try await server.submit(libraryID: libraryID, operations: operations)
        if drop { drop = false; throw SyncError.transport }; return reply
    }
}
private struct IncompleteReply: OrganizationSyncTransport {
    typealias Member = String
    func fetch(libraryID: UUID) async throws -> SyncSnapshot<String> { SyncSnapshot(libraryID: libraryID) }
    func submit(libraryID: UUID, operations: [SyncOperation<String>]) async throws -> SyncReply<String> {
        SyncReply(receipts: [], snapshot: SyncSnapshot(libraryID: libraryID))
    }
}
final class SyncTests: XCTestCase {
    let document = "same-document"
    func testOfflineCheckpointRestoreAndLostAcknowledgementReplay() async throws {
        let library = UUID()
        let authority = LocalOrganizationSyncServer<String>(libraryID: library, memberID: { $0 })
        var client = OrganizationSyncClient<String>(libraryID: library)
        let folder = OrganizationFolder(name: "オフライン作成")
        client.edit(key: OrganizationSyncKey.folder(folder.id), value: .folder(folder))
        client.edit(key: OrganizationSyncKey.assignment(document), value: .assignment(folder.id))
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let url = root.appendingPathComponent("client.json")
        try client.save(to: url)
        var restored = try OrganizationSyncClient<String>.load(from: url)
        XCTAssertEqual(restored.pending.map(\.id), client.pending.map(\.id))
        let transport = LoseReply(authority)
        do { try await restored.synchronize(with: transport); XCTFail("injected disconnect") } catch {}
        XCTAssertEqual(restored.pending.count, 2)
        try restored.save(to: url)
        restored = try OrganizationSyncClient<String>.load(from: url)
        let disk = try await authority.encoded()
        let restarted = try LocalOrganizationSyncServer<String>(data: disk, memberID: { $0 })
        try await restored.synchronize(with: restarted)
        XCTAssertTrue(restored.pending.isEmpty); XCTAssertTrue(restored.conflicts.isEmpty)
        XCTAssertEqual(restored.baseline.revision, 2)
        XCTAssertEqual(OrganizationSyncProjection.state(from: restored.records).assignments[document], folder.id)
    }
    func testIndependentConcurrentEditsTagUnionAndRemoval() async throws {
        let id = UUID()
        let authority = LocalOrganizationSyncServer<String>(libraryID: id, memberID: { $0 })
        var mac = OrganizationSyncClient<String>(libraryID: id), phone = mac
        mac.edit(key: OrganizationSyncKey.tag(document, "学習"), value: .tag("学習"))
        phone.edit(key: OrganizationSyncKey.tag(document, "仕事"), value: .tag("仕事"))
        mac.edit(key: OrganizationSyncKey.group(document), value: .group(.work))
        try await mac.synchronize(with: authority); try await phone.synchronize(with: authority); try await mac.synchronize(with: authority)
        let result = OrganizationSyncProjection.state(from: mac.records)
        XCTAssertEqual(Set(result.classifications[document]?.tags ?? []), ["学習", "仕事"])
        XCTAssertEqual(result.classifications[document]?.group, .work)
        phone.edit(key: OrganizationSyncKey.tag(document, "学習"), value: .deleted)
        try await phone.synchronize(with: authority); try await mac.synchronize(with: authority)
        XCTAssertEqual(OrganizationSyncProjection.state(from: mac.records).classifications[document]?.tags, ["仕事"])
    }
    func testSameDocumentConcurrentMoveKeepsBothProposalsAndOtherEditsProceed() async throws {
        let id = UUID(), a = OrganizationFolder(name: "A"), b = OrganizationFolder(name: "B")
        let server = LocalOrganizationSyncServer<String>(libraryID: id, memberID: { $0 })
        var mac = OrganizationSyncClient<String>(libraryID: id)
        mac.edit(key: OrganizationSyncKey.folder(a.id), value: .folder(a)); mac.edit(key: OrganizationSyncKey.folder(b.id), value: .folder(b))
        try await mac.synchronize(with: server); var phone = mac
        let key = OrganizationSyncKey.assignment(document)
        mac.edit(key: key, value: .assignment(a.id)); phone.edit(key: key, value: .assignment(b.id))
        phone.edit(key: OrganizationSyncKey.tag("other", "無関係"), value: .tag("無関係"))
        try await mac.synchronize(with: server); try await phone.synchronize(with: server)
        XCTAssertEqual(phone.conflicts.count, 1)
        XCTAssertEqual(phone.conflicts[0].operation.value, .assignment(b.id))
        XCTAssertEqual(phone.conflicts[0].current?.value, .assignment(a.id))
        XCTAssertNotNil(phone.baseline.records[OrganizationSyncKey.tag("other", "無関係")])
        let checkpoint = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: checkpoint) }
        try phone.save(to: checkpoint)
        phone = try OrganizationSyncClient<String>.load(from: checkpoint)
        XCTAssertEqual(phone.conflicts.count, 1)
        phone.resolve(key: key, keepingLocal: true); try await phone.synchronize(with: server)
        XCTAssertTrue(phone.conflicts.isEmpty)
        XCTAssertEqual(phone.baseline.records[key]?.value, .assignment(b.id))
    }
    func testCollectionConcurrentReorderConflictAndKeepRemote() async throws {
        let id = UUID(), collectionID = UUID()
        let server = LocalOrganizationSyncServer<String>(libraryID: id, memberID: { $0 })
        var mac = OrganizationSyncClient<String>(libraryID: id)
        let key = OrganizationSyncKey.collection(collectionID)
        let initial = ReadingCollection(id: collectionID, title: "読む", members: ["a", "b", "c"])
        mac.edit(key: key, value: .collection(initial)); try await mac.synchronize(with: server); var phone = mac
        var left = initial; left.members = ["b", "a", "c"]
        var right = initial; right.members = ["c", "b", "a"]
        mac.edit(key: key, value: .collection(left)); phone.edit(key: key, value: .collection(right))
        try await mac.synchronize(with: server); try await phone.synchronize(with: server)
        XCTAssertEqual(phone.conflicts.count, 1)
        phone.resolve(key: key, keepingLocal: false)
        XCTAssertEqual(phone.records[key]?.value, .collection(left))
    }
    func testDeletionCascadesAndStaleClientCannotResurrectOrMoveIntoDeletedFolder() async throws {
        let id = UUID(), parent = OrganizationFolder(name: "親")
        let child = OrganizationFolder(name: "子", parentID: parent.id)
        let server = LocalOrganizationSyncServer<String>(libraryID: id, memberID: { $0 })
        var mac = OrganizationSyncClient<String>(libraryID: id)
        for folder in [parent, child] { mac.edit(key: OrganizationSyncKey.folder(folder.id), value: .folder(folder)) }
        mac.edit(key: OrganizationSyncKey.assignment(document), value: .assignment(child.id))
        mac.edit(key: OrganizationSyncKey.order, value: .order([parent.id, child.id]))
        try await mac.synchronize(with: server); var phone = mac
        mac.edit(key: OrganizationSyncKey.folder(parent.id), value: .deleted); try await mac.synchronize(with: server)
        var renamed = child; renamed.name = "古い変更"
        phone.edit(key: OrganizationSyncKey.folder(child.id), value: .folder(renamed))
        phone.edit(key: OrganizationSyncKey.assignment("other"), value: .assignment(child.id))
        try await phone.synchronize(with: server)
        XCTAssertEqual(phone.conflicts.count, 2)
        let state = OrganizationSyncProjection.state(from: phone.records)
        XCTAssertTrue(state.folders.isEmpty); XCTAssertTrue(state.assignments.isEmpty); XCTAssertEqual(state.folderOrder, [])
        XCTAssertEqual(phone.baseline.records[OrganizationSyncKey.folder(child.id)]?.value, .deleted)
    }
    func testInitialImportPreservesIDsSnapshotsAndRequiresReviewAndIsRepeatable() async throws {
        let library = UUID(), folder = OrganizationFolder(name: "同名"), another = OrganizationFolder(name: "同名")
        var mac = OrganizationState<String>(), phone = OrganizationState<String>()
        var icon = folder; icon.iconFile = "local-image.png"
        mac.folders = [icon, another]; mac.assignments[document] = folder.id
        phone.folders = [folder, another]; phone.assignments[document] = another.id
        mac.classifications[document] = LibraryClassification(group: .work, tags: ["Mac"])
        phone.classifications[document] = LibraryClassification(group: .work, tags: ["iPhone"])
        phone.collections = [ReadingCollection(id: UUID(), title: "まとめ", members: ["b-v2", "a-v1"])]
        let existing = try OrganizationSyncProjection.records(from: mac, documentID: { $0 })
        let incoming = try OrganizationSyncProjection.records(from: phone, documentID: { $0 })
        var plan = OrganizationImportPlan(existing: existing, incoming: incoming)
        XCTAssertEqual(plan.conflicts.count, 1)
        var client = OrganizationSyncClient<String>(libraryID: library)
        XCTAssertThrowsError(try plan.enqueue(into: &client)); XCTAssertTrue(client.pending.isEmpty)
        plan.resolve(key: OrganizationSyncKey.assignment(document), useIncoming: true)
        try plan.enqueue(into: &client)
        let server = LocalOrganizationSyncServer<String>(libraryID: library, memberID: { $0 })
        try await client.synchronize(with: server)
        XCTAssertTrue(client.conflicts.isEmpty)
        let result = OrganizationSyncProjection.state(from: client.records)
        XCTAssertEqual(result.folders.count, 2); XCTAssertTrue(result.folders.allSatisfy { $0.iconFile == nil })
        XCTAssertEqual(result.assignments[document], another.id)
        XCTAssertEqual(Set(result.classifications[document]?.tags ?? []), ["Mac", "iPhone"])
        XCTAssertEqual(result.collections, phone.collections)
        XCTAssertEqual(mac.folders[0].iconFile, "local-image.png") // source remains untouched
        let revision = client.baseline.revision
        try plan.enqueue(into: &client); XCTAssertTrue(client.pending.isEmpty)
        try await client.synchronize(with: server); XCTAssertEqual(client.baseline.revision, revision)
    }
    func testCurrentMacAndIOSLegacyJSONImportKeepsBothSides() throws {
        var macState = OrganizationState<String>(), phoneState = OrganizationState<String>()
        let folder = OrganizationFolder(name: "既存フォルダ")
        macState.folders = [folder]; macState.assignments[document] = folder.id
        macState.classifications[document] = LibraryClassification(group: .work, tags: ["Macの既存タグ"])
        macState.collections = [ReadingCollection(id: UUID(), title: "Macの既存まとめ", members: ["a", "b"])]
        phoneState.classifications[document] = LibraryClassification(group: .work, tags: ["iOSの既存タグ"])
        phoneState.collections = [ReadingCollection(id: UUID(), title: "iOSの既存まとめ", members: ["b", "a"])]
        let macJSON = try JSONEncoder().encode(macState) // same organization keys inside Mac library.json
        let importedMac = try OrganizationState<String>.importing(macSettings: macJSON)
        let importedPhone = try OrganizationState<String>.importing(classifications: JSONEncoder().encode(phoneState.classifications), collections: JSONEncoder().encode(phoneState.collections))
        let plan = OrganizationImportPlan(existing: try OrganizationSyncProjection.records(from: importedMac, documentID: { $0 }), incoming: try OrganizationSyncProjection.records(from: importedPhone, documentID: { $0 }))
        XCTAssertTrue(plan.conflicts.isEmpty)
        XCTAssertEqual(importedMac.collections, macState.collections)
        XCTAssertEqual(importedMac.classifications, macState.classifications)
        let records = plan.values.mapValues { SyncRecord(value: $0) }
        let merged = OrganizationSyncProjection.state(from: records)
        XCTAssertEqual(Set(merged.classifications[document]?.tags ?? []), ["Macの既存タグ", "iOSの既存タグ"])
        XCTAssertEqual(merged.collections.count, 2)
        // Combining conflicting file sources cannot silently replace the Mac's settings.
        XCTAssertThrowsError(try OrganizationState<String>.importing(macSettings: macJSON, classifications: JSONEncoder().encode(phoneState.classifications)))
    }
    func testInitialImportRejectsCyclesWithoutChangingOutbox() throws {
        var a = OrganizationFolder(name: "A"), b = OrganizationFolder(name: "B")
        a.parentID = b.id; b.parentID = a.id
        let plan = OrganizationImportPlan<String>(existing: [:], incoming: [OrganizationSyncKey.folder(a.id): .folder(a), OrganizationSyncKey.folder(b.id): .folder(b)])
        var client = OrganizationSyncClient<String>(libraryID: UUID())
        XCTAssertThrowsError(try plan.enqueue(into: &client)); XCTAssertTrue(client.pending.isEmpty)
    }
    func testOfflineParentDependenciesAndLargeQueue() async throws {
        let library = UUID(), parent = OrganizationFolder(name: "後から作成する親")
        let child = OrganizationFolder(name: "先に編集した子", parentID: parent.id)
        let server = LocalOrganizationSyncServer<String>(libraryID: library, memberID: { $0 })
        var client = OrganizationSyncClient<String>(libraryID: library)
        client.edit(key: OrganizationSyncKey.assignment(document), value: .assignment(child.id))
        client.edit(key: OrganizationSyncKey.folder(child.id), value: .folder(child))
        client.edit(key: OrganizationSyncKey.folder(parent.id), value: .folder(parent))
        for index in 0..<510 { client.edit(key: OrganizationSyncKey.tag("doc-\(index)", "offline"), value: .tag("offline")) }
        try await client.synchronize(with: server)
        XCTAssertTrue(client.pending.isEmpty); XCTAssertTrue(client.conflicts.isEmpty)
        XCTAssertEqual(client.baseline.revision, 513)
        XCTAssertEqual(OrganizationSyncProjection.state(from: client.records).assignments[document], child.id)
    }
    func testIncompleteAcknowledgementPreservesOutbox() async throws {
        var client = OrganizationSyncClient<String>(libraryID: UUID())
        client.edit(key: OrganizationSyncKey.group(document), value: .group(.personal))
        let before = client.pending
        do { try await client.synchronize(with: IncompleteReply()); XCTFail("incomplete acknowledgement") } catch {}
        XCTAssertEqual(client.pending, before); XCTAssertEqual(client.baseline.revision, 0)
    }
    func testFolderOrderConflictsAndCollectionDeletionDoesNotResurrect() async throws {
        let library = UUID(), a = OrganizationFolder(name: "A"), b = OrganizationFolder(name: "B"), collectionID = UUID()
        let server = LocalOrganizationSyncServer<String>(libraryID: library, memberID: { $0 })
        var mac = OrganizationSyncClient<String>(libraryID: library)
        for folder in [a, b] { mac.edit(key: OrganizationSyncKey.folder(folder.id), value: .folder(folder)) }
        mac.edit(key: OrganizationSyncKey.collection(collectionID), value: .collection(ReadingCollection(id: collectionID, title: "元", members: ["a"])))
        try await mac.synchronize(with: server); var phone = mac
        mac.edit(key: OrganizationSyncKey.order, value: .order([a.id, b.id]))
        phone.edit(key: OrganizationSyncKey.order, value: .order([b.id, a.id]))
        mac.edit(key: OrganizationSyncKey.collection(collectionID), value: .deleted)
        phone.edit(key: OrganizationSyncKey.collection(collectionID), value: .collection(ReadingCollection(id: collectionID, title: "古い編集", members: ["a"])))
        try await mac.synchronize(with: server); try await phone.synchronize(with: server)
        XCTAssertEqual(phone.conflicts.count, 2)
        XCTAssertTrue(OrganizationSyncProjection.state(from: phone.records).collections.isEmpty)
        XCTAssertEqual(OrganizationSyncProjection.state(from: phone.records).folderOrder, [a.id, b.id])
    }
    func testWrongLibraryDuplicateIDAndInvalidStructureAreRejected() async throws {
        let library = UUID(), server = LocalOrganizationSyncServer<String>(libraryID: UUID(), memberID: { $0 })
        do { _ = try await server.fetch(libraryID: library); XCTFail("wrong namespace") } catch {}
        let authority = LocalOrganizationSyncServer<String>(libraryID: library, memberID: { $0 })
        let folder = OrganizationFolder(name: "A"), operationID = UUID()
        let operation = SyncOperation<String>(id: operationID, key: OrganizationSyncKey.folder(folder.id), expectedRevision: 0, value: .folder(folder))
        _ = try await authority.submit(libraryID: library, operations: [operation])
        do {
            _ = try await authority.submit(libraryID: library, operations: [SyncOperation(id: operationID, key: operation.key, expectedRevision: 0, value: .deleted)])
            XCTFail("operation identity changed")
        } catch {}
        let collection = ReadingCollection(id: UUID(), title: "重複", members: ["a", "a"])
        let reply = try await authority.submit(libraryID: library, operations: [SyncOperation(key: OrganizationSyncKey.collection(collection.id), expectedRevision: 0, value: .collection(collection))])
        XCTAssertEqual(reply.receipts[0].disposition, .invalid)
        XCTAssertThrowsError(try LoopbackOrganizationTransport<String>(baseURL: URL(string: "https://example.com")!))
        XCTAssertThrowsError(try OrganizationSyncClient<String>.load(from: URL(fileURLWithPath: "/nonexistent-test-state")))
    }
}

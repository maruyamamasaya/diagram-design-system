import Foundation
import LibraryOrganization
import LibraryOrganizationUI

@main struct SyncMock {
    @MainActor static func main() async throws {
        let args = CommandLine.arguments
        guard args.count == 3 else { fatalError("usage: OrganizationSyncMock request STATE | smoke http://127.0.0.1:PORT") }
        if args[1] == "request" {
            let request = try JSONDecoder().decode(LocalSyncRequest<OrganizationDocument>.self, from: FileHandle.standardInput.readDataToEndOfFile())
            let url = URL(fileURLWithPath: args[2])
            let server: LocalOrganizationSyncServer<OrganizationDocument>
            if FileManager.default.fileExists(atPath: url.path) { server = try LocalOrganizationSyncServer(data: Data(contentsOf: url), memberID: { $0.id }) }
            else { server = LocalOrganizationSyncServer(libraryID: request.libraryID, memberID: { $0.id }) }
            let reply: SyncReply<OrganizationDocument>
            if let operations = request.operations { reply = try await server.submit(libraryID: request.libraryID, operations: operations) }
            else { reply = SyncReply(receipts: [], snapshot: try await server.fetch(libraryID: request.libraryID)) }
            try await server.encoded().write(to: url, options: .atomic)
            FileHandle.standardOutput.write(try JSONEncoder().encode(reply))
        } else if args[1] == "smoke" {
            let transport = try LoopbackOrganizationTransport<String>(baseURL: URL(string: args[2])!)
            let libraryID = UUID()
            var mac = OrganizationSyncClient<String>(libraryID: libraryID)
            var phone = OrganizationSyncClient<String>(libraryID: libraryID)
            let folder = OrganizationFolder(name: "ローカル検証")
            mac.edit(key: OrganizationSyncKey.folder(folder.id), value: .folder(folder))
            mac.edit(key: OrganizationSyncKey.assignment("document-a"), value: .assignment(folder.id))
            // The harness drops one response after committing. Retrying must not duplicate a write.
            do { try await mac.synchronize(with: transport) } catch { try await mac.synchronize(with: transport) }
            try await phone.synchronize(with: transport)
            guard phone.baseline.records[OrganizationSyncKey.assignment("document-a")]?.value == .assignment(folder.id), mac.conflicts.isEmpty else { throw SyncError.corruptState }
            mac.edit(key: OrganizationSyncKey.tag("document-a", "Mac"), value: .tag("Mac"))
            phone.edit(key: OrganizationSyncKey.tag("document-a", "iPhone"), value: .tag("iPhone"))
            try await mac.synchronize(with: transport); try await phone.synchronize(with: transport); try await mac.synchronize(with: transport)
            let state = OrganizationSyncProjection.state(from: mac.records)
            guard Set(state.classifications["document-a"]?.tags ?? []) == ["Mac", "iPhone"], mac.baseline.revision == 4 else { throw SyncError.corruptState }
            print("HTTP smoke passed: folder, assignment, dropped-response replay, concurrent tag additions; revision=4")
        } else if args[1] == "smoke-ui" {
            try await smokeUI(endpoint: args[2])
        } else { throw SyncError.invalidValue }
    }
    @MainActor static func smokeUI(endpoint: String) async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("sync-ui-" + UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let library = UUID(), a = OrganizationFolder(name: "技術"), b = OrganizationFolder(name: "学習")
        let first = OrganizationDocument(id: "00000000-0000-0000-0000-000000000001", title: "図解A", type: "illustration", version: 1, formats: ["pdf"], pageCount: 1, tags: [])
        let second = OrganizationDocument(id: "00000000-0000-0000-0000-000000000002", title: "図解B", type: "illustration", version: 1, formats: ["png"], pageCount: 1, tags: [])
        var seed = OrganizationState<OrganizationDocument>(); seed.folders = [a, b]
        seed.classifications[first.id] = LibraryClassification(group: .work, tags: ["既存タグ"])
        seed.collections = [ReadingCollection(id: UUID(), title: "既存まとめ", members: [first, second])]
        let sourceBytes = try JSONEncoder().encode(seed)
        let mac = SyncLabSession(directory: root.appendingPathComponent("mac"), seed: seed, documents: [first, second])
        await mac.prepare(endpoint: endpoint, libraryID: library.uuidString)
        guard mac.connected, !mac.imported else { throw SyncError.corruptState }
        mac.confirmImport(); await mac.synchronize()
        if mac.pendingCount > 0 { await mac.synchronize() } // injected ACK loss
        guard mac.pendingCount == 0, mac.conflicts.isEmpty, mac.revision == 5 else { throw SyncError.corruptState }
        var phone = SyncLabSession(directory: root.appendingPathComponent("phone"), seed: seed, documents: [first, second])
        await phone.prepare(endpoint: endpoint, libraryID: library.uuidString)
        guard phone.initialConflicts.isEmpty else { throw SyncError.corruptState }
        phone.confirmImport(); await phone.synchronize()
        mac.edit(key: OrganizationSyncKey.assignment(first.id), value: .assignment(a.id))
        phone.edit(key: OrganizationSyncKey.assignment(first.id), value: .assignment(b.id))
        await mac.synchronize(); await phone.synchronize()
        guard phone.conflicts.count == 1 else { throw SyncError.corruptState }
        phone = SyncLabSession(directory: root.appendingPathComponent("phone"), seed: seed, documents: [first, second])
        guard phone.conflicts.count == 1 else { throw SyncError.corruptState }
        phone.resolve(key: OrganizationSyncKey.assignment(first.id), keepingLocal: true)
        await phone.synchronize(); await mac.synchronize()
        guard phone.conflicts.isEmpty, mac.state.assignments[first.id] == b.id else { throw SyncError.corruptState }
        phone.setEndpoint("http://127.0.0.1:1")
        phone.edit(key: OrganizationSyncKey.tag(first.id, "オフライン"), value: .tag("オフライン"))
        await phone.synchronize()
        guard phone.pendingCount == 1 else { throw SyncError.corruptState }
        phone = SyncLabSession(directory: root.appendingPathComponent("phone"), seed: seed, documents: [first, second])
        guard phone.pendingCount == 1 else { throw SyncError.corruptState }
        phone.setEndpoint(endpoint); await phone.synchronize(); await mac.synchronize()
        guard Set(mac.state.classifications[first.id]?.tags ?? []) == ["既存タグ", "オフライン"], mac.state.collections == seed.collections else { throw SyncError.corruptState }
        mac.edit(key: OrganizationSyncKey.folder(b.id), value: .deleted)
        await mac.synchronize(); await phone.synchronize()
        guard phone.state.assignments[first.id] == nil else { throw SyncError.corruptState }
        // The UI adapters' input value is immutable throughout the rehearsal.
        let original = try OrganizationState<OrganizationDocument>.load(sourceBytes)
        guard seed.folders == original.folders, seed.classifications == original.classifications, seed.collections == original.collections else { throw SyncError.corruptState }
        mac.clear(); phone.clear()
        guard !mac.connected, !phone.connected else { throw SyncError.corruptState }
        print("UI session HTTP smoke passed: initial review, ACK replay, conflict/restart/resolution, offline/retry, deletion, source preservation, cleanup")
    }
}

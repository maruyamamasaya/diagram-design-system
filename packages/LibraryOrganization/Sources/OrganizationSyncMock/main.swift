import Foundation
import LibraryOrganization
import LibraryOrganizationUI

@main struct SyncMock {
    @MainActor static func main() async throws {
        let args = CommandLine.arguments
        guard args.count == 3 else { fatalError("usage: OrganizationSyncMock request STATE | smoke http://127.0.0.1:PORT") }
        if args[1] == "limited" {
            let request = try JSONDecoder().decode(LimitedSyncRequest<OrganizationDocument>.self, from: FileHandle.standardInput.readDataToEndOfFile())
            let url = URL(fileURLWithPath: args[2])
            var disk: LimitedDisk
            if FileManager.default.fileExists(atPath: url.path) { disk = try JSONDecoder().decode(LimitedDisk.self, from: Data(contentsOf: url)) }
            else {
                let server = LocalOrganizationSyncServer<OrganizationDocument>(libraryID: request.libraryID, memberID: { $0.id })
                disk = LimitedDisk(libraryID: request.libraryID, authority: try await server.encoded())
            }
            guard disk.libraryID == request.libraryID else { throw SyncError.wrongLibrary }
            var result = LimitedSyncResponse<OrganizationDocument>()
            do {
                switch request.action {
                case "begin": result.admission = disk.ledger.reserve(id: request.attemptID, consent: request.consent, now: Date())
                case "finish": disk.ledger.finish(permit: request.attemptID)
                case "sync":
                    try disk.ledger.use(permit: request.attemptID, request: request.requestID, now: Date())
                    try JSONEncoder().encode(disk).write(to: url, options: .atomic)
                    let server = try LocalOrganizationSyncServer<OrganizationDocument>(data: disk.authority, memberID: { $0.id })
                    result.reply = try await server.submit(libraryID: request.libraryID, operations: request.operations ?? [])
                    disk.authority = try await server.encoded()
                default: throw SyncError.invalidValue
                }
            } catch let failure as SyncQuotaFailure { result.failure = failure }
            try JSONEncoder().encode(disk).write(to: url, options: .atomic)
            FileHandle.standardOutput.write(try JSONEncoder().encode(result))
        } else if args[1] == "request" {
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
        } else if args[1] == "smoke-limit-concurrent" {
            let library = UUID()
            let admissions = try await withThrowingTaskGroup(of: (UUID, SyncAdmission).self) { group in
                for _ in 0..<10 {
                    group.addTask {
                        let id = UUID()
                        let transport = try LimitedLoopbackTransport<OrganizationDocument>(baseURL: URL(string: args[2])!, attemptID: id)
                        return (id, try await transport.reserve(libraryID: library))
                    }
                }
                var result: [(UUID, SyncAdmission)] = []
                for try await value in group { result.append(value) }
                return result
            }
            let accepted = admissions.filter { $0.1.permit != nil }
            guard accepted.count == 5 else { throw SyncError.corruptState }
            let transport = try LimitedLoopbackTransport<OrganizationDocument>(baseURL: URL(string: args[2])!, attemptID: accepted[0].0)
            let operation = SyncOperation<OrganizationDocument>(key: OrganizationSyncKey.tag("test", "並行"), expectedRevision: 0, value: .tag("並行"))
            let reply = try await transport.submit(libraryID: library, operations: [operation])
            guard reply.snapshot.revision == 1 else { throw SyncError.corruptState }
            print("Concurrent quota HTTP passed: exactly five of ten admissions; durable ACK replay succeeds")
        } else if args[1] == "smoke-limit" {
            try await smokeLimit(endpoint: args[2])
        } else if args[1] == "smoke-ui" {
            try await smokeUI(endpoint: args[2])
        } else { throw SyncError.invalidValue }
    }
    @MainActor static func smokeLimit(endpoint: String) async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("sync-quota-" + UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let library = UUID(), folder = OrganizationFolder(name: "回数制限の検証")
        var seed = OrganizationState<OrganizationDocument>(); seed.folders = [folder]
        let mac = SyncLabSession(directory: root.appendingPathComponent("mac"), seed: seed, documents: [], rateLimited: true)
        await mac.prepare(endpoint: endpoint, libraryID: library.uuidString); mac.confirmImport(); await mac.synchronize()
        guard mac.revision == 1, mac.pendingCount == 0 else { throw SyncError.corruptState }
        var phone = SyncLabSession(directory: root.appendingPathComponent("phone"), seed: OrganizationState(), documents: [], rateLimited: true)
        await phone.prepare(endpoint: endpoint, libraryID: library.uuidString); phone.confirmImport(); await phone.synchronize()
        await mac.synchronize(); await phone.synchronize(); await mac.synchronize()
        guard mac.syncQuota?.used == 5 else { throw SyncError.corruptState }
        phone.edit(key: OrganizationSyncKey.tag("test-document", "保持"), value: .tag("保持"))
        await phone.synchronize()
        guard phone.status == "同期待ち", phone.pendingCount == 1, phone.syncQuota?.used == 5 else { throw SyncError.corruptState }
        phone = SyncLabSession(directory: root.appendingPathComponent("phone"), seed: OrganizationState(), documents: [], rateLimited: true)
        await phone.synchronize() // cached next time prevents another HTTP attempt
        guard phone.pendingCount == 1, phone.nextSyncAt != nil else { throw SyncError.corruptState }
        await phone.synchronize(allowExtra: true) // represents the explicit UI confirmation
        guard phone.pendingCount == 0, phone.revision == 2, phone.syncQuota?.used == 6 else { throw SyncError.corruptState }
        let other = try LimitedLoopbackTransport<OrganizationDocument>(baseURL: URL(string: endpoint)!, attemptID: UUID())
        let denied = try await other.reserve(libraryID: library)
        guard denied.permit == nil, denied.quota.used == 6 else { throw SyncError.corruptState }
        phone.clear()
        let reopened = SyncLabSession(directory: root.appendingPathComponent("phone"), seed: OrganizationState(), documents: [], rateLimited: true)
        guard reopened.syncQuota?.used == 6, reopened.nextSyncAt != nil else { throw SyncError.corruptState }
        print("Quota HTTP passed: two devices share five sessions; ACK retry; sixth blocked; pending/restart preserved; confirmed extra once; normal limit and disconnect cache retained")
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


private struct LimitedDisk: Codable {
    var libraryID: UUID
    var authority: Data
    var ledger = SyncRateLedger()
}

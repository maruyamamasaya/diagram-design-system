import SwiftUI
import LibraryOrganization

public struct SyncLabView: View {
    @ObservedObject private var session: SyncLabSession
    @Environment(\.dismiss) private var dismiss
    @State private var endpoint: String
    @State private var library: String
    @State private var folderName = ""
    @State private var tag = ""
    @State private var collectionName = ""
    @State private var selectedDocument = ""
    public init(session: SyncLabSession) {
        self.session = session; _endpoint = State(initialValue: session.endpoint); _library = State(initialValue: session.libraryID)
    }
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("ローカル同期の検証").font(.title2.bold())
                    Text("本棚から取り込んだ検証コピーだけを編集・同期します。元の資料・フォルダ・タグ・まとめには書き込みません。iPhoneはSimulatorで検証してください。")
                        .font(.callout).foregroundStyle(.secondary)
                    HStack { Text(session.status).bold(); Spacer(); Text("送信待ち \(session.pendingCount)件 · 競合 \(session.conflicts.count)件") }
                    if let date = session.lastSynced { Text("最終同期：" + date.formatted()).font(.caption) }
                    if let message = session.message { Text(message).foregroundStyle(.red) }
                    if !session.connected {
                        TextField("http://127.0.0.1:ポート", text: $endpoint).textFieldStyle(.roundedBorder)
                        TextField("共通のライブラリUUID", text: $library).textFieldStyle(.roundedBorder)
                        Button("新しい検証ライブラリIDを作成") { library = UUID().uuidString }
                        Text("MacとSimulatorで同じURL・UUIDを入力します。外部サーバーは指定できません。双方の初回取込は順に確認してください。") .font(.caption)
                        Button("接続して初回統合を確認") { Task { await session.prepare(endpoint: endpoint, libraryID: library) } }
                        Button("保存済みの検証コピーを解除") { session.clear() }
                    } else {
                        Text("接続先：\(session.endpoint)\nライブラリ：\(session.libraryID)\nサーバー版：\(session.revision)").font(.caption).textSelection(.enabled)
                        HStack {
                            TextField("模擬サーバーURL", text: $endpoint).textFieldStyle(.roundedBorder)
                            Button("接続先を変更") { session.setEndpoint(endpoint) }
                        }
                        if !session.imported { initialReview }
                        else {
                            Button("今すぐ同期・再試行") { Task { await session.synchronize() } }.buttonStyle(.borderedProminent)
                            conflictList
                            rehearsalEditor
                        }
                        Button("この端末の検証コピーを解除") { session.clear() }
                        Text("解除しても模擬サーバーのデータは残ります。再接続時は初回統合から確認できます。") .font(.caption).foregroundStyle(.secondary)
                    }
                }.padding(24).disabled(session.busy)
            }
            .navigationTitle("同期の状態と競合")
            .toolbar { Button("閉じる") { dismiss() }.disabled(session.busy) }
        }
        #if os(macOS)
        .frame(minWidth: 700, minHeight: 650)
        #endif
    }
    private var initialReview: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("初回統合の確認").font(.headline)
            Text("同名でもIDの異なるフォルダは別々に残します。資料本体・フォルダ画像は送信しません。")
            ForEach(session.initialConflicts, id: \.key) { conflict in
                VStack(alignment: .leading) {
                    Text(session.title(for: conflict.key)).bold()
                    Text("サーバー：" + session.describe(conflict.existing))
                    Text("この端末：" + session.describe(conflict.incoming))
                    HStack {
                        Button("サーバーを採用") { session.chooseInitial(key: conflict.key, incoming: false) }
                        Button("この端末を採用") { session.chooseInitial(key: conflict.key, incoming: true) }
                    }
                }.padding(10).background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
            }
            Button("確認した検証コピーを送信待ちにする") { session.confirmImport() }.disabled(!session.initialConflicts.isEmpty)
        }
    }
    private var conflictList: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(session.conflicts, id: \.operation.id) { conflict in
                VStack(alignment: .leading) {
                    Text(session.title(for: conflict.operation.key)).bold()
                    Text("この端末の提案：" + session.describe(conflict.operation.value))
                    Text("サーバー（受信時）：" + session.describe(conflict.current?.value))
                    if conflict.disposition == .invalid { Text("削除済みの移動先や入力条件を確認してください。").font(.caption) }
                    HStack {
                        Button("サーバーを採用") { session.resolve(key: conflict.operation.key, keepingLocal: false) }
                        Button("この端末を採用して再送") { session.resolve(key: conflict.operation.key, keepingLocal: true) }
                            .disabled(conflict.disposition == .invalid)
                    }
                }.padding(10).background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
            }
        }
    }
    private var rehearsalEditor: some View {
        VStack(alignment: .leading, spacing: 14) {
            Divider()
            Text("検証コピーを編集").font(.headline)
            HStack {
                TextField("新しいフォルダ名", text: $folderName).textFieldStyle(.roundedBorder)
                Button("フォルダを追加") {
                    let value = folderName.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !value.isEmpty, value.count <= 120 else { return }
                    let folder = OrganizationFolder(name: value)
                    session.edit(key: OrganizationSyncKey.folder(folder.id), value: .folder(folder)); folderName = ""
                }
            }
            ForEach(session.state.orderedFolders) { folder in
                HStack {
                    Text(folder.name)
                    Spacer()
                    Button("フォルダを解除") { session.edit(key: OrganizationSyncKey.folder(folder.id), value: .deleted) }
                }
            }
            documentEditor
            collectionEditor
            Text("編集はこの検証画面だけに反映します。オフライン時も送信待ちを保存し、手動同期で送ります。") .font(.caption).foregroundStyle(.secondary)
        }
    }
    @ViewBuilder private var documentEditor: some View {
            if !session.documents.isEmpty {
                Picker("資料", selection: $selectedDocument) {
                    Text("資料を選ぶ").tag("")
                    ForEach(session.documents) { Text($0.title).tag($0.id) }
                }
                if !selectedDocument.isEmpty {
                    HStack {
                        Text("所属：" + (session.state.assignments[selectedDocument].flatMap { id in session.state.folders.first { $0.id == id }?.name } ?? "未整理"))
                        Menu("フォルダへ移動") {
                            Button("未整理") { session.edit(key: OrganizationSyncKey.assignment(selectedDocument), value: .deleted) }
                            ForEach(session.state.orderedFolders) { folder in
                                Button(folder.name) { session.edit(key: OrganizationSyncKey.assignment(selectedDocument), value: .assignment(folder.id)) }
                            }
                        }
                    }
                    Picker("グループ", selection: Binding(get: { session.state.classifications[selectedDocument]?.group ?? .other }, set: { session.edit(key: OrganizationSyncKey.group(selectedDocument), value: .group($0)) })) {
                        ForEach(LibraryGroup.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    HStack {
                        TextField("追加するタグ", text: $tag).textFieldStyle(.roundedBorder)
                        Button("タグを追加") {
                            if let value = LibraryClassification.normalizedTags([tag]).first {
                                session.edit(key: OrganizationSyncKey.tag(selectedDocument, value), value: .tag(value)); tag = ""
                            }
                        }
                    }
                    ForEach(session.state.classifications[selectedDocument]?.tags ?? [], id: \.self) { tag in
                        HStack { Text(tag); Spacer(); Button("タグを外す") { session.edit(key: OrganizationSyncKey.tag(selectedDocument, tag), value: .deleted) } }
                    }
                }
            }
    }
    private var collectionEditor: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("まとめ").font(.headline)
            ForEach(session.state.collections) { collection in
                VStack(alignment: .leading) {
                    Text(collection.title).bold()
                    Text(collection.members.map(\.title).joined(separator: " → ")).font(.caption)
                    HStack {
                        Button("読む順番を逆にする") {
                            var value = collection; value.members.reverse()
                            session.edit(key: OrganizationSyncKey.collection(value.id), value: .collection(value))
                        }.disabled(collection.members.count < 2)
                        Button("まとめを解除") { session.edit(key: OrganizationSyncKey.collection(collection.id), value: .deleted) }
                    }
                }
            }
            HStack {
                TextField("新しいまとめの名前", text: $collectionName).textFieldStyle(.roundedBorder)
                Button("選択した図解で作成") {
                    guard let document = session.documents.first(where: { $0.id == selectedDocument }), document.type != "presentation", document.formats.contains(where: { ["png", "pdf"].contains($0) }) else { return }
                    let name = collectionName.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !name.isEmpty, name.count <= 120 else { return }
                    let value = ReadingCollection(id: UUID(), title: name, members: [document])
                    session.edit(key: OrganizationSyncKey.collection(value.id), value: .collection(value)); collectionName = ""
                }.disabled(selectedDocument.isEmpty)
            }
        }
    }

}

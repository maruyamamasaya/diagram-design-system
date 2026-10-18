import SwiftUI
import AppKit
import PDFKit
import QuickLookUI
import ImageIO
import BookshelfCore
import LibraryOrganization
import LibraryOrganizationUI

@main struct BookshelfApp: App {
    @StateObject private var store = ShelfStore()
    var body: some Scene {
        WindowGroup("図鑑 — 資料の本棚") { ShelfView().environmentObject(store).frame(minWidth: 1000, minHeight: 650) }
        .defaultSize(width: 1380, height: 860)
        .commands { CommandGroup(after: .newItem) {
            Button("資料フォルダを登録…") { store.addSource() }.keyboardShortcut("o")
            Button("本棚を更新") { Task { await store.refresh() } }.keyboardShortcut("r")
        } }
    }
}
struct ShelfView: View {
    @EnvironmentObject var store: ShelfStore
    @State private var shelf: String? = "all"
    @State private var selection = BookSelection()
    @State private var search = ""
    @State private var folderName = ""
    @State private var editingFolder: UUID?
    @State private var folderDialog = false
    @State private var sortBy = "updated"
    @State private var cardSize = 230.0
    @State private var showWarnings = false
    @State private var selectedGroup = "すべて"
    @State private var selectedTag = ""
    @State private var classificationDraft: Book?
    @State private var syncLab: SyncLabSession?
    @State private var syncSetup = false
    @State private var collectionDraft: ReadingCollection<BookReference>?
    var selectedCollection: ReadingCollection<BookReference>? { store.settings.collections.first { shelf == "collection:" + $0.id.uuidString } }
    var collectionCards: [ReadingCollection<BookReference>] {
        guard shelf == "all", selectedGroup == "すべて", selectedTag.isEmpty, selection.ids.isEmpty else { return [] }
        return store.settings.collections.filter { search.isEmpty || $0.title.localizedStandardContains(search) || $0.members.contains { $0.title.localizedStandardContains(search) } }
    }
    var gridBooks: [Book] {
        let grouped = Set(collectionCards.flatMap { $0.members.map(\.id) })
        return visibleBooks.filter { !grouped.contains($0.id) }
    }
    var folderID: UUID? { shelf.flatMap(UUID.init(uuidString:)) }
    var visibleBooks: [Book] {
        let ids = folderID.map { store.settings.descendants(of: $0) }
        let candidates = selectedCollection.map { store.settings.members(of: $0, books: store.books) } ?? store.books
        let books = candidates.filter { book in
            let assignment = store.settings.assignments[book.id]
            let inShelf = shelf == "unfiled" ? assignment == nil : ids.map { assignment.map($0.contains) ?? false } ?? true
            let classification = store.settings.classification(for: book)
            return inShelf && (selectedGroup == "すべて" || classification.group.rawValue == selectedGroup)
                && (selectedTag.isEmpty || classification.tags.contains { $0.localizedCaseInsensitiveCompare(selectedTag) == .orderedSame })
                && (search.isEmpty || book.latest.title.localizedStandardContains(search) || book.id.localizedStandardContains(search) || classification.tags.contains { $0.localizedStandardContains(search) })
        }
        if selectedCollection != nil { return books }
        return books.sorted { sortBy == "title" ? $0.latest.title.localizedStandardCompare($1.latest.title) == .orderedAscending : $0.latest.modified > $1.latest.modified }
    }
    var body: some View {
        NavigationSplitView {
            List(selection: $shelf) {
                Section("ライブラリ") {
                    Label("すべての資料", systemImage: "books.vertical").tag("all")
                    Label("未整理", systemImage: "tray").tag("unfiled")
                        .frame(maxWidth: .infinity, minHeight: 26, alignment: .leading)
                        .overlay(GeometryReader { geometry in
                            FolderDropSurface(select: { shelf = "unfiled" }, receive: { payload in
                                let valid = BookSelection.droppedIDs([payload], known: Set(store.books.map(\.id)))
                                guard !valid.isEmpty else { return false }
                                store.change { $0.moveBooks(valid, to: nil) }
                                return true
                            }).frame(width: geometry.size.width, height: geometry.size.height)
                        })
                }
                Section {
                    ForEach(store.settings.orderedFolders) { folder in
                        Label {
                            Text(store.folderPath(folder.id))
                        } icon: {
                            if let url = store.iconURL(for: folder), let image = NSImage(contentsOf: url) {
                                Image(nsImage: image).resizable().scaledToFit().frame(width: 22, height: 22).clipShape(RoundedRectangle(cornerRadius: 4))
                            } else { Image(systemName: "folder") }
                        }.tag(folder.id.uuidString)
                            .contextMenu {
                                Button("アイコン画像を設定…") { store.chooseFolderIcon(folder.id) }
                                if folder.iconFile != nil { Button("標準アイコンに戻す") { store.resetFolderIcon(folder.id) } }
                                Divider()
                                Button("名前を変更…") { editingFolder = folder.id; folderName = folder.name; folderDialog = true }
                                Button("フォルダを解除", role: .destructive) {
                                    store.change { $0.removeFolder(folder.id) }; shelf = "all"
                                }
                            }
                            .frame(maxWidth: .infinity, minHeight: 26, alignment: .leading)
                            .overlay(GeometryReader { geometry in
                                FolderDropSurface(folderID: folder.id, folderTitle: folder.name, reorder: { movedID, after in
                                    guard movedID != folder.id, store.settings.folders.contains(where: { $0.id == movedID }) else { return false }
                                    store.change { $0.reorderFolder(movedID, relativeTo: folder.id, after: after) }
                                    return true
                                }, menu: { folderContextMenu(folder) }, select: { shelf = folder.id.uuidString }, receive: { payload in
                                    let valid = BookSelection.droppedIDs([payload], known: Set(store.books.map(\.id)))
                                    guard !valid.isEmpty else { return false }
                                    store.change { $0.moveBooks(valid, to: folder.id) }
                                    return true
                                }).frame(width: geometry.size.width, height: geometry.size.height)
                            })
                    }
                    Button { editingFolder = nil; folderName = ""; folderDialog = true } label: { Label("フォルダを作成", systemImage: "folder.badge.plus") }
                } header: { Text("本棚のフォルダ") } footer: { Text("フォルダをドラッグして並べ替え。資料をドロップして分類できます。") }
                Section("図解のまとめ") {
                    ForEach(store.settings.collections) { collection in
                        Label(collection.title, systemImage: "rectangle.stack").tag("collection:" + collection.id.uuidString)
                            .contextMenu {
                                Button("まとめを編集") { collectionDraft = collection }
                                Button("まとめを解除") { store.change { $0.collections.removeAll { $0.id == collection.id } }; shelf = "all" }
                            }
                    }
                    Button("まとめを作成") { collectionDraft = ReadingCollection(id: UUID(), title: "", members: []) }
                }
                Section("保存場所") {
                    ForEach(store.settings.sources) { source in
                        Label(URL(fileURLWithPath: source.path).lastPathComponent, systemImage: "externaldrive")
                            .help(source.path).contextMenu { Button("登録を解除") { store.removeSource(source.id) } }
                    }
                    Button { store.addSource() } label: { Label("資料フォルダを登録", systemImage: "plus") }
                }
            }
            .listStyle(.sidebar).navigationSplitViewColumnWidth(min: 210, ideal: 235, max: 340)
        } content: {
            VStack(spacing: 0) {
                HStack {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(selectedCollection?.title ?? folderID.map(store.folderPath) ?? (shelf == "unfiled" ? "未整理" : "すべての資料")).font(.title2.bold())
                        Text("\(visibleBooks.count) 冊 · 改訂版と各形式をひとまとめに表示").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    if store.busy { ProgressView().controlSize(.small) }
                    Picker("並べ替え", selection: $sortBy) { Text("更新順").tag("updated"); Text("名前順").tag("title") }.labelsHidden().frame(width: 105)
                }.padding(22)
                HStack {
                    Picker("グループ", selection: $selectedGroup) {
                        Text("すべて").tag("すべて")
                        ForEach(LibraryGroup.allCases, id: \.self) { Text($0.rawValue).tag($0.rawValue) }
                    }
                    Picker("タグ", selection: $selectedTag) {
                        Text("すべてのタグ").tag("")
                        ForEach(Array(Set(store.books.flatMap { store.settings.classification(for: $0).tags } + (selectedTag.isEmpty ? [] : [selectedTag]))).sorted(), id: \.self) { Text($0).tag($0) }
                    }
                }.padding(.horizontal, 22).padding(.bottom, 12)
                if let collection = selectedCollection {
                    HStack {
                        Button("まとめを編集") { collectionDraft = collection }
                        Button("まとめを解除") { store.change { $0.collections.removeAll { $0.id == collection.id } }; shelf = "all" }
                        Text("読む順番で表示 · 未取得 \(collection.members.count - store.settings.members(of: collection, books: store.books).count)件").font(.caption).foregroundStyle(.secondary)
                        Spacer()
                        Button("前の資料") { stepCollection(-1) }.disabled(visibleBooks.isEmpty)
                        Button("次の資料") { stepCollection(1) }.disabled(visibleBooks.isEmpty)
                    }.padding(.horizontal, 22).padding(.bottom, 10)
                }
                Divider()
                if visibleBooks.isEmpty && collectionCards.isEmpty {
                    ContentUnavailableView(store.settings.sources.isEmpty ? "資料の本棚をはじめる" : "資料がありません", systemImage: "books.vertical", description: Text(store.settings.sources.isEmpty ? "生成済みの outputs フォルダを登録してください。" : "検索条件やフォルダを変更してください。"))
                    if store.settings.sources.isEmpty { Button("資料フォルダを登録…") { store.addSource() }.buttonStyle(.borderedProminent).padding(.bottom, 70) }
                } else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: cardSize), spacing: 20)], spacing: 24) {
                            ForEach(collectionCards) { collection in
                                Button { shelf = "collection:" + collection.id.uuidString; selection.clear() } label: {
                                    VStack(alignment: .leading, spacing: 10) {
                                        CoverImage(url: store.settings.members(of: collection, books: store.books).first?.latest.thumbnail).frame(height: 148).frame(maxWidth: .infinity).background(.white)
                                        Text(collection.title).font(.headline)
                                        Text("\(collection.members.count)件のまとめ").font(.caption)
                                    }.padding(12).background(Color(nsColor: .controlBackgroundColor)).clipShape(RoundedRectangle(cornerRadius: 12))
                                }.buttonStyle(.plain).contextMenu { Button("まとめを編集") { collectionDraft = collection } }
                            }
                            ForEach(gridBooks) { book in
                                BookCard(book: book, selected: selection.ids.contains(book.id))
                                    .overlay(GeometryReader { geometry in CardDragSurface(payload: {
                                        if !selection.ids.contains(book.id) { selection.click(book.id, orderedIDs: visibleBooks.map(\.id)) }
                                        return selection.dragPayload(for: book.id)
                                    }, click: { flags, count in
                                        selection.click(book.id, orderedIDs: visibleBooks.map(\.id), toggle: flags.contains(.command), extend: flags.contains(.shift))
                                        if count == 2, let url = book.latest.preview { NSWorkspace.shared.open(url) }
                                    }).frame(width: geometry.size.width, height: geometry.size.height) })
                                    .contextMenu { Button("グループ・タグを編集") { classificationDraft = book }; assignmentMenu(selection.targets(for: book.id)); Button("Finderで表示") { NSWorkspace.shared.activateFileViewerSelecting([book.latest.directory]) } }
                                    .accessibilityElement(children: .combine).accessibilityAddTraits(.isButton)
                                    .accessibilityValue(selection.ids.contains(book.id) ? "選択中" : "未選択")
                                    .accessibilityAction { select(book.id) }
                            }
                        }.padding(24)
                    }
                }
                Spacer(minLength: 0)
                Divider()
                VStack(spacing: 10) {
                    HStack {
                    if !selection.ids.isEmpty {
                        Text("\(selection.ids.count) 冊を選択").font(.callout.bold())
                        assignmentMenu(selection.ids)
                        Button("選択からまとめ") {
                            let members = visibleBooks.filter { selection.ids.contains($0.id) && BookReference(book: $0).canCollect }.map(BookReference.init(book:))
                            collectionDraft = ReadingCollection(id: UUID(), title: "", members: Array(members.prefix(100)))
                        }.disabled(selection.ids.count > 100 || visibleBooks.contains { selection.ids.contains($0.id) && !BookReference(book: $0).canCollect })
                        Button("選択を解除") { selection.clear() }.buttonStyle(.plain)
                    } else {
                        Text("⌘クリックで複数選択 · Shiftクリックで範囲選択").font(.caption).foregroundStyle(.secondary)
                    }
                    if !visibleBooks.isEmpty { Button("すべて選択") { selection.selectAll(visibleBooks.map(\.id)) }.buttonStyle(.plain) }
                    Spacer()
                    }
                    HStack {
                    if !store.warnings.isEmpty { Button("読込の注意 \(store.warnings.count) 件") { showWarnings = true }.buttonStyle(.plain).foregroundStyle(.orange) }
                    Spacer(); Image(systemName: "square.grid.2x2").foregroundStyle(.secondary)
                    Slider(value: $cardSize, in: 170...330).frame(width: 110).help("サムネイルの大きさ")
                    }
                }.padding(12)
            }.background(Color(nsColor: .underPageBackgroundColor))
            .navigationSplitViewColumnWidth(min: 420, ideal: 750)
        } detail: {
            if let book = store.books.first(where: { $0.id == selection.focusedID }) {
                VStack(spacing: 0) {
                    HStack {
                        Text(store.settings.classification(for: book).group.rawValue).font(.caption)
                        Text(store.settings.classification(for: book).tags.joined(separator: " · ")).font(.caption).lineLimit(2)
                        Spacer(); Button("タグを編集") { classificationDraft = book }
                    }.padding(12)
                    BookDetail(book: book).id(book.id)
                }
            }
            else { ContentUnavailableView("資料を選択", systemImage: "doc.text.magnifyingglass", description: Text("表紙を選ぶと、ここで閲覧できます。")) }
        }
        .onChange(of: visibleBooks.map(\.id)) { _, ids in selection.retainVisible(ids) }
        .searchable(text: $search, prompt: "タイトル・資料ID・タグで検索")
        .sheet(item: $syncLab) { SyncLabView(session: $0) }
        .sheet(isPresented: $syncSetup) { SyncSetupView(available: store.organizationSyncAvailable) { try await store.connectOrganizationSync() } }
        .sheet(item: $classificationDraft) { book in ClassificationEditor(book: book, value: store.settings.classification(for: book)).environmentObject(store) }
        .sheet(item: $collectionDraft) { value in CollectionEditor(value: value).environmentObject(store) }
        .toolbar {
            Button("整理情報の同期", systemImage: "icloud") { syncSetup = true }
            Button("同期の検証", systemImage: "arrow.triangle.2.circlepath") { syncLab = store.makeSyncLab() }
            if let folderID {
                Menu("フォルダ", systemImage: "folder.badge.gearshape") {
                    Button("アイコン画像を設定…") { store.chooseFolderIcon(folderID) }
                    Button("標準アイコンに戻す") { store.resetFolderIcon(folderID) }
                }
            }
            Button { Task { await store.refresh() } } label: { Label("更新", systemImage: "arrow.clockwise") }.disabled(store.busy) }
        .alert(editingFolder == nil ? "フォルダを作成" : "名前を変更", isPresented: $folderDialog) {
            TextField("フォルダ名", text: $folderName)
            Button("キャンセル", role: .cancel) {}
            Button("保存") {
                let name = folderName.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !name.isEmpty else { return }
                store.change { settings in
                    if let id = editingFolder, let index = settings.folders.firstIndex(where: { $0.id == id }) { settings.folders[index].name = name }
                    else { settings.folders.append(ShelfFolder(name: name, parentID: folderID)) }
                }
            }
        } message: { Text(editingFolder == nil && folderID != nil ? "選択中のフォルダ内に作成します。" : "本棚の分類情報だけを変更します。") }
        .alert("本棚のエラー", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) { Button("閉じる") { store.error = nil } } message: { Text(store.error ?? "") }
        .sheet(isPresented: $showWarnings) { VStack(alignment: .leading) { Text("読込の注意").font(.title2); Text("読めないパッケージは一覧から除外しています。ハッシュ検証は実施しません。").foregroundStyle(.secondary); ScrollView { Text(store.warnings.joined(separator: "\n\n")).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading) }; Button("閉じる") { showWarnings = false } }.padding(24).frame(width: 680, height: 450) }
    }
    private func stepCollection(_ delta: Int) {
        guard !visibleBooks.isEmpty else { return }
        let current = visibleBooks.firstIndex { $0.id == selection.focusedID }
        let next = current.map { min(max($0 + delta, 0), visibleBooks.count - 1) } ?? 0
        selection.click(visibleBooks[next].id, orderedIDs: visibleBooks.map(\.id))
    }
    private func folderContextMenu(_ folder: ShelfFolder) -> NSMenu {
        let menu = NSMenu()
        menu.addItem(FolderMenuAction("アイコン画像を設定…") { store.chooseFolderIcon(folder.id) })
        if folder.iconFile != nil { menu.addItem(FolderMenuAction("標準アイコンに戻す") { store.resetFolderIcon(folder.id) }) }
        menu.addItem(.separator())
        menu.addItem(FolderMenuAction("名前を変更…") { editingFolder = folder.id; folderName = folder.name; folderDialog = true })
        menu.addItem(FolderMenuAction("フォルダを解除") { store.change { $0.removeFolder(folder.id) }; shelf = "all" })
        return menu
    }
    private func select(_ id: String) {
        let modifiers = NSEvent.modifierFlags
        selection.click(id, orderedIDs: visibleBooks.map(\.id), toggle: modifiers.contains(.command), extend: modifiers.contains(.shift))
    }
    @ViewBuilder func assignmentMenu(_ ids: Set<String>) -> some View {
        Menu(ids.count > 1 ? "\(ids.count)冊をフォルダへ移動" : "フォルダへ移動") {
            Button("未整理") { store.change { $0.moveBooks(ids, to: nil) } }
            ForEach(store.settings.folders) { folder in
                Button(store.folderPath(folder.id)) { store.change { $0.moveBooks(ids, to: folder.id) } }
            }
        }
    }
}

struct BookCard: View {
    let book: Book
    let selected: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            CoverImage(url: book.latest.thumbnail ?? book.latest.preview)
                .frame(height: 148).frame(maxWidth: .infinity).background(.white).clipShape(RoundedRectangle(cornerRadius: 7))
            Text(book.latest.title).font(.system(size: 13, weight: .medium)).lineLimit(2).frame(height: 36, alignment: .topLeading)
            HStack { Text("\(book.latest.pageCount) ページ"); Spacer(); Text("v\(book.latest.version)") }.font(.caption).foregroundStyle(.secondary)
        }.padding(12).background(selected ? Color.accentColor.opacity(0.12) : Color(nsColor: .controlBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 12)).overlay(RoundedRectangle(cornerRadius: 12).stroke(selected ? Color.accentColor : Color.primary.opacity(0.07), lineWidth: selected ? 2 : 1))
    }
}
struct CoverImage: View {
    let url: URL?
    @State private var image: NSImage?
    var body: some View {
        Group { if let image { Image(nsImage: image).resizable().scaledToFit() } else { Image(systemName: "doc.richtext").font(.system(size: 40)).foregroundStyle(.gray) } }
            .task(id: url) {
                image = nil
                guard let url else { return }
                // ImageIO downsamples large original PNGs; visible cards retain only thumbnail pixels.
                if url.pathExtension.lowercased() == "pdf" {
                    image = PDFDocument(url: url)?.page(at: 0)?.thumbnail(of: NSSize(width: 600, height: 400), for: .mediaBox)
                } else {
                    let result = await Task.detached(priority: .utility) { () -> CGImage? in
                        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
                        return CGImageSourceCreateThumbnailAtIndex(source, 0, [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: 700, kCGImageSourceCreateThumbnailWithTransform: true] as CFDictionary)
                    }.value
                    if !Task.isCancelled, let result { image = NSImage(cgImage: result, size: .zero) }
                }
            }
    }
}
struct BookDetail: View {
    let book: Book
    @State private var editionIndex = 0
    @State private var file: URL?
    var edition: BookEdition { book.editions[min(editionIndex, book.editions.count - 1)] }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(edition.title).font(.title3.bold()).textSelection(.enabled)
            Picker("版", selection: $editionIndex) { ForEach(Array(book.editions.enumerated()), id: \.offset) { index, edition in Text("v\(edition.version) · \(edition.pageCount)ページ").tag(index) } }
            if let preview = file ?? edition.preview { DocumentPreview(url: preview).id(preview).frame(maxWidth: .infinity, maxHeight: .infinity) }
            else { ContentUnavailableView("プレビューできません", systemImage: "doc.questionmark") }
            HStack {
                Menu("形式を選ぶ") { ForEach(edition.files, id: \.self) { url in Button(url.lastPathComponent) { file = url } } }
                Spacer()
                Button { if let url = file ?? edition.preview { NSWorkspace.shared.open(url) } } label: { Image(systemName: "arrow.up.right.square") }.help("標準アプリで開く")
                Button { NSWorkspace.shared.activateFileViewerSelecting([edition.directory]) } label: { Image(systemName: "folder") }.help("Finderで表示")
            }
            Text(book.id).font(.caption2).foregroundStyle(.tertiary).textSelection(.enabled)
        }.padding(18).onChange(of: editionIndex) { _, _ in file = nil }
    }
}
struct DocumentPreview: NSViewRepresentable {
    let url: URL
    func makeNSView(context: Context) -> NSView {
        if url.pathExtension.lowercased() == "pdf" {
            let view = PDFView(); view.autoScales = true; view.displayMode = .singlePageContinuous; view.document = PDFDocument(url: url); return view
        }
        let view = QLPreviewView(frame: .zero, style: .normal)!
        view.autostarts = true; view.previewItem = url as NSURL; return view
    }
    func updateNSView(_ nsView: NSView, context: Context) {}
}

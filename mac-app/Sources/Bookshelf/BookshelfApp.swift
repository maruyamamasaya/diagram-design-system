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
        WindowGroup("図鑑 — 資料の本棚") { ShelfView().environmentObject(store).frame(minWidth: 1000, minHeight: 650).bookshelfAppearance() }
        .defaultSize(width: 1380, height: 860)
        .commands { CommandGroup(after: .newItem) {
            Button("S3へログイン・更新") { Task { await store.refreshCloud(login: true) } }.keyboardShortcut("o")
            Button("本棚を更新") { Task { await store.refresh() } }.keyboardShortcut("r")
        } }
    }
}
struct ShelfView: View {
    @Environment(\.bookshelfTheme) private var theme
    @EnvironmentObject var store: ShelfStore
    @State private var shelf: String? = "all"
    @State private var selection = BookSelection()
    @State private var search = ""
    @State private var folderName = ""
    @State private var editingFolder: UUID?
    @State private var folderDialog = false
    @State private var sortBy = "updated"
    @State private var cardSize = 160.0
    @State private var showWarnings = false
    @State private var selectedKind = "presentation"
    @State private var selectedGroup = "すべて"
    @State private var selectedTag = ""
    @State private var classificationDraft: Book?
    @State private var syncLab: SyncLabSession?
    @State private var syncSetup = false
    @State private var trashIDs = Set<String>()
    @State private var confirmTrash = false
    var selectedCollection: ReadingCollection<BookReference>? { store.settings.collections.first { shelf == $0.id.uuidString } }
    var libraryShelf: LibraryShelf { selectedKind == "presentation" ? .presentation : .illustration }
    var folders: [ShelfFolder] { store.folderOrganization.folders(in: libraryShelf) }
    var gridBooks: [Book] { visibleBooks }
    var folderID: UUID? { shelf.flatMap(UUID.init(uuidString:)) }
    var visibleBooks: [Book] {
        let organization = store.folderOrganization
        let candidates = store.books
        let books = candidates.filter { book in
            let inShelf = shelf == "unfiled" ? !organization.isFiled(book.id, memberID: { $0.id }) : folderID.map { organization.containsDocument(book.id, in: $0, memberID: { $0.id }) } ?? true
            let classification = store.settings.classification(for: book)
            let inKind = selectedKind == "all" || (selectedKind == "presentation" ? book.latest.kind == "presentation" : book.latest.kind != "presentation")
            return store.visibleInLibrary(book.id) && inKind && inShelf && (selectedGroup == "すべて" || classification.group.rawValue == selectedGroup)
                && (selectedTag.isEmpty || classification.tags.contains { $0.localizedCaseInsensitiveCompare(selectedTag) == .orderedSame })
                && (search.isEmpty || book.latest.title.localizedStandardContains(search) || book.id.localizedStandardContains(search) || classification.tags.contains { $0.localizedStandardContains(search) })
        }
        if let collection = selectedCollection {
            let ranks = Dictionary(collection.members.enumerated().map { ($0.element.id, $0.offset) }, uniquingKeysWith: min)
            return books.sorted { (ranks[$0.id] ?? Int.max) < (ranks[$1.id] ?? Int.max) }
        }
        return books.sorted { sortBy == "title" ? $0.latest.title.localizedStandardCompare($1.latest.title) == .orderedAscending : $0.latest.modified > $1.latest.modified }
    }
    var body: some View {
        NavigationSplitView {
            List(selection: $shelf) {
                Section("本棚") {
                    Picker("資料の種類", selection: $selectedKind) {
                        Text("プレゼン").tag("presentation")
                        Text("図解").tag("illustration")
                    }.pickerStyle(.menu).labelsHidden().accessibilityLabel("資料の種類")
                    Label("すべて", systemImage: "books.vertical").tag("all")
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
                    ForEach(folders) { folder in
                        Label {
                            Text(folder.name)
                        } icon: {
                            if let url = store.iconURL(for: folder), let image = NSImage(contentsOf: url) {
                                Image(nsImage: image).resizable().scaledToFit().frame(width: 22, height: 22).clipShape(RoundedRectangle(cornerRadius: 4))
                            } else { Image(systemName: "folder") }
                        }.padding(.leading, CGFloat(max(0, store.folderPath(folder.id).components(separatedBy: " / ").count - 1)) * 12)
                            .accessibilityLabel(store.folderPath(folder.id))
                            .tag(folder.id.uuidString)
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
                } header: { Text("フォルダ") }
                Section {
                    Label("ゴミ箱", systemImage: "trash").tag("trash")
                }
                Section {
                    Menu {
                        Button("フォルダを作成", systemImage: "folder.badge.plus") { editingFolder = nil; folderName = ""; folderDialog = true }
                        Divider()
                        Button("S3へログイン・更新", systemImage: "cloud") { Task { await store.refreshCloud(login: true) } }
                        Button("整理情報の同期", systemImage: "icloud") { syncSetup = true }
                        Menu("詳細") { Button("同期の検証") { syncLab = store.makeSyncLab() } }
                    } label: { Label("本棚を管理", systemImage: "slider.horizontal.3") }
                }

            }
            .listStyle(.sidebar).scrollContentBackground(.hidden)
            .background(BookshelfMaterial())
            .navigationSplitViewColumnWidth(min: 210, ideal: 235, max: 340)
        } content: {
            Group {
            if shelf == "trash" { CommonTrashView(embedded: true).environmentObject(store) }
            else {
            VStack(spacing: 0) {
                HStack {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(folderID.map { id in folders.first(where: { $0.id == id })?.name ?? store.folderPath(id) } ?? (shelf == "unfiled" ? "未整理" : "すべての資料")).font(.headline)
                        Text("\(visibleBooks.count) 冊 · 改訂版と各形式をひとまとめに表示").font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    if store.busy { ProgressView().controlSize(.small) }
                    Picker("並べ替え", selection: $sortBy) { Text("更新順").tag("updated"); Text("名前順").tag("title") }.labelsHidden().frame(width: 105)
                }.padding(.horizontal, 22).padding(.vertical, 12)
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
                Divider()
                if visibleBooks.isEmpty {
                    ContentUnavailableView(store.settings.sources.isEmpty ? "資料の本棚をはじめる" : "資料がありません", systemImage: "books.vertical", description: Text(store.usesCloudCatalog ? "S3へログインして本棚を更新してください。" : "検索条件やフォルダを変更してください。"))
                    if store.usesCloudCatalog { Button("S3へログイン・更新") { Task { await store.refreshCloud(login: true) } }.buttonStyle(.borderedProminent).padding(.bottom, 70) }
                } else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: cardSize), spacing: 20)], spacing: 24) {
                            ForEach(gridBooks) { book in
                                BookCard(book: book, selected: selection.ids.contains(book.id))
                                    .overlay(GeometryReader { geometry in CardDragSurface(payload: {
                                        if !selection.ids.contains(book.id) { selection.click(book.id, orderedIDs: visibleBooks.map(\.id)) }
                                        return selection.dragPayload(for: book.id)
                                    }, click: { flags, count in
                                        selection.click(book.id, orderedIDs: visibleBooks.map(\.id), toggle: flags.contains(.command), extend: flags.contains(.shift))
                                        if count == 2, let url = book.latest.preview { NSWorkspace.shared.open(url) }
                                    }).frame(width: geometry.size.width, height: geometry.size.height) })
                                    .contextMenu { Button("グループ・タグを編集") { classificationDraft = book }; assignmentMenu(selection.targets(for: book.id)); Button("共通ゴミ箱へ移動", role: .destructive) { trashIDs = selection.targets(for: book.id); confirmTrash = true }.disabled(!store.lifecycleEnabled || store.lifecycleBusy); Button("Finderで表示") { NSWorkspace.shared.activateFileViewerSelecting([book.latest.directory]) } }
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
                        Button("選択からフォルダを作成") { editingFolder = nil; folderName = ""; folderDialog = true }
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
                    Slider(value: $cardSize, in: 120...220).frame(width: 110).help("サムネイルの大きさ")
                    }
                }.padding(12)
            }.background(theme.canvas)
            }
            }.navigationSplitViewColumnWidth(min: 420, ideal: 750)
        } detail: {
            Group {
            if let book = store.books.first(where: { $0.id == selection.focusedID && store.visibleInLibrary($0.id) }) {
                VStack(spacing: 0) {
                    HStack {
                        Text(store.settings.classification(for: book).group.rawValue).font(.caption)
                        Text(store.settings.classification(for: book).tags.joined(separator: " · ")).font(.caption).lineLimit(2)
                        Spacer(); Button("タグを編集") { classificationDraft = book }
                    }.padding(12)
                    BookDetail(book: book).id(store.cloudTaskKey(book.id))
                        .task(id: store.cloudTaskKey(book.id)) { await store.prepareCloudBook(book.id, preview: true) }
                }
            }
            else { ContentUnavailableView("資料を選択", systemImage: "doc.text.magnifyingglass", description: Text("表紙を選ぶと、ここで閲覧できます。")) }
            }.frame(maxWidth: .infinity, maxHeight: .infinity).background(theme.canvas)
        }
        .onChange(of: visibleBooks.map(\.id)) { _, ids in selection.retainVisible(ids) }
        .searchable(text: $search, prompt: "タイトル・資料ID・タグで検索")
        .onChange(of: shelf) { _, _ in selection.clear() }
        .onChange(of: selectedKind) { _, _ in shelf = "all"; selection.clear(); selectedGroup = "すべて"; selectedTag = "" }
        .alert("\(trashIDs.count)件を共通ゴミ箱へ移しますか？", isPresented: $confirmTrash) {
            Button("キャンセル", role: .cancel) {}
            Button("ゴミ箱へ移動", role: .destructive) { let ids = trashIDs; Task { await store.setTrashed(ids, trashed: true) } }
        } message: { Text("スマホとMacの通常一覧から外れます。完全削除するまで復元できます。登録フォルダの制作原本は変更しません。") }
        .sheet(item: $syncLab) { SyncLabView(session: $0) }
        .sheet(isPresented: $syncSetup) { SyncSetupView(available: store.organizationSyncAvailable) { try await store.connectOrganizationSync() } }
        .sheet(item: $classificationDraft) { book in ClassificationEditor(book: book, value: store.settings.classification(for: book)).environmentObject(store) }
        .toolbar {
            BookshelfThemePicker()
            Button { Task { await store.refresh() } } label: { Label("更新", systemImage: "arrow.clockwise") }.disabled(store.busy)
        }
        .alert(editingFolder == nil ? "フォルダを作成" : "名前を変更", isPresented: $folderDialog) {
            TextField("フォルダ名", text: $folderName)
            Button("キャンセル", role: .cancel) {}
            Button("保存") {
                let name = folderName.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !name.isEmpty else { return }
                store.change { settings in
                    settings.folders = settings.organization.folders
                    if let id = editingFolder, let index = settings.folders.firstIndex(where: { $0.id == id }) { settings.folders[index].name = name }
                    else {
                        settings.createFolder(name: name, shelf: libraryShelf, parentID: folderID)
                        if let created = settings.folders.last { settings.moveBooks(selection.ids, to: created.id) }
                    }
                }
            }
        } message: { Text(editingFolder == nil && folderID != nil ? "選択中のフォルダ内に作成します。" : "本棚の分類情報だけを変更します。") }
        .alert("本棚のエラー", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) { Button("閉じる") { store.error = nil } } message: { Text(store.error ?? "") }
        .sheet(isPresented: $showWarnings) { VStack(alignment: .leading) { Text("読込の注意").font(.title2); Text("読めないパッケージは一覧から除外しています。ハッシュ検証は実施しません。").foregroundStyle(.secondary); ScrollView { Text(store.warnings.joined(separator: "\n\n")).textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading) }; Button("閉じる") { showWarnings = false } }.padding(24).frame(width: 680, height: 450) }
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
            ForEach(folders) { folder in
                Button(store.folderPath(folder.id)) { store.change { $0.moveBooks(ids, to: folder.id) } }
            }
        }
    }
}

struct BookCard: View {
    @EnvironmentObject var store: ShelfStore
    let book: Book
    let selected: Bool
    var body: some View {
        SquareBookCard(title: book.latest.title, coverURL: book.latest.thumbnail ?? book.latest.preview, selected: selected) { EmptyView() }
            .task(id: store.cloudTaskKey(book.id)) { await store.prepareCloudBook(book.id, preview: false) }
    }
}

/// A common square outer frame keeps documents and collections aligned.
struct SquareBookCard<Caption: View>: View {
    let title: String
    let coverURL: URL?
    var selected = false
    @ViewBuilder var caption: () -> Caption
    var body: some View {
        Color.clear.aspectRatio(1, contentMode: .fit)
            .overlay {
                VStack(alignment: .leading, spacing: 10) {
                    Color.white.overlay { CoverImage(url: coverURL) }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .clipShape(RoundedRectangle(cornerRadius: 7))
                    Text(title).font(.system(size: 13, weight: .medium))
                        .lineLimit(2, reservesSpace: true).truncationMode(.tail)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    caption().font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }.padding(12)
            }
            .bookshelfCard(selected: selected)
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
    @EnvironmentObject var store: ShelfStore
    let book: Book
    @State private var editionIndex = 0
    @State private var file: URL?
    var edition: BookEdition { book.editions[min(editionIndex, book.editions.count - 1)] }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(edition.title).font(.title3.bold()).textSelection(.enabled)
            Picker("版", selection: $editionIndex) { ForEach(Array(book.editions.enumerated()), id: \.offset) { index, edition in Text("v\(edition.version) · \(edition.pageCount)ページ").tag(index) } }
            if let preview = file ?? edition.preview { DocumentPreview(url: preview).id(preview).frame(maxWidth: .infinity, maxHeight: .infinity) }
            else if store.cloudPreviewErrors.contains(book.id) {
                ContentUnavailableView {
                    Label("資料を取得できませんでした", systemImage: "exclamationmark.icloud")
                } description: {
                    Text("接続を確認して、もう一度お試しください。")
                } actions: {
                    Button("再取得") { Task { await store.prepareCloudBook(book.id, preview: true) } }
                }
            } else { ContentUnavailableView("資料を取得中", systemImage: "icloud.and.arrow.down", description: Text("S3からプレビューを準備します。")) }
            HStack {
                Menu("形式を選ぶ") {
                    ForEach(edition.files, id: \.self) { url in Button(url.lastPathComponent) { file = url } }
                    ForEach(store.cloudFormats(book.id), id: \.self) { format in
                        Button("\(format.uppercased())を取得") { Task { file = await store.prepareCloudBook(book.id, preview: true, artifact: format) } }
                    }
                }
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

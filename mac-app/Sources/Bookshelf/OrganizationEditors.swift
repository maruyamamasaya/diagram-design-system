import SwiftUI
import BookshelfCore
import LibraryOrganization

struct ClassificationEditor: View {
    @EnvironmentObject var store: ShelfStore
    @Environment(\.dismiss) private var dismiss
    let book: Book
    @State private var group: LibraryGroup
    @State private var tags: [String]
    @State private var newTag = ""
    init(book: Book, value: LibraryClassification) {
        self.book = book; _group = State(initialValue: value.group); _tags = State(initialValue: value.tags)
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("グループ・タグを編集").font(.title2)
            Text(book.latest.title).lineLimit(2)
            Picker("グループ", selection: $group) { ForEach(LibraryGroup.allCases, id: \.self) { Text($0.rawValue).tag($0) } }
            List { ForEach(Array(tags.enumerated()), id: \.offset) { index, tag in
                HStack { Text(tag); Spacer(); Button("削除") { tags.remove(at: index) } }
            } }
            HStack { TextField("新しいタグ", text: $newTag).onSubmit(addTag); Button("追加", action: addTag) }
            HStack { Button("キャンセル") { dismiss() }; Button("原本の分類に戻す") {
                if store.change({ $0.classifications.removeValue(forKey: book.id) }) { dismiss() }
            }; Spacer(); Button("保存") {
                if store.change({ $0.setClassification(for: book.id, group: group, tags: tags + [newTag]) }) { dismiss() }
            }.keyboardShortcut(.defaultAction) }
        }.padding(24).frame(width: 480, height: 420)
    }
    private func addTag() { tags = LibraryClassification.normalizedTags(tags + [newTag]); newTag = "" }
}

struct CollectionEditor: View {
    @EnvironmentObject var store: ShelfStore
    @Environment(\.dismiss) private var dismiss
    let id: UUID
    @State private var title: String
    @State private var members: [BookReference]
    @State private var query = ""
    @State private var error: String?
    init(value: ReadingCollection<BookReference>) {
        id = value.id; _title = State(initialValue: value.title); _members = State(initialValue: value.members)
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("図解のまとめを編集").font(.title2)
            TextField("まとめの名前", text: $title)
            Text("読む順番 · \(members.count)/100件").font(.headline)
            List {
                ForEach(Array(members.enumerated()), id: \.element.id) { index, member in
                    HStack {
                        Text("\(index + 1). \(member.title)").lineLimit(2)
                        if !store.books.contains(where: { $0.id == member.id }) { Text("未取得").foregroundStyle(.secondary) }
                        Spacer()
                        Button("上へ") { members.swapAt(index, index - 1) }.disabled(index == 0)
                        Button("下へ") { members.swapAt(index, index + 1) }.disabled(index == members.count - 1)
                        Button("外す") { members.remove(at: index) }
                    }
                }
            }.frame(height: 200)
            TextField("追加する図解を検索", text: $query)
            ScrollView {
                LazyVStack(alignment: .leading) {
                    ForEach(store.books.filter { book in BookReference(book: book).canCollect && !members.contains(where: { $0.id == book.id }) && (query.isEmpty || book.latest.title.localizedStandardContains(query)) }) { book in
                        Button("＋ \(book.latest.title)") { members.append(BookReference(book: book)) }.disabled(members.count >= 100).padding(.vertical, 3)
                    }
                }
            }.frame(height: 150)
            if let error { Text(error).foregroundStyle(.red) }
            HStack { Button("キャンセル") { dismiss() }; Spacer(); Button("保存") {
                var next = store.settings
                do {
                    try next.saveCollection(ReadingCollection(id: id, title: title.trimmingCharacters(in: .whitespacesAndNewlines), members: members))
                    if store.change({ $0.collections = next.collections }) { dismiss() }
                } catch { self.error = "名前は1〜120文字、図解は重複なしで1〜100件にしてください。" }
            }.keyboardShortcut(.defaultAction) }
        }.padding(24).frame(width: 700, height: 620)
    }
}

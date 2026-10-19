import SwiftUI
import LibraryOrganization

struct CommonTrashView: View {
    @EnvironmentObject var store: ShelfStore
    @Environment(\.dismiss) private var dismiss
    @State private var selection = Set<String>()
    @State private var plans: [LibraryDeletionPlan] = []
    @State private var confirming = false
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Label("ゴミ箱", systemImage: "trash").font(.title2)
                Spacer()
                if store.lifecycleBusy { ProgressView().controlSize(.small) }
                Button("更新") { Task { await store.refreshLifecycle(login: true) } }.disabled(!store.lifecycleEnabled || store.lifecycleBusy)
                Button("閉じる") { dismiss() }
            }
            Text(store.lifecycleEnabled ? "iPhone・Mac共通。完全削除するまで元のフォルダへ復元できます。" : "共通ゴミ箱はサーバー反映待ちです。制作原本は変更しません。")
                .font(.callout).foregroundStyle(.secondary)
            List(store.trashEntries, selection: $selection) { entry in
                HStack {
                    Image(systemName: "doc.richtext")
                    VStack(alignment: .leading) {
                        Text(entry.document.title)
                        Text(entry.status == .deleting ? "削除中・再試行できます" : "\(entry.document.pageCount)ページ · 復元可能")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }.tag(entry.id)
            }.frame(minHeight: 220)
            HStack {
                Text("\(selection.count)件を選択").foregroundStyle(.secondary)
                Button("すべて選択") { selection = Set(store.trashEntries.map(\.id)) }
                Spacer()
                Button("復元") { let ids = selection; Task { await store.setTrashed(ids, trashed: false) } }
                    .disabled(selection.isEmpty || store.trashEntries.contains { selection.contains($0.id) && $0.status == .deleting } || store.lifecycleBusy || !store.lifecycleEnabled)
                Button("完全削除…", role: .destructive) {
                    Task { if let value = await store.deletionPlans(selection), !value.isEmpty { plans = value; confirming = true } }
                }.disabled(selection.isEmpty || store.lifecycleBusy || !store.lifecycleEnabled)
            }
        }.padding(24).frame(minWidth: 620, minHeight: 400)
        .task { await store.refreshLifecycle() }
        .onChange(of: store.trashEntries.map(\.id)) { _, ids in selection.formIntersection(Set(ids)) }
        .alert("\(plans.count)件を完全削除しますか？", isPresented: $confirming) {
            Button("キャンセル", role: .cancel) { plans = [] }
            Button("完全削除する", role: .destructive) { let confirmed = plans; plans = []; Task { await store.permanentlyDelete(confirmed) } }
        } message: {
            Text("S3の全版・成果物容量\(ByteCountFormatter.string(fromByteCount: plans.reduce(Int64(0)) { $0 + $1.sizeBytes }, countStyle: .file))と、スマホ・Macのアプリ内コピーを削除します。復元できません。オフライン端末は次の接続時に削除します。登録フォルダの制作原本は残ります。")
        }
    }
}

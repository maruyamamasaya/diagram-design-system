# Macのタグ・図解まとめ

## Request
MacへiOSに合わせたタグ/まとめ表示編集を追加。既存資料/フォルダは維持、同期/AWS変更なし。

## Investigation / Changes
BookshelfCoreにURLを持たないBookReference、分類編集とタグ正規化、まとめ保存/最新版解決を追加。スキャナはschema/識別キーから図解種別と原本タグを読む。LibrarySettingsへclassifications/collectionsを追加し旧JSONでは空としてdecode。既存フォルダ/画像/順序/所属/sourcesは維持。保存は既存の原子的処理、成功時だけシートを閉じる。

ShelfViewはグループ/タグAND絞込・タグ検索・詳細で分類表示、図解まとめカードと一覧/順番での前後切替。OrganizationEditors.swiftは分類/自由タグ・原本へ復帰、まとめ名/追加/除外/上下順の編集。iOS同様PNG/PDF図解1〜100、名前1〜120、重複なし。プレゼンをまとめへ追加しない。解除は設定だけ。未取得のスナップショットを残す。全て/絞込なし/未選択ではまとめを1カード化し個別を隠す。フォルダ/分類絞込・選択中は個別表示。iOSのページ連結とは異なりMacは既存プレビューを資料単位で切替。

## Files Changed
mac-app/Package.swift、BookshelfCore/Library.swiftとOrganization.swift、Bookshelf/BookshelfApp.swift/Store.swift/OrganizationEditors.swift、OrganizationTests.swift。CURRENT/CODEMAP/TESTING/mac-app README/共通仕様。

## Validation
- Swift23テスト/失敗0。旧設定互換/タグ正規化/空タグ上書き/まとめ保存復元/順序/最新版/未取得/入力制限/解除で分類保持を追加。
- 実outputs65冊/152版/注意0。release build、Applications上書き、署名検証、git diff --check合格。
- CUA専用で実画面：資料タグ編集→未追加入力を保存→タグ検索で1冊、2冊選択からまとめ作成→2番目を上へ→保存→1カード表示→読む順で前後プレビュー。
- 終了/再起動後にまとめ順とタグ保持を確認。確認用タグを原本へ復帰、確認用まとめを解除。元の設定キーの値と分類/まとめは検証前スナップショットと一致。既存65冊/技術フォルダ保持。
- 画像証跡：mac-app/.build/validation/tags-collections/{reader,after-restart}.png。

## Result / Remaining Issues
普段使うApplications版へ反映済み。iOS/同期/AWS変更なし。今回の全入力/全表示サイズの保証ではない。Macのまとめは資料単位閲覧でPNGページ連結/全画面まとめ一括保存は未追加。

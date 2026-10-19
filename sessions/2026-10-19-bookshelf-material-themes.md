# 屋久杉・黒漆の本棚テーマ

- Request：本人が比較モックを採用し、画像生成素材・ダーク基調・低コントラストを指定。
- Investigation：Macと隣接zukanのSwiftUI本棚・共有UI・署名経路を確認。先行の未コミット変更を保持。
- Changes：共通テーマ/端末別保存/素材面/カード/選択メニュー、生成PNG2種、Macリソース同梱を追加。iPhone横向きと資料色を維持。
- Files Changed：共有UI/Package.swift、Mac BookshelfApp/build-app、zukan本棚/アプリ/カード、入口文書、[仕様](../docs/bookshelf-material-themes.md)。
- Validation：共通43、Mac27（1スキップ）、iPad/iPhone各71 XCTest成功。3画面の2素材目視、Mac/iPhone再起動保持。Mac Applications更新・署名検証成功。
- Result：Mac Applications版と、Mira/Vesperaへ更新・起動成功（10:58 JST）。実機配備は仕様末尾に記録。
- Remaining Issues：本人の実機評価、長時間利用、大文字/コントラスト増加の目視は未実施。AWS変更なし。

# Macの資料カードを正方形へ統一

本人依頼：iOSと同じ正方形・同サイズ、タイトル最大2行・超過は省略。

BookshelfApp.swiftにSquareBookCardを追加し、BookCardとまとめカードで共用。カード全体を1:1にし、表紙は残り領域へscaledToFit、タイトルは2行分を常に確保して末尾省略、補足は1行。既存サイズスライダーに合わせて同一グリッド内で同サイズになる。既存ドラッグ・選択・プレビュー・素材テーマを維持。

Mac全27テスト、1件スキップ、失敗0。release build/codesign成功。Applications版へ更新・起動、配布実行ファイルSHA256一致。実UIで複数カードの正方形外枠と、短い/2行タイトルで高さが一致することを目視。ログはoutputs/mac-square-card-tests.log、mac-square-card-build.log。利用者が操作しているプレビューや選択を保持し、追加の操作は行わなかった。資料/設定/AWS変更なし。

[仕様](../docs/mac-square-cards.md)。

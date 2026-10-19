# 素材テクスチャの描画修正

- Request：本人がテクスチャ未反映を指摘。
- Investigation：PNG同梱・名前解決・高コントラスト設定を確認。旧SwiftUI描画を再現すると素材が出ず、水平画素変動は1/255。直接復号で木目が現れ、単なる薄さではなく描画経路の問題と判定。
- Changes：PNG→NSImage/UIImage→original Imageをキャッシュ。素材が分かる合成率へ調整。素材2種/縦横2比率の画素検査を追加。
- Files Changed：共有BookshelfTheme.swift、BookshelfMaterialTests.swift、[仕様と証跡](../docs/bookshelf-material-themes.md)、入口/検証文書。既存の別作業の変更は保持。
- Validation：共通44・Mac27（1スキップ）・両Simulator各72成功。Mac/両Simulatorで2素材目視。Mac再buildの初回は別ソース更新で停止し、再実行成功。
- Result：Mac Applications・Mira/Vesperaへ修正版更新/起動成功。以前の素材目視済みの報告は確認不足と訂正。
- Remaining Issues：本人の実機質感評価、大文字/高コントラスト実操作は未実施。AWS変更なし。

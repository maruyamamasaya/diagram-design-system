# 閲覧中央の開始ボタン

- Request：資料を開いた中央からプレゼン開始。一枚図は全画面・縦横比に応じた向き。
- Investigation：Presentation-ViewerのDocumentViewerとCloudReader、既存PDF/画像/向き処理を確認。
- Changes：中央再生/拡大ボタン、資料分類による表示意図、一枚図の向き選択とページ操作非表示。PPTX既存制約を維持。
- Files Changed：別repo DocumentViewer.swift、CloudLibraryView.swift、ViewerStateTests.swift、仕様/検証/README/CURRENT。
- Validation：40 XCTest合格、Simulator中央開始/横画面/終了、一枚図全画面を目視と操作確認。署名build/codesign合格。
- Result：Vespera更新インストール・起動成功。AWS/API変更なし。
- Remaining Issues：実機操作と縦長図解の手動確認。詳細はPresentation-Viewer/docs/reader-start-button.md。

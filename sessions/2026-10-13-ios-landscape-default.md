# iOS横向き標準

- Request：縦モードを維持し、iPhone横持ちUIを標準にする。
- Investigation：別repoのアプリ全体の縦固定と閲覧終了時の縦要求を確認。
- Changes：起動時の横向き要求、通常画面の縦/左右横回転許可、プレゼン/閲覧終了時の横向き復帰。縦長図解の全画面選択は維持。
- Files Changed：Presentation-ViewerのPresentationViewerApp.swift、DocumentViewer.swift、ViewerStateTests.swift、CURRENT.md、README.md。
- Validation：Windows verify_project.pyとgit diff --check合格。Swiftコンパイル/XCTest/目視/実機更新は未実施。
- Result：ローカル実装完了。既存未コミットの透過操作UIを保持。
- Remaining Issues：Macでのビルド、起動/縦横回転/閉じる/プレゼン終了の実機確認。

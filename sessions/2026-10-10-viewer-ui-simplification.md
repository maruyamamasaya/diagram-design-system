# Viewer一覧UIの簡素化

- Request：議論で合意した検索アイコン化、全て/保存済み切替撤去、保存マーク表示の実装。
- Investigation：対象は別repo Presentation-ViewerのCloudLibraryView。既存未コミット変更を維持。
- Changes：右上検索、開閉時リセット、ID/版でクラウドと保存資料統合、保存版の端末閲覧、ブックマーク表示。
- Files Changed：Presentation-Viewer側CloudLibraryView.swift、docs/cloud-library.md、docs/ui-simplification.md、README/CURRENT/VALIDATION。
- Validation：iPhone15/iOS17.4 Simulatorの39 XCTest合格、一覧画面目視、diff whitespace確認。
- Result：実装とSimulator検証完了。AWS/API変更なし。
- Remaining Issues：検索/保存の手動操作、実機更新は未実施。詳細はPresentation-Viewer/docs/ui-simplification.md。

追記：本人が実機反映を依頼。既存Teamの署名buildとcodesign確認成功。Vesperaへ既存Bundle IDで更新インストール、更新版起動成功。実機操作は本人確認待ち。Presentation-ViewerのCURRENT/VALIDATION/検証記録へ追記。

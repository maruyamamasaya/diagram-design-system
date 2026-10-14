# メニュー幅縮小と資料閉じる操作

- Request：横向き専用版の実機成功報告後、サイドバー縮小と資料を閉じる操作の外出し。
- Investigation：別repo Development/zukan のLibraryDrawerとDocumentViewerが通常320pt。閉じるは資料メニュー内。
- Changes / Files Changed：PresentationViewerApp.swiftの右メニュー幅260pt、DocumentViewer.swiftの幅260ptと左上常設閉じる/全画面右上直接閉じる。docs/library-sidebar.md、CURRENT.mdへ記録。
- Validation：構造検査・diff --check、実機Debug buildとcodesign合格。Vespera更新インストール・更新版起動成功。既存49 XCTestは前回結果、今回は再実行なし。
- Result：Vesperaへ反映済み。
- Remaining Issues：実機操作と目視は本人確認待ち。

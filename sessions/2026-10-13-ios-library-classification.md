# iPhone資料一覧のグループ・タグ

- Request：資料ごとの仕事・私用・その他と自由タグ、一覧で切替。本人がiPhoneアプリと明示。
- Investigation：別repo Presentation-ViewerのCloudLibraryView/Store/Files、利用者別非表示・まとめ保存を確認。既存未コミット変更を保持。
- Changes：上部グループ/タグAND絞り込み、資料/まとめメニューの編集、自由タグ追加・削除、資料IDによる全版共通分類、利用者別原子保存。取得済み一覧への検索で端末自由タグを対象にする。
- Files Changed：別repoのCloudFiles.swift、CloudLibraryStore.swift、CloudLibraryView.swift、CloudLibraryTests.swift、CURRENT/README、docs/library-classification.md。
- Validation：Windows project整合性検査とdiffチェック合格。永続化・清掃/新版・利用者分離・保存失敗のXCTest追加、実行は未実施。
- Result：実装完了、AWS/API変更なし。
- Remaining Issues：MacのSwiftビルド/XCTest、SimulatorのUI確認、iPhone更新・実機操作は未実施。ローカル資料タブは今回対象外。他端末同期なし。

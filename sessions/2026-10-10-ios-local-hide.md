# iPhone内の資料非表示

- Request：実機のクラウドゴミ箱操作で「操作を完了できません」。本人がiPhone側だけで状態を持つ非表示を希望。
- Investigation：既存CloudLibraryView/Storeはクラウドtrash/restoreを呼び、保存領域は本人namespaceで分離済み。
- Changes：別repoのCloudFileStoreへ資料ID単位の非表示情報を原子的保存。通常/保存済み一覧をフィルターし、端末内の非表示一覧から再表示。クラウドへの変更クライアントを削除。
- Files Changed：Presentation-ViewerのCloudFiles/CloudLibraryStore/CloudLibraryView/CloudAPI/CloudLibraryTests、責務文書と現在地。
- Validation：Simulator XCTestと既存署名の実機build合格、非表示永続化/全版/namespace分離/保存ファイル保持/キャッシュ削除/保存失敗を確認。構造とdiff検査合格。39 XCTest合格。Vesperaへ更新インストール・更新版起動成功。
- Result：本番AWS/APIの変更なし。端末から非表示/再表示は通信不要。
- Remaining Issues：クラウドゴミ箱操作の失敗原因は未特定。新UIの目視/本人実機操作は未確認。他端末への非表示同期なし。

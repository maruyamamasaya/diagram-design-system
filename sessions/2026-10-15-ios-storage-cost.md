# iOS保存料金シミュレーション

- Request：iOSからS3保存費の試算と容量・料金推移を確認したい。
- Investigation：iOS実体はDevelopment/zukanへ移動済み。既存capacity APIは最新版成果物のみ集計し、旧版/S3非現行版を取得できない。
- Changes：iOS管理メニューの容量画面を試算画面へ拡張。手入力・単価/為替/税率・取得履歴2グラフ・利用者別原子的保存を追加。集計対象と除外費用を明示。
- Files Changed：zukanのCloudAPI/CloudFiles/CloudLibraryView/CloudLibraryTests、CURRENT/README/docs/storage-cost-simulator.md。本repoは本記録のみ。
- Validation：iPhone17e/iOS26.5のSimulatorビルド・XCTest成功、構造検査・diff検査合格。ログ /private/tmp/zukan-cost-test.log。
- Result：100GiB/0.025USD/150円/税10%で412.5円/月。自動集計は既存認証メタデータ経路、本体取得なし。AWS/API/権限変更なし。
- Remaining Issues：過去版を含むS3全体の自動集計は未対応（総容量は手入力可能）。画面目視・実S3照合・実機更新/操作は未実施。

## 本人依頼による実機反映

2026-10-15 JST。既存Team/Bundle IDで実機Debug build/codesign成功。Vesperaへ更新インストール・更新版起動成功。端末内資料削除・アンインストール・AWS変更なし。実機の画面操作は本人確認待ち。ログ /private/tmp/zukan-cost-device-{build,install,launch}.log。iOS正本docs/storage-cost-simulator.mdとCURRENTへ結果を追記。

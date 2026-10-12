# 端末一時コピーのオフライン閲覧

- Request：S3正本を維持した一時端末保存、オフライン閲覧、端末クリーンの実装。
- Investigation：別repo Presentation-Viewerに利用者別のキャッシュ優先取得・削除は実装済み。一時コピーの再起動時一覧復元と保存済み一括削除を補う。
- Changes / Files Changed：別repo CloudFiles/CloudLibraryStore/CloudLibraryViewとCloudLibraryTests。別repo README/CURRENT/docsの仕様・検証記録を更新。このrepoの生成/S3/API実装は変更なし。
- Validation：iPhone 17e / iOS26.5 Simulatorで46 XCTest、build、プロジェクト構造検査、diffチェック合格。
- Result：取得済みコピーを再起動後も通信なしで一覧・閲覧でき、確認後に端末コピーだけ一括削除できる。
- Remaining Issues：実機更新と新メニュー目視は未実施（UIツールのタイムアウト）。全資料一括取得やLRUは追加なし。

正本：[端末仕様・検証](/Users/maruyamasusumuya/Development/Presentation-Viewer/docs/offline-copies-validation.md)。

実機反映（2026-10-12 JST）：本人のデプロイ依頼後、既存Team・同Bundle IDで署名Debugビルドとcodesign検証成功。Vesperaへ更新インストールし、09:25 JSTに既存プロセスを終了して更新版の起動成功。アンインストールや端末コピー削除は実行していない。証跡：outputs/offline-copies/device-build.log、codesign.log、device-install.log、device-launch.log。本人のオフライン閲覧・削除メニュー操作の確認は未実施。AWS/API変更なし。

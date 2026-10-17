# 通常本棚の同期をテストデータで接続

## Request
Mac/iOSの通常整理画面での編集と同期受信の反映を、ローカル模擬サーバーとテストデータで確認。既存データ/AWSは変更しない。

## Investigation / Changes
既存SyncLabSessionへ明示的なテスト本棚バインディングを追加。通常保存の差分投影/永続送信待ち、手動送信、受信反映、反映失敗の再試行を接続。Macは別state指定+iOSはSimulatorサンプルモードのテスト起動時だけ有効。通常起動では検証コピーを維持する。

Mac保存場所/bookmark/フォルダ画像/UUID表記を再結合。iOSの3つの旧JSONは反映ジャーナルで回復できるようにし、初回反映前のバイトバックアップを保持する。共通モード識別と前回観測をcheckpointへ保存。同期中の新規編集を保存前に拒否。文書正本は[仕様](../docs/organization-sync-bound.md)。

## Files Changed
共通SyncLabSession/SyncLabViewとBoundSyncTests、Mac Store/SyncAdapterTests。別repo zukanのCloudLibraryStore/View/CloudFiles/CloudLibraryTests。CURRENT/CODEMAP/OPERATIONS/TESTINGと関連仕様を更新。

## Validation
共通20/Mac25/iOS62テスト。共通は通常編集/再起動/受信反映失敗再試行/競合解決。最終レビューで反映直後の中断時に受信内容を通常編集と誤認して競合を消す可能性を見つけ、反映予定の投影をcheckpointへ保持して修正。実際にsourceを更新後にエラーを返す再現テストで、再起動後も競合提案が保持されることを確認。Macは通常保存/受信/アイコン・source・UUID対応保持。iOSはフォルダ/所属/分類/タグ/まとめ保存・受信・再読込と反映中断回復。既存smoke-uiの実HTTPも成功。

専用ツールで別IDのMacテストアプリと新規iPhone17e/iOS26.5「Zukan Normal Sync Validation」を操作。Mac通常フォルダ→初回統合→応答喪失→再送→iOS通常一覧で受信確認。iOS通常画面のフォルダ作成/1資料の選択移動→同期→Mac通常フォルダ内でその資料を確認。Mac通常タグ編集→同期→iOS通常タグ一覧へ表示。版5/待ち0/競合0で、両端末の実JSONのフォルダ/所属/分類一致とMac source保持を照合。UIまとめ編集と通常画面の競合解決は今回の実操作対象外（自動テストの範囲）。

証跡：mac-app/.build/validation/normal-sync/（mac-received-folder.png、ios-received-tag.png、ios-received-tag.txt、data-check.txt、最終テストログ）。Git対象外。

## Result / Remaining Issues
通常編集と受信反映までローカル接続できた。手動同期であり常駐/自動送受信は未実装。通常利用者データでは有効化していない。既存資料/AWS/本番API/Applications版/実機iPhoneの変更なし。

検証専用Macアプリを終了して削除、/tmp合成本棚と一時パッチスクリプト削除。模擬サーバーを正常終了し一時データ削除を確認。今回の使い捨てSimulatorだけshutdown/delete。XCTest用の既存Simulatorとビルド領域は維持。

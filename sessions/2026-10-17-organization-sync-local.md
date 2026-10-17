# 整理情報同期の共通エンジンとローカルHTTP検証

## Request
共通パッケージへ同期処理を追加し、ローカル模擬サーバーでオフライン編集・再送・同時編集・削除・初回統合を検証。AWS/本番データは変更しない。

## Investigation / Changes
Sync.swiftに項目別revision・操作UUID・永続化可能なbaseline/pending/conflicts、再送receipt、競合選択、tombstoneを追加。親削除時の子孫/所属解除、古いクライアントからの復活拒否、親先行順序、500件バッチ、不完全ACK時のキュー保持。SyncImport.swiftは端末状態の投影・初回レビュー計画・循環/親不足で部分適用拒否・同名別UUID保持・タグ和集合。既存Mac設定の新しい分類/まとめも純粋取込で保持し、同一入力IDの矛盾を黙って上書きしない。

LoopbackSyncTransport.swiftは127.0.0.1だけを許可しredirect拒否。OrganizationSyncMock実行ターゲットとPython標準ライブラリの一時HTTPハーネスを追加。各要求の同期判断はSwift、状態とreceiptを同じJSONで保存してから応答する。Pythonは待受/排他/一時領域/応答切断のみを担当し、マージを複製しない。

## Files Changed
packages/LibraryOrganization/{Package.swift,Sources,Tests,README.md}、scripts/organization-sync-http-check.py、docs/organization-sync-local.md、CURRENT/CODEMAP/ARCHITECTURE/TESTING。

## Validation
- 共通16件（既存4＋同期12）/失敗0。オフライン保存→再起動、書込後ACK喪失→サーバー/クライアント再起動→同一ID再送、独立タグ統合/削除、同資料移動/まとめ順/フォルダ順競合と解決、競合の保存復元、削除子孫と古い端末の復活拒否、初回統合レビュー/再適用/現行Macと旧iOS JSON保持、循環拒否、領域不一致、操作ID使い回し拒否、重複メンバー、513操作、不完全ACKを確認。
- 最終実loopback HTTP smoke成功。模擬サーバーが保存直後に1回接続を切断、再送でもfolder/assignment/tag2件のrevision=4。動的ポート/一時データは終了時に削除。
- Mac既存23件/失敗0、実outputs65冊/152版/注意0（読取のみ）。
- iOS通常署名・arm64 Simulator既存59件/失敗0、TEST SUCCEEDED。
- Python構文とgit diff --check合格。ログ：/tmp/sync-{tests-final,http-check-final,mac-regression,ios-regression}.log。

## Result / Remaining Issues
依頼のローカル検証まで完了。実端末の保存情報・AWS・本番API・配置済みMac/iPhoneアプリは変更せず、アプリの同期呼出は未接続。模擬版は本人認証/本番分散排他/履歴清掃/初回確認UI/Member変換/アダプター保存ライフサイクルを含まない。フォルダ画像/資料本体は同期対象外。詳細はdocs/organization-sync-local.md。

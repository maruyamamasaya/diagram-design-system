# 通常本棚の同期接続

## Request
Macと実iPhoneの整理情報を管理JSONだけバックアップし、初回統合の内容を確認して有効化。既存資料・フォルダ・分類・タグ・まとめを保持。

## Investigation
Macはフォルダ1/所属1/順序1、iPhoneは分類1/自由タグ0/まとめ2（18参照）。コピーを共通Swiftで事前統合し、追加だけ・競合0を確認。既存APIの1request/secに合わせたペーシングと、iOSの複数クラウド画面の共通キューが必要。

## Changes / Files Changed
Mac公開接続config/build、通常用organization-sync保存先、共通AuthenticatedSyncTransportの要求間隔と回帰検証。iOSは別リポジトリで通常接続フラグ・単一キュー・全画面再読込・回帰検証。運用文書はdocs/organization-sync-live-clients.mdを正本とする。

## Validation
共有41/Mac27/iOS67テスト合格。Macの署名build・Applications更新、iPhoneの署名build・同Bundle ID更新成功。Macの実ログイン・初回統合確認・送信成功（server版6/待ち0/競合0）。Mac管理JSONと自動復元点のpayloadが更新前バイトに一致。iPhone分類/まとめは更新前後バイト一致。資料本体のコピーなし、AWS構成変更なし。

## Result / Remaining Issues
2026-10-19 0:01完了。本人承認のミラーリング設定/ロック解除/実ログイン後、iPhoneの受信3・送信3/変更解除競合0を確認して同期。Macへ戻して両端末版9/待ち0/競合0。フォルダ/所属/順序、分類1、まとめ2・18参照が両端末一致。既存値保持とiPhone自動バックアップの元JSONバイト一致も確認。手動同期を継続利用、AWS構成変更なし。

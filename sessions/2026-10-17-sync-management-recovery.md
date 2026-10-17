# 同期開始前の管理データバックアップと画面復元

## Request
初回バックアップ、統合件数/競合確認、失敗時復元の最小構成をテストデータで実装・確認。本人の補足により資料本体は対象外、S3読取のアプリ目的を維持。今後AWS変更前は必ず料金シミュレーションする。

## Investigation / Changes / Files Changed
共通SyncRecovery/SyncLabSession/Viewへ接続前バックアップ・件数・日時・復元確認UI・永続同期停止を追加。Mac Storeは管理JSONのバイト保存/復元、iOS CloudFiles/Storeは管理3JSONのみのバイト保存と復元ジャーナル/メモリー更新。初回確認・復元待ちでは通常編集を停止する。資料/キャッシュ/S3はバックアップしない。仕様は[管理データ保護](../docs/organization-sync-recovery.md)。CURRENT/CODEMAP/OPERATIONS/TESTING/ARCHITECTUREと既存仕様、iOS仕様、コスト方針を更新。

## Validation
共通24/Mac26/iOS64。追加/変更/解除・競合選択の件数、バックアップ失敗で未接続、復元失敗後の再起動/再試行、管理JSONのバイト復元、資料本体sentinel不変、iOSの欠損ファイル復元と未完了受信の再適用防止。従来smoke-uiのloopback HTTPも合格。

専用ツールで別IDのMacテストアプリと新規iPhone17e/iOS26.5「Zukan Recovery Validation」を操作。Macで自動バックアップ日時/本棚追加1変更1/競合1/確定不可→選択→統合→通信失敗→復元確認→同期停止を確認。iOSで追加2/送信1/競合0→統合→通信失敗→復元確認→同期停止を確認。両方とも元管理JSONとバイト一致、checkpointなし。iOSの分類/まとめJSONの元の不存在も復元、payloadはorganization.jsonだけ。サーバー版3不変。復元処理そのものの失敗は自動テストの範囲。

証跡：mac-app/.build/validation/management-recovery/（Mac初回確認画面、iOS復元画面とAX、両端末バイト照合、最終テストログ）。Git対象外。

## Result / Remaining Issues
テスト起動限定で最小構成が完了。実データ移行/実機配布/本番同期/AWS変更は未実施。資料本体バックアップ/履歴管理画面/世代自動削除は範囲外。今後AWS変更前に公式単価・通常/多用/無料枠なしの費用試算を提示してから承認を得る。

検証用Macアプリ終了/削除、合成管理JSON/比較コピー/一時スクリプト削除。模擬サーバー正常終了し一時データ削除、今回の使い捨てSimulatorをshutdown/delete。既存デバイスやApplications版・実機データは変更していない。

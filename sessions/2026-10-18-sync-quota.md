# 同期の1時間5回制限と今回だけの追加

## Request
Mac/iPhone合計で直近1時間5回、編集/送信待ち保持、次の時刻表示、同意した1回だけ追加。AWSは未変更で進める。

## Investigation / Changes / Files Changed
LibraryOrganizationへSyncRateLedger/予約とchallenge/受付期限/データ要求数/再試行上限、LimitedLoopbackTransportを追加。共通SyncLabSession/Viewはローカル受付記録と待ち時刻/追加確認を実装。Mac/iOSの明示テスト起動に接続した。模擬CLIとPython HTTPに制限付き経路/永続台帳/並行・要求数検証を追加。設計・運用の正本は[同期回数](../docs/organization-sync-quota.md)。Cognito/AWSの実装・配備は変更しない。

## Validation
共通28/Mac26/iOS64。移動窓/予約再送/単一追加/期限/通信上限/台帳復元/破損保護。実HTTPで2端末合計5回→6回目停止、ACK喪失再送、送信待ち/再起動/切断保持、同意した追加1回、通常制限の維持。begin9/sync9/finish6の要求数照合。別サーバーの10件並行予約で許可は5件だけ。旧smoke-uiも合格。

専用ツールで別IDのMacテストアプリと使い捨てiPhone17e/iOS26.5「Zukan Quota Validation」を操作。Macで5回到達を取得→追加確認キャンセル→復元確認表示/キャンセル→同意して6回目→通常残り0、通常フォルダ作成→送信待ち1件。iOSでも同じサーバーの6回を取得して停止、同意した7回目で初回取得/確定/送信を1枠で完了。追加ごとの確認と通常上限維持を確認。

証跡：mac-app/.build/validation/sync-quota/のmac-waiting/ios-extra（PNGとAX）と最終ログ。Git対象外。時計表示の文言は検証後に「前回確認時」「再確認できる時刻」へ明確化し最終ビルド確認。

## Result / Remaining Issues
ローカルのテスト本棚で制限/同意UIが完了。実Cognito利用者の判定/S3 CASの本番台帳/実端末配備は次段階。論理同期5回は課金上限ではなく、先行料金の前提へ制御HTTPと台帳書込を加えてAWS変更前に再試算する。

専用Macテストアプリを終了/削除、合成管理JSONを削除、一時模擬サーバーを正常終了/一時データ削除、今回の使い捨てSimulatorをshutdown/delete。既存資料・普段の本棚・実機iPhone・AWSは変更なし。無関係な作業記録は保持。

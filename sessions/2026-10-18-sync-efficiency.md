# 整理同期の無変更応答・失敗待機と料金再計算

## Request
無変更時の応答削減と、失敗時の連続再送を避ける待機を実装。模擬サーバー/テストデータで確認し、料金を更新。AWSと既存データは変更しない。

## Investigation
共有クライアントは毎回full snapshot、制限付きtransportは100/200msの即時再送だった。既存checkpointのbaseline/revisionと独立sync-throttle.jsonを利用して互換性と送信待ちを保持できることを確認。料金は同日確認済みの東京公開単価を再利用し、認証/課金APIにはアクセスしない。

## Changes / Files Changed
共有Sync/RateLimit/Limited transportへ任意knownRevisionとunchangedRevision、既存transportの互換既定実装。SyncRetryとUI throttle/session/viewへ永続待機/Retry-After/指数待機/jitter/待機時刻表示。模擬serverは無変更時のauthority追加保存を省略。HTTPハーネスに503と通信量/要求数の検証を追加。料金スクリプト/結果/設計・仕様/入口文書を更新。

## Validation
共通32/Mac26/iOS64合格、Macアプリビルド成功。smoke-efficiencyは300フォルダ+1タグで503/Retry-After90秒・待機中連打/追加同意/再起動でHTTPなし・待機中編集・保存後ACK喪失・再送重複なし・別端末の全件/無変更/削除取得を確認。受付3/データ9/終了3と一致。無変更本文25 bytes、全snapshot最小50,901 bytes。smoke-limit/concurrent/旧smoke-uiも合格。Decimal料金再現・項目合計・件数式・改善前後の関係と文書リンク/diffチェック合格。ネイティブ画面の追加操作は未実施。

## Result
無変更75%という未実測の利用比率で、転送枠なし同期追加は通常10.41→7.65円/月、上限正常55.81→27.62円/月。失敗待機で月間要求やLambda時間が減る効果は見込まず、無変更の転送/2回目保存の削減だけ反映。全再送/CAS3試行はなお162.50円、無変更0%なら改善前のまま。費用上限の保証ではない。

## Cleanup / Remaining Issues
HTTPとクライアントの合成データは一時ディレクトリで自動削除、ログはmac-app/.build/validation/sync-efficiency/。普段の本棚/Applications版/実機/AWS/既存資料は未変更。実AWS向けTypeScript authority/認証/CASの実装と相互fixture、実使用無変更率/最大状態CPU測定は今後の工程。今回の変更だけコミット/プッシュする。

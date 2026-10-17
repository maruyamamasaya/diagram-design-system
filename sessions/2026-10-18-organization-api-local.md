# AWS向け同期APIのローカル実装とSwift照合

## Request
AWS向け同期APIをローカル実装し、Swiftと回数制限/無変更/再送/同時編集/削除が同じ結果になるか確認。AWSと既存データは変更しない。

## Investigation
既存viewerのOIDC/owner/scope認可とLambda envelope、Swift authority/RateLedger、同期AWS案を確認。S3条件付き書込の公式仕様を照合。実AWS/認証情報/課金APIは照会せず、SDK sendはテスト差替だけ。

## Changes / Files Changed
viewer/src/lib/organizationへ型付きwire/状態遷移、単一JSONのCAS service、固定キー/ExpectedBucketOwner/AES256/If-MatchのS3ポート。api.ts/lambda.tsへ明示注入（既定は同期404）、OIDCへ明示Mac client許可と専用scope。不正なowner/client/readだけのtokenは保存先へ到達しない。Swift Mockへconformanceモード、5ファイル75ステップの共通fixture、APIテストと一時HTTP再現コマンドを追加。正本API/設計/入口/検証文書を更新。

## Validation
SwiftとTypeScriptの75ステップで応答/receipt/snapshot/revision/失敗/回数/時刻が一致。ランダムchallenge値のみ記号化し、それぞれの実値で後続要求を実行。JSON再読込、Base64不正/Unicode/emoji120文字も含む。実loopbackでSwift UI session→ローカルJWT認可付きTypeScript APIの24通信・5無変更応答・ACK喪失後再送・2台5枠/追加1回を確認。API10グループ/既存込みviewer24、共有Swift32、型検査/Nextビルド合格。追加の既存生成回帰は初回にWindowsフォント参照で失敗し、既存の検証済み日本語フォントとChromeを指定して再実行。日本語SVG実レンダリングと独立図/保存モックは合格。既存presentation-engine/v2の2プロセスは約3分待機したため今回の子プロセスだけSIGTERMで停止し、全体回帰は未完了と記録（描画コードは変更しない）。CAS10並行5許可/競合/親削除との競合/保存後ACK喪失/最大3試行/Retry-After、容量/破損/欠損と入力境界を検証。S3コマンドは差替で実送信しない。

## Result
本番組立前の同期APIをローカル検証できる状態。既定Lambdaはサービス注入なし、同期404を維持。既存閲覧の回帰に合格。SwiftアプリのHTTPS/PKCE/bootstrap/50操作・バイト分割は未接続。GUI/実機/実AWSの検証成功とは扱わない。

## Cleanup / Remaining Issues
HTTPは終了時close、Swift一時データとメモリー状態を破棄、ログはmac-app/.build/validation/organization-api/へ保存。AWS/既存データ/Applications/実機未変更。S3 clientのmaxAttempts:1、承認済みowner/library/keyの組立、最大状態の実測、配備前料金再計算と変更セット承認が次工程。料金は現在の保守的なGET/PUT各2回モデルを維持し、今回費用削減を追加主張しない。

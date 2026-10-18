# 整理同期の接続準備と適用手順（未適用）

2026-10-18。[HTTPS契約](organization-sync-https.md)、[料金の正本](organization-sync-aws-plan.md)。AWS/本番API/既存の本棚/Applications版/実機iPhoneは未変更。

## 今回の実装

MacとiOSのメニューに「整理情報の同期」を追加。共有SyncSetupViewで対象・管理JSONだけのバックアップ・統合確認・全端末5回/時・端末だけの復元を説明する。現行ビルドには有効化設定がなく、接続準備中としてログインボタンを無効にする。画面を開くだけで外部通信、Keychain書込、管理データのバックアップ/統合はしない。

将来の承認済みビルドではMacのInfo.plistへ以下を固定してから有効化する。設定画面から任意ホストを入力させない。

|キー|値|
|---|---|
|OrganizationSyncEnabled|Boolean true（未設定/falseは無効）|
|OrganizationIssuer|既存Cognito issuer|
|OrganizationDomain|既存Cognitoログインorigin|
|OrganizationAPI|既存HTTPS API origin|
|OrganizationClientID|新しいMac public client ID|
|OrganizationCallback|zukanbookshelf://oauth/callback|

iOSは既存CloudOIDCの公開設定/Keychainを使い、BundleのOrganizationSyncEnabled=trueを別途必要とする。接続操作で追加スコープのログインに成功してから通常本棚のbindingへ接続する。失敗/キャンセルなら古いread tokenで同期を始めない。追加スコープのログイン時に画面のidentityを更新し直してシートが消える問題を避け、通常の再ログインの一覧再構築は維持する。

両端末ともログイン後に既存SyncLabSessionの管理バックアップ→初回fetch→統合件数/競合選択→確定へ進む。通常編集・送信待ち・競合・復元は既存のbindingを再利用する。既存の検証メニューと任意loopback接続を本番導線へ流用しない。初期版は画面からの手動同期。再起動後は同期画面から再接続し、保存済みcheckpointと現在の管理情報を照合する。アプリ起動/編集後の自動送信は今回追加しない。

## AWSへ組み立てるコード

viewer/src/lib/organization/runtime.tsが、VIEWER_ORGANIZATION_ENABLED=trueのときだけサービスを構築する。既定は未注入/404。認証OIDC・storage=S3・既存issuer/owner・固定UUID・bucket/12桁ownerが欠ければ起動を拒否する。S3キーはissuerとsubから導出し、入力の任意キーは受け取らない。SDK maxAttempts=1で、CASの最大3試行とクライアントの手動再送の外に隠れたSDK再試行を増やさない。クライアントの構築/bootstrapだけではS3へアクセスしない。初期状態の自動作成はしない。

[未適用CloudFormation](../infra/organization-sync.proposed.json)は既存スタックのlogical IDを維持する構成案。追加はMacClient、既存readスコープを残したorganization.sync追加、iOS clientの許可scope、固定キーのGet/Put権限、Lambdaの接続設定。API route/Pool/既存ClientのID・資料保存・ログ14日/256MB/20秒を維持する。新スタックとして作成しない。既存テンプレートの記録に基づく案なので、**ライブのGetTemplateと差分照合するまで適用可能とは判断しない**。

オフライン準備（Node22、上書き拒否）：

```sh
cd viewer
node --import tsx scripts/prepare-organization-deployment.ts ../outputs/organization-sync-readiness/review-20261018
```

新しい出力フォルダに固定UUID/S3キーと初期空管理JSONのSHA256、テンプレート、UsePreviousValueのパラメーター案を保存する。既存記録のownerを使い、秘密値を読み込まず、CursorSecretを再生成しない。同じフォルダへの再実行は拒否する。UUIDを毎回作り直さず、最初のreview.jsonを承認・運用の基準にする。今回は同パスで作成・hash/UUID/固定キー/空状態・既存リソース定義維持・再実行拒否を確認した。AWS初期化コマンドは実行していない。

## 料金（追加費用、月）

東京の保存済みSKUを2026-10-18に認証不要の公式公開価格JSONと再照合し、9単価すべて一致。1USD=160円・税1.10・API/Lambda/ログ無料枠/クレジットなし・転送無料枠なし。既存費用とCognito本人MAU配賦は別。計算はestimate-organization-sync.py、結果はorganization-sync-aws-estimate.json。

|ケース|同期追加費用|
|---|---:|
|通常1200開始/月・無変更75%・一部再送|約7.65円|
|通常＋2端末初回統合・追加6データ通信（無変更74%で保守計算）|約7.71円|
|毎時5回・1データ通信/回・無変更75%|約27.62円|
|毎時5回・10データ通信/回・無変更75%|約165.78円|
|毎時5回・全HTTP3送信・全CAS3試行|約162.50円|

初回125フォルダの実TLSは2端末で計7変更バッチ。追加6通信の初回ケースは基準の各1データ通信に加える保守予算であり、全入力で7分割に収まる保証ではない。大量初回を毎月繰り返す場合や初回も再送する場合は別途増える。既存資料の参照試算33〜36円を足すと通常は約41〜44円、毎時5回の正常な1データ通信なら約61〜64円。実請求を監査した値ではない。

**1時間5回は開始の制限で、100円の請求上限ではない。** 毎回多数分割・連続した通信失敗・追加同意の反復では超える。通常は差分だけをまとめて送る。固定費DB等を増やさず、大量処理は初回に寄せ、必要なら1回のバッチ予算をさらに下げる案を別検討する。下げても管理情報・既存資料を捨てない。

## 適用順序と復旧

1. AWS短期セッション再認証後、GetTemplate/既存client/scope/role/Lambda設定を読取照合。今回GetTemplateはセッション期限切れで取得できず、ライブ差分未確認。課金照会・変更セット作成・書込は未実施。
2. テンプレートのライブ差分、固定キー/初期JSON hash/ライブラリID、コードhash、不変CodeKey、料金を提示して明示承認を得る。CursorSecret/OwnerSubject/既存clientは保持し、置換のある変更を実行しない。
3. 承認後にサーバーdisabledのままscope/Mac client/固定キー権限/コードを適用。初期JSONをIf-None-Match: */ExpectedBucketOwner/AES256で一度だけ作成。既存オブジェクトなら停止し、上書きしない。
4. 初期状態読取と認可を確認してから、別の確認済み更新でserver enabled。承認済みクライアント設定をビルドし、既存端末へ上書き更新する。最初は少量の合成データでMac/iPhone往復を確認する。追加scopeの実ログインは本人操作が必要になる場合がある。
5. 元の管理JSONを保持し、実本棚の初回統合件数を確認してから参加する。

不具合時はまずserver flag=falseで新規同期を停止し、クライアント画面の同期停止/ローカル管理復元を使う。S3管理オブジェクト・receipt・tombstoneを削除/空へ置換しない。以前の不変CodeKeyへ戻す場合も、現行データ互換性とレビューを条件にする。資料本体/既存catalog/端末保存ファイルは復旧操作の対象外。

## 検証と残り

共有Swift40、Mac27、iOS Simulator66、viewer25テスト合格。viewer typecheck/build、Mac release build/codesign、ローカルLambda bundle成功。実TLSで125フォルダの初回/分割/2バッチ目ACK喪失/待機/再起動/再送/双方向/401更新1回を再確認（7変更バッチ、最大8146/8192 bytes、revision=receipt=127、受付5回）。実Cognitoログイン/実AWS/実iPhoneは未検証。

新しい画面はビルド確認まで。専用CUAからSimulatorへ2回接続したがtimeoutReachedとなり、実操作確認はできていない。AppleScript等へ切り替えていない。元の本棚・Applications版・実機は変更せず、テストログはmac-app/.build/validation/sync-readinessへ保存する。

Macの既存ローカル資料表示は維持。Macへ未取得の資料をS3一覧/署名URLから取得して開く機能は別の未実装部分であり、整理同期APIだけで追加されたとは扱わない。iPhoneにしかない参照がMacへ届いても本体取得機能が揃うまではMacで開けない。実機配布/本棚有効化の前にこの閲覧導線を含む確認が必要。

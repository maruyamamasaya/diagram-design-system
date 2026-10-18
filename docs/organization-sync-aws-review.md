# 整理同期：実AWS構成との差分と最終承認用見積もり

2026-10-18、東京ap-northeast-1。本人依頼により既存AWSプロファイルへ再ログインし、Describe/Get/List/Headだけで確認。**変更セット作成・配備・S3書込・設定変更はしていない。** 認証キャッシュの更新だけを実施。既存資料/端末管理データ/実機も未変更。

## 確認できた現在の構成

- 対象stack：diagram-library-api、UPDATE_COMPLETE。既存Pool/Client/API/Function/Role/ログを確認。
- Cognito ESSENTIALS、既存iOS public clientはcode flow、openid＋diagram-library/read、callbackはpresentationviewer://oauth/callback、access token5分。ownerは既存stackとLambdaで一致。利用者の再作成は不要。
- Lambda Node.js22/x86_64/256MB/20秒、VPCなし、Active/更新成功。同期環境変数はまだ存在しない。
- APIは既存ANY /v1/{proxy+}、stageは1要求/秒・burst5。Logsは14日保持、保存量235634 bytes。
- 既存Roleのinline LibraryReadOnlyはライブtemplateと一致。managed policy追加なし。新しい整理キーへの権限はまだない。
- 専用S3はBPA4項目true、AES256/SSE-S3、BucketOwnerEnforced、バージョニング未有効。既存library/は757オブジェクト、544869659 bytes（約519.63MiB）。資料本文は取得せずキーとサイズだけを集計。
- 保存済みの固定libraryID/owner由来キーはライブownerと一致し、予定管理キーのHeadObjectは404。初期オブジェクトは未作成。

ライブGetTemplateと前回案の照合では追加MacClient、Scope/Client/Role/Functionの4変更のみ。Pool/API/Domain/Logs/Stage/Route/Integration/Permissionの定義は同一。ライブIAMもtemplateと一致した。CloudFormationのdrift検出ジョブやchange setは作成していないため、全設定のドリフト検出済みとは扱わない。

## 承認対象の変更

|対象|適用する変更|
|---|---|
|MacClient（新規1件）|既存PoolへsecretなしMac public client。Code＋PKCE、callback zukanbookshelf://oauth/callback、既存と同じ短期token設定|
|既存Scope|readを保持しorganization.syncを追加|
|既存iOS Client|ID/callback/code flow/短期tokenを保持し、許可scopeにorganization.syncを追加|
|既存Role|OrganizationFixedKey policyを追加。下記1キーだけGetObject/PutObject。List/Delete/資料本体Putの追加なし|
|既存Lambda|同期コードと固定UUID/bucket/owner/Mac client許可リストを追加。最初はVIEWER_ORGANIZATION_ENABLED=false|
|S3管理データ|下記初期空JSON1個だけ、If-None-Match: */ExpectedBucketOwner/AES256で初回作成。既存なら停止|
|有効化|初期状態と認可の確認後、同じLambdaのflagをtrueにする段階的更新|

新しいDB/常駐サーバー/VPC/NAT/WAF/KMSキー/監視アラームを追加しない。既存予算・ログ保持・API上限・資料catalog/本体・利用者・owner/秘密値を維持する。CursorSecretを再生成しない。資料本体は引き続きS3の既存読取API/署名URLを使う。管理バックアップをS3へアップロードしない。

固定の初期データ：

- libraryID：`18FD4762-A6B2-4EBE-AD02-B1C6C65787FA`
- キー：`library/organization/v1/18c9449f68b0d69b37aff414afea31faeb1ae3c97c63b41dbea449128a920a39/state.json`
- 初期JSON：151 bytes、SHA256 `305ffce74a880b220716c14607c11291f36b5a1e96dd19b850af182ce4878195`
- 新規コードzip：673228 bytes、SHA256 `9c4128306e48176e26e08eaaf04785669f4456c46119b482a8deddb0129fc0f2`
- 不変CodeKey案：`deployments/api/9c4128306e48176e26e08eaaf04785669f4456c46119b482a8deddb0129fc0f2.zip`
- ライブから組み立てた未適用template SHA256：`2cd85b9e3e5005c2b8645f215e9d94b8e56c629846f8aebe1c4e6c24d03b06d7`

初期JSONはフォルダも資料参照もまだない管理データだけ。利用者の既存整理情報の送信は、その後の各端末のバックアップ/統合確認の操作で初めて行う。コードzipの新しい不変キーへのアップロードも承認対象に含める。

[CloudFormation案](../infra/organization-sync.proposed.json)。ライブ由来template/比較証跡/zip/サイズ集計/公式価格照合はGit管理外のoutputs/organization-sync-audit/、初期JSONと固定UUIDはoutputs/organization-sync-readiness/review-20261018/。今回はUUIDを作り直していない。LambdaのCursorSecret実値は出力証跡から除外し、認証token/署名URLを記録しない。

プロパティ仕様上、既存Clientのscope変更、ResourceServerのScopes、Roleのpolicy、Lambdaコード/環境の変更は既存リソースを保つ案である。[Client仕様](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolclient.html)、[ResourceServer仕様](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolresourceserver.html)。**実際のReplacement判定は、承認後の変更セットで確認し、予想外の置換があれば実行せず報告する。** API/IntegrationはFunctionへの参照により間接変更表示になる可能性がある。

## 最終料金シミュレーション

2026-10-18に公式東京価格JSONを再取得し9つの保存SKU/単価がすべて一致。Cognitoの[公式価格](https://aws.amazon.com/cognito/pricing/)も確認。固定費の新規追加は0円、同じPoolの同じ本人をMac/iPhoneで使うため、新しい本人MAUを2人分として加算しない。無料枠を使えない場合の本人1MAU配賦は0.015USD＝2.64円/月で、同期増分とは分ける。

為替は比較用1USD=160円、税係数1.10。30日、Mac/iPhone計2台・1利用者合算5回/時。API/Lambda/ログ/保存の無料枠やクレジットは控除しない。転送枠は100GiB残る場合/残らない場合を比較。管理状態最大16MiB、コード用1MiB予算（今回zip約658KiB）、ログ14日・2KiB/要求。CPUは通常256MB×0.3秒、全再送/CASケースは1秒を仮定し、AWS上の同期負荷実測値ではない。

|利用ケース|転送無料枠あり：同期追加/月|転送無料枠なし：同期追加/月|
|---|---:|---:|
|通常1200開始＋2端末初回分割＋一部再送|約6.93円|約7.71円|
|毎時5回、通常1データ要求/回|約18.68円|約27.62円|
|毎時5回、10データ要求/回|約78.88円|約165.78円|
|毎時5回、全HTTP3送信/全CAS3試行|約135.67円|約162.50円|

通常＋初回は合計4064 API要求、4410 GET/4348 PUT試行、外向き0.039152GiBの保守予算。受付/終了/拒否/初回bootstrap/要求予算台帳/再送/分割を計上済み。初回125フォルダの7変更バッチ実測を使い、追加6要求と無変更74%で保守計算している。初回がもっと大きい/初回自体を繰り返し再送する場合は増える。

実測した既存library/約519.63MiBの**保存だけ**は約2.23円/月。同期通常分と足した約9.95円は、従来の資料閲覧API/Lambda/資料ダウンロード/認証等を含む全体額ではない。既存の33〜36円/月という旧利用条件の試算が続く場合の全体参考値は約41〜44円/月、毎時5回の正常1要求では約61〜64円/月。今回請求明細/Cost Explorerは照会しておらず、実請求として確定した総額ではない。

**通常は100円以内を見込むが、開始5回/時だけで100円を保証できない。** 多分割常用、障害再送、追加同意反復、資料本体ダウンロード増加では超える。プロトコル最大のstressは約6022円/月（無料転送枠なし）で、通常利用の予測ではない。現在の1要求/秒を維持し、分割を常時10回使う運用は避ける。料金の所有元は[計算条件](organization-sync-aws-plan.md)・[再現JSON](organization-sync-aws-estimate.json)。再計算結果は保存済みJSONと一致した。

1回限りの初期空JSON/コードPUT2件と少量の検証・管理API操作は月額ケースの外。S3保存PUT2件の直接費は約0.0017円、コード約658KiBを1か月保存しても約0.003円、加えて各サービスの検証通信/実行時間に応じる従量費が発生する。見積もりのコード1MiB予算内。アップロード/検証の反復で過去コードを増やし続ける費用は別で、既存版を無断削除しない。

## 適用前と復旧の条件

- 承認後もserver disabled→不変コード/固定キー初期化→認可/小量検証→server enabledの順。既存parameterはUsePreviousValue、CodeKeyだけ上記hashへ置換する。初期状態404を稼働時に自動再作成しない。
- APIの1要求/秒・burst5は既存のまま。分割を高速に連続送信すると429になる可能性があり、既存のRetry-After/待機/送信待ち維持で回復する。実端末展開前に要求間隔を抑える調整と、この上限を含む確認を行う。上限を無断で増やさない。
- MacのS3一覧/本体取得導線と新しい画面の実操作は未完了。AWS接続を有効化しても、この未実装分まで完了したとは扱わない。少量の端末検証が済むまで普段の本棚を自動参加させない。
- 障害時はflag=falseで新規同期を停止し、端末画面で管理JSONを復元。S3状態/receipts/tombstonesを消さない。旧コードへ戻す場合は状態互換性を確認する。資料本体の削除/上書きを復旧手順に含めない。

承認の対象は上記の新規Mac client・既存認証/Role/Lambda更新・コードPUT・初期空管理JSON PUT・段階的flag有効化。今回はいずれも未実行。

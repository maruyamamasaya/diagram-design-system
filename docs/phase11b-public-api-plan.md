# Phase 11B-2：公開APIの構成・費用・承認案

2026-10-10。**承認後にAWS公開APIをデプロイ済み。** 適用値と実リソースは[デプロイ記録](phase11b2-deployment.md)。以下の承認案は当初の構成・費用基準。 [実装・証跡・未検証](phase11b2-validation.md)。旧Phase 11B案の参考単価を東京の公式価格表で更新した。

## 構成と影響範囲
東京ap-northeast-1、既存アカウント676643701781。Cognito User Pool（Essentials、1利用者、自己登録停止、SMSなし）＋public iOS client（secretなし、Code+PKCE、access token5分、refresh1日）＋Cognito標準ドメイン。HTTP APIの標準HTTPSドメイン→Node.js22 Lambda（256 MB、timeout20秒、VPCなし）→既存非公開S3。Webホスティング・独自ドメイン・DB・EC2・NAT・ALB・WAF・独自KMS・Provisioned Concurrencyを追加しない。

共通/v1 APIはCognito JWKS署名／issuer／client_id／scope／期限を検査し、owner subのライブラリだけを毎回認可。Cognitoのresource server scopeはdiagram-library/read。iOSの完全一致callbackはpresentationviewer://oauth/callback。既存Webのローカルcookie/password認証はローカル限定で維持し、公開APIで拒否する。iOSは/meで認可済みidentityを得てKeychainと利用者別保存領域を使う。

既存S3はdiagram-design-system-676643701781-apne1を再利用。BPA・SSE-S3・ownership・bucket policy・catalog／資料キーは変更しない。既存uploader roleはPutObjectを持つためLambdaへ流用せず、新規の読取専用実行ロールを作る。catalog List/Getと許可成果物Get、安全設定の読取、専用ログstreamへの書込だけを付与し、資料Put/Deleteは禁止。

東京にある既存Cognito1 pool・HTTP API1件・Lambda5件は別KittingManagementPoc用。干渉を避けるため変更しない。既存64 USD／1 USD予算・3バケット・IAM trustは維持する。調査証跡はoutputs/phase11b2/aws-read.json。

## 承認対象
未適用正本：[CloudFormation案](../infra/phase11b2-api.proposed.json)。作成予定はCognito pool/client/resource server/domain、HTTP API/integration/route/stage、Lambda diagram-library-api、専用IAM実行ロールとAPI→Lambda呼出権限、専用CloudWatch Logs（保持14日）。標準ドメインprefix候補はdiagram-library-676643701781、利用可能性は作成時に確認する。

ローカルで作ったLambda zipは約0.66 MB。承認後に既存専用S3のdeployments/api/<SHA256>.zipへコードだけを保存し、そのキーをCodeBucket/CodeKeyへ指定する。資料キーは変更しないが、新しいコードオブジェクト追加も承認範囲に含める。zipに認証情報・原資料・.envは含めない。ユーザー作成とowner sub設定は別途本人のアカウント指定後、owner=UNCONFIGUREDの拒否状態から更新する。招待メール送信は別の明示指示なしで実行しない。

デプロイ前にアカウント・リージョン・対象キーを再照合。CursorSecretは新しいランダム値（64文字以上、NoEcho）を設定し、公開資料やGitへ保存しない。ownerは招待する本人のCognito subだけ。初回Pool/client/API/IAM作成・公開と、owner設定の更新を承認工程に含める。S3資料は既存の所有者だけに認可する。

## 月額の概算
2026-10-10にAWS公式地域別価格表を読取。税／為替は既存cost-policyの参考仮定（1 USD=160円、税係数1.10、換算176円/USD）。API/Lambda/ログの無料枠・期間限定クレジット・転送無料枠は控除しない。Cognitoの1 MAUだけは組織共有10,000 MAU枠に余裕がある条件で0円、枠消費済みならEssentials 0.015 USD/MAUで約2.64円を追加する。実請求／上限保証ではない。

条件：100資料×5 MB×3版=1.5 GB、API1,000回/月、毎回100資料のcatalog再取得を保守的に仮定（GET100,000＋LIST1,000）、成果物200回×平均2 MB=0.4 GB、Lambda 256 MB×200 ms/回=50 GB秒。catalogの60秒cacheが効けば操作数は減る。

|項目|公式単価と仮定|月額参考円|
|---|---|---:|
|Cognito|1 MAU、直接ログインの無料枠内|0.00|
|HTTP API|東京1.29 USD/100万回×1,000回|0.23|
|Lambda|0.20 USD/100万回＋0.0000166667 USD/GB秒|0.18|
|S3保存|0.025 USD/GB月×1.5 GB|6.60|
|catalog GET/LIST|0.00037 USD/1,000 GET、0.0047 USD/1,000 LIST|7.34|
|成果物GET|200回|0.01|
|S3外向き転送|0.114 USD/GB×0.4 GB|8.03|
|API応答転送|0.01 GB、同0.114 USD/GB参考|0.20|
|ログ|取り込み0.002 GB×0.76 USD、保持0.001 GB×0.033 USD|0.27|
|デプロイコード保存|0.01 GBの余裕を計上|0.04|
|メール・再試行・差異の余裕|単価ではなく概算の余裕|10.00|
|合計|無料転送枠を控除しない|**約33円/月**|

Cognito無料枠が他用途で消費済みなら約36円/月。公式根拠：[Cognito料金](https://aws.amazon.com/cognito/pricing/)、[HTTP API東京価格表](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonApiGateway/current/ap-northeast-1/index.json)、[Lambda東京価格表](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSLambda/current/ap-northeast-1/index.json)、[S3東京価格表](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/ap-northeast-1/index.json)、[転送東京価格表](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSDataTransfer/current/ap-northeast-1/index.json)、[ログ東京価格表](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonCloudWatch/current/ap-northeast-1/index.json)。取得した単価と再現計算はoutputs/phase11b2/{pricing.json,transfer-pricing.json,cost-estimate.json}。

4 GB/月の資料転送なら同条件で約105円/月、10,000 API回すべてcache missならcatalog読取だけ約73円となり合計100円を超え得る。大量アクセス、ログ、版蓄積、SMS／有料認証機能、為替の変化も超過要因。1 req/s／burst5のAPI throttlingは支出上限ではなく、未認証拒否にもLambda呼出費がかかる。100円は運用目標。cacheと必要時のダウンロードで抑え、料金上振れ時は構成／利用量を再評価する。既存予算を勝手に変更しない。

## 承認後の接続と検証
リソース作成→本人のCognito利用者／owner sub設定→iOS公開接続JSON反映→同Bundle IDで更新。Cognitoパスワードや認証コードは本人が入力する。ログイン→一覧／検索→PDF/PNG/PPTX→SHA256／保存→再起動・機内モード→ログアウトを実機で確認する。未認証／他subject／期限切れ／callback改ざん／401復帰を確認するまで本番接続完了と報告しない。

ログアウトは端末token削除＋refresh revoke。stateless JWTの即時失効は保証せず最大5分、署名URLは300秒有効となり得る。保存資料は削除せず同じ利用者の再ログイン用に保持し、ログアウト中はアクセス不可。即時失効／ログアウト時データ削除を求める場合は追加設計が必要。

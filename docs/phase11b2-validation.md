# Phase 11B-2：ローカル実装・承認待ち

2026-10-10。後続のユーザー承認で公開APIをデプロイ済み。[現在の適用記録](phase11b2-deployment.md)。以下はデプロイ前のローカル検証時点。両Gitリポジトリを独立維持。AWSの作成／変更・HTTPS外部公開は未実施。iOS本番接続は未設定で既定モック。

## 実装
- viewer/src/lib/oidc.ts：Cognito JWKSのRS256、issuer、exp/iat、token_use=access、client_id、diagram-library/readを検査し、固定owner subを全ルートで認可。他subjectは404。
- api.ts：OIDCモードではWeb cookie・パスワード交換・mock artifactを拒否。共通/v1/diagrams一覧／詳細／access-urlを再利用し、/v1/me（署名検証済みissuer/subject）を追加。検索scope=all/title/tagsをcursorへ束縛。
- store.ts：公開APIではLambda実行ロールの短期資格情報。ローカルは従来どおり読取専用session policyを維持。S3安全設定・manifestの検査、固定バケット／成果物の300秒署名URLを再利用。
- lambda.ts／scripts/package-lambda.cjs：HTTP API payload v2の入口、ローカルの自己完結バンドル。infra/phase11b2-api.proposed.jsonは未適用CloudFormation案。既存Next.jsを公開せずAPIのみを分離する。
- iOS CloudOIDC.swift：ASWebAuthenticationSessionのCode+PKCE S256、state／完全一致callback、Keychain、refresh、revoke。ID tokenを本人判定へ使わず、認証／認可済み/meのidentityを保存する。ブラウザーはephemeral。認証情報はWhenUnlockedThisDeviceOnly。
- iOSは設定でモック／本番を切替。CloudConnectionJSONが未設定なら本番モードはログインせず案内。設定値は公開URL・issuer・public client ID・host許可リストだけ。利用者・issuer/client/APIごとに永続保存／cacheを分離。ログアウトでKeychainを削除し、その利用者の保存資料を非表示にする。資料ファイルは保持し、同じ利用者の再ログイン後に再利用する。
- PDF/PNG/PPTX・SHA256・永続保存・オフライン読取を維持。URL期限切れ／取得403でaccess-urlを1回だけ再発行。公開検索は入力後300msでserver検索、保存済み／モックはローカル検索。SVG除外を維持。

## 今回の証跡
API9テストグループ成功・typecheck成功・既存Web production build成功。RS256署名・issuer・client・ID token誤用・scope・期限・他subject拒否、認証／認可後の一覧と/me、未認証一覧・公開パスワード／cookie／artifact拒否を含む。認証後一覧のデータは注入fixtureであり実Cognito通信ではない。

Lambda bundleの未認証401 smoke成功。CloudFormation JSON構文／public client／ログ14日保持のローカル検査成功。CloudFormationサービス側validation/deploymentは未実施。

iOSは署名なしSimulatorのKeychainテストが拒否された後、署名付きiOS17.4/iPhone15 Proで最終27テスト成功。PKCE公式例、callback改ざん、Keychain保存／削除、HTTPS設定拒否、期限切れURL再取得後の保存／オフライン、既存回帰を含む。ローカルURLProtocol応答でrefresh→/me identity→Keychain更新→logout/revoke→token削除も検証。実IDP通信ではない。端末向け署名build・接続iPhone Vespera更新成功。直前版は起動成功、最終版の起動は端末Lockedで拒否。Simulatorモック一覧は画像目視済み。

AWS SDKの読み取りで専用S3のBPA全true・BucketOwnerEnforced・SSE-S3、アカウント、既存uploaderロールとtrust/policyを確認。uploaderはPutObjectを持つため公開Lambdaに流用しない。東京の既存Cognito1 pool・HTTP API1件・Lambda5件はいずれも別KittingManagementPoc用で変更しない。

既存ローカルサーバーの読取専用session policyでRAG v1のPDF/PNG/PPTX署名付きGETを実行し、全3件SHA256・サイズ一致。これは実S3読取の証跡であり公開OIDC/iOSの実接続ではない。URL・トークンは報告へ出力しない。

証跡：diagram側outputs/phase11b2/{api-tests.log,typecheck.log,web-build.log,aws-read.json,signed-download.json,pricing.json,transfer-pricing.json,lambda/}。iOS側outputs/phase11b2/{OIDCTests.xcresult,oidc-tests.log,device-build.log,device-install.log,device-launch.log,library.png}。

## 未実施・制約
公開Cognitoログイン／refresh／revoke・実API・iOS実S3・本番Keychain復元・ユーザー切替・実機機内モード／基本操作は未検証。UI操作ツールがタイムアウトし、実機は更新／起動まで。PPTX Quick Lookの書体／折返し差は既知。SVG表示は復活させない。

サーバーのJWT検査はstatelessのためrefresh revoke後も発行済みaccess tokenは期限まで最大5分有効となり得る。発行済みS3 URLも最大300秒有効。即時失効を保証しない。iOSは先に端末のtokenを削除し、revoke通信失敗を明示する。保存資料は端末保護下で保持し、ログアウト画面から参照できない。

承認後はCognito利用者subをownerに設定し、公開設定JSONをiOSへ反映、実Cognito／iPhoneでログイン→一覧→形式取得→保存→再起動→オフライン→ログアウトを確認する。[構成・費用・承認対象](phase11b-public-api-plan.md)。

最終の検索条件／cursor保持修正後、クラウド関連12テストだけを再実行し成功（iOS側outputs/phase11b2/cloud-final-tests.log）。最終実機install成功・launchはLockedで拒否（同device-*.log）。

# Phase 11B-2 デプロイ記録（2026-10-10）

ユーザーが構成・料金提示後に「デプロイしておいて」と承認。東京アカウント676643701781のdiagram-library-apiスタックがCREATE_COMPLETE。実パラメーター、各リソースID、実行ロール、LambdaコードSHA256、template SHA256の正本は[deployment JSON](../infra/phase11b2-deployment.json)。秘密パラメーター値は記録しない。

## 適用構成

[CloudFormation](../infra/phase11b2-api.proposed.json)を適用（proposedのファイル名は互換性のため保持）。Cognito pool/public client/domain/resource scope、HTTP API、Lambda256 MB/20秒、読取専用IAMロール、ログ14日保持。API1 req/s/burst5。既存専用S3にdeployments/api/<hash>.zipのコードだけを追加。既存catalog・資料・S3設定、既存IAMロール、別プロジェクトのCognito/API/Lambda、既存予算は変更していない。

CursorSecretはデプロイ時に新規ランダム96文字を作成。NoEchoとLambdaのサーバー環境だけに保存し、JSON・Git・CLI出力に値を載せない。iOSには公開URL／issuer／public client ID／署名URLhost許可リストだけを反映する。

初回はLambdaのTags形式（mapではなくarrayが必要）がサービス側で拒否されROLLBACK_COMPLETE。今回の空の失敗スタックだけを削除し、タグ形式修正後に再作成して成功。既存アプリのリソースを削除していない。

## 接続値

API：https://2zpp6z8zvc.execute-api.ap-northeast-1.amazonaws.com
Issuer：https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_qKFdR57RY
Client ID：56ai6vn12eq9j6bof1hpvrv5g9
Login：https://diagram-library-676643701781.auth.ap-northeast-1.amazoncognito.com
Callback：presentationviewer://oauth/callback
OwnerSubject：UNCONFIGURED（全資料アクセスを拒否）。利用者の登録メール回答待ち。招待メール送信は未実施。

## 検証と未完了

実HTTPSの/v1/diagramsと/v1/meが未認証401、/v1/auth/tokenが404。デプロイ済みLambdaのCodeSha256がローカルzipと一致。実Cognitoログイン後の一覧／資料取得はowner未設定のため未検証。ローカルAPI/iOSと実S3署名GETの証跡は[前段検証](phase11b2-validation.md)。

iOSのconfig/cloud-connection.jsonとInfo.plistへ公開設定を反映、既定モックを維持。本番切替は「その他→接続設定」で選択できるが、本人登録前はログイン／認可を完了できない。本人のメールアドレスとCognito subを確定し、招待を送らず利用者を作成してowner設定を更新する工程が残る。パスワード／認証コード入力と実機の基本操作は本人の操作が必要。

## 再適用と運用

Node22で`node viewer/scripts/package-lambda.cjs`を実行し、zipを構成。短期AWS認証が必要で、失効時は既存AWS CLIでsignin profileへ再ログイン／更新する。scripts/deploy-phase11b2.cjsは承認済み新規作成とstatus確認の入口。既存スタックの更新はparametersを明示し、CursorSecretを再生成せずUsePreviousValueで保持する。コード追加はhash別の不変キーを使用する。OwnerSubject以外の既存設定を暗黙に変更しない。

費用目標は[約33～36円/月の試算](phase11b-public-api-plan.md)。請求上限ではない。発行済みJWT最大5分／S3 URL300秒の残存と、ログアウト時の保存資料保持は前段の設計どおり。

2026-10-10独立一枚図：ユーザー明示承認後、CodeKeyのみ更新。既存templateと全他パラメーター（CursorSecret含む）はUsePreviousValue。UPDATE_COMPLETE・コードSHA256一致、Role/Memory/Timeout維持、未認証401。[証跡](../sessions/2026-10-10-illustration-workflow.md)。

2026-10-10ゴミ箱：本人がデプロイを承認。実スタックのtemplateを基にstate専用List/Get/Put権限、trash flag、CodeKeyだけを更新。Role/FunctionとIntegrationの間接更新、置換なし。UPDATE_COMPLETE・コードSHA256一致・既存owner/Role/Memory/Timeout維持。既存Vesperaへ署名更新・起動成功。[仕様と検証境界](library-trash.md)。

2026-10-15大容量資料：今回限りの明示承認後、CodeKeyだけを更新。Function.Codeと同じFunction.Arnを参照するIntegrationUriの間接更新（どちらも置換なし）を変更セットで確認し実行。UPDATE_COMPLETE・コードSHA256一致、環境変数/owner/Role/Runtime/Memory/Timeout/API接続維持。対象は2040年産業資料のID/版/ハッシュ固定承認のみ。[記録](../sessions/2026-10-15-industry-2040-large-viewer-deploy.md)。

2026-10-18整理同期：承認済みのMac public client/scope/固定管理キー権限/同期コードを段階的に追加し、実Cognito/実HTTPSの合成フォルダ検証後にserver enabled。既存リソース置換なし。最新値はdeployment JSON、実施順序/限定bucket policy/保持確認は[同期配備](organization-sync-deployment.md)。

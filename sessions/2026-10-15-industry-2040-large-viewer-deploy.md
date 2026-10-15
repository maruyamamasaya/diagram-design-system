# 大容量資料のAPI対応：今回限りの本番反映

- Request: 本人が「本番に反映してほしい」「今回に限り」と明示承認。
- Investigation: 既存スタックUPDATE_COMPLETE、既存LambdaコードSHA256が前回読取値と一致することを確認。承認済み667,698 bytesのZIPハッシュを再照合。
- Changes: 既存専用S3へhash名コードZIPをIf-None-Match/SSE-S3/所有者固定で保存しGET照合。UsePreviousTemplate、CodeKey以外の全パラメーターUsePreviousValueで変更セットを作成。Function.Codeのみの直接変更と、同じFunction.Arnを参照するIntegrationUriの間接更新、双方置換なしを確認後に実行。
- Files Changed: infra/phase11b2-deployment.json、CURRENT、API/保存/配備の正本と記録。実行スクリプト・変更セットの検証記録はoutputs/industry-2040-presentation/build/app-fix。
- Validation: UPDATE_COMPLETE、Lambda配備CodeSha256がZIPと一致。Role/Runtime/Handler/Memory256MB/Timeout20秒/環境変数の指紋/VPC/Layer/API接続が更新前後で一致。ローカル共通API＋実S3の一覧/詳細200・42成果物GETハッシュ一致、viewer14件・保存15件・型検査・ビルドは先行記録。追加テストなしで同一ZIPを配備。
- Result: 本番反映済み。今回のUUID4f2af5d0-86c9-4709-9dad-9f6a67e5ac10版1の固定44オブジェクトだけに30MB/120MB例外を適用。他資料は既存制限。新規リソース・IAM・owner・認証・予算の変更なし。コードsha256 a29c7698b73a5f92a92c1625d702563fa930aa30cb337c50a2b4388131edcffa。
- Remaining Issues: 本番HTTPSの認証保護確認はhttp-checks.json。本人のログイン済みアプリでの表示/ダウンロードは未確認。Nativeアプリ指定repoパスは現在不在であり、アプリ再ビルド/実機更新は実施していない。

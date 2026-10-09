# AWS構成・コスト計画

調査・構築日：2026-10-09（Asia/Tokyo）。アカウント676643701781、東京ap-northeast-1。Phase 3の提案をユーザー承認でPhase 3Bに適用した。実検証は [phase3-validation.md](phase3-validation.md)。最新の運用目標は図解保存機能の追加コスト月額100円以内で、変更案と試算は [cost-policy.md](cost-policy.md) に定義する。

## 現在の環境

|バケット|BPA / 公開|暗号化|所有権 / 保持|
|---|---|---|---|
|aws-cloudtrail-logs-676643701781-932b4f69|全true / 非公開|SSE-S3|BucketOwnerEnforced、Versioning指定なし、lifecycle不在または取得不能|
|cdk-hnb659fds-assets-676643701781-ap-northeast-1|全true / 非公開|既存SSE-KMSを保持|BucketOwnerEnforced、Versioning有効、旧S3版30日・multipart1日|
|kittingmanagementpoc-auditbucketb01e0ae8-dcwiofjm1mnr|全true / 非公開|SSE-S3|BucketOwnerEnforced、Versioning指定なし、現行オブジェクト90日削除|
|diagram-design-system-676643701781-apne1|全true / 非公開|SSE-S3 AES256|BucketOwnerEnforced、Versioning・lifecycle未有効化|

全バケットが東京。既存3バケットの設定・資料は変更していない。用途や保管要件を図解保存に転用せず、既存KMSをSSE-S3に変更しない。新バケットだけにProject=diagram-design-system / Purpose=private-diagram-libraryを付けた。

専用IAMロールdiagram-design-system-uploaderはm-maruyama-adminのみから引き受け、短期STSで利用する。信頼ポリシーはinfra/uploader-trust.template.json、権限はinfra/upload-policy.template.json、S3のTLS・条件付きPUT・SSE-S3強制はinfra/bucket-policy.template.jsonを適用済み。ロールは作成・削除・公開設定変更を許可しない。管理者の長期認証情報は保存せず、通常CLIは専用ロールのAWSプロファイルを使用する。

## 予算の現在値と変更案の区別

- 既存aws-validation-monthly-cost：月額64 USD、既存ACTUAL 7 / 32 / 64 USD通知を保持。
- Phase 3Bで作成したdiagram-library-s3-monthly：月額1 USD、S3サービス全体、ACTUAL 80% / 100%、FORECASTED 100%。通知先はユーザー指定メールで確認済み。メール実配信は未検証。
- 月額100円への設計案：コスト配分タグProjectの有効化後、Project=diagram-design-systemで費用を分離し、0.50 USDの監視とACTUAL 50% / 80% / 100%、FORECASTED 100%を検討する。これは未適用であり、既存予算・タグ状態を無断変更しない。

現状Projectを含む全コスト配分タグはInactive。現在の1 USD予算は既存S3費用も含み、図解専用とは呼べない。将来の変更は反映遅延と対象費用の計上を確認してから承認を得る。

## 固定費と採用方針

|項目|状態 / 費用|
|---|---|
|S3 Standard|作成済み。今回の少数バケット構成で月額固定費なし。保存、PUT/LIST/GET、外向き転送は従量費|
|SSE-S3、BPA、所有権、IAM|適用済み。これら単独の月額固定費なし|
|監視・通知だけのBudgets|作成済み。無料。Actions・Reportsは追加しない|
|EC2 / NAT / ALB / WAF / 独自KMS / PrivateLink / VPC Endpoint|作成しない|
|CloudWatch有料request metrics・alarm / CloudTrailデータイベント / アクセスログ|今回有効化しない。監査要件・従量費・保持期間を設計して別承認|
|将来のAPI・認証・Web/iOS|未実装。採用前に保存以外も100円枠へ含めて再見積もり|

Lambda採用時は不要なVPC接続を避け、CloudWatch Logs保持14日を初期案とする。アクセスログを採用する場合はSSE-S3と30日保持を初期候補として、対象と費用の承認後に設定する。今回ライフサイクルによる自動削除は設定していない。単一PUTのみ・不変キー・論理版上限3を使い、旧版・残骸の削除は棚卸しと承認後に行う。

2026-10-09の東京単価：Standard最初の50 TBは0.025 USD/GB-month、PUT/COPY/POST/LIST 0.0047 USD/1,000回、GET等0.00037 USD/1,000回。インターネット転送は共通無料枠後の最初の10 TBが0.114 USD/GB（公開Price List確認）。無料転送枠の残量はこのS3だけで決まらない。[S3公式料金](https://aws.amazon.com/s3/pricing/)、[Budgets公式料金](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/)。料金・為替は将来変動するため、追加リソース作成直前に再確認する。

## 変更の手順

読み取り専用で対象アカウント・構成・費用を確認し、具体的な対象、通知先、料金体系を示す。新規作成・有料機能・既存変更・削除はその対象への明示承認後に実行する。今回承認されたLinux例以外の機密資料は送信しない。AWS認証情報はGit・outputsへ保存しない。予算通知は遅延があり、即時停止や費用上限保証として扱わない。

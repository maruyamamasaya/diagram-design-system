# Phase 3 / 3B：実装と実AWS検証記録

実施日：2026-10-09（Asia/Tokyo）。Phase 3Bの指定バケット・専用IAMロール・月額1 USD予算・Linux例送信はユーザー承認に基づいて実施した。追加の月額100円調査は読み取り専用で、予算やAWS設定を変更していない。

## 作成したリソースと認証

|項目|実環境|
|---|---|
|アカウント / リージョン|676643701781 / ap-northeast-1|
|S3|diagram-design-system-676643701781-apne1|
|公開・暗号化・所有権|BPA全4項目true、IsPublic=false、SSE-S3 AES256、BucketOwnerEnforced|
|バケットポリシー|TLS必須、library/への条件なしPUT禁止、SSE-S3必須。infra/bucket-policy.template.jsonを適用|
|IAMロール|arn:aws:iam::676643701781:role/diagram-design-system-uploader|
|引受主体|arn:aws:iam::676643701781:user/m-maruyama-adminだけを信頼|
|権限|infra/upload-policy.template.jsonのインラインポリシーDiagramLibraryUpload。保存先設定読取、catalog限定LIST、library成果物GET、条件付き暗号化PUT|
|ローカル認証|AWSプロファイルdiagram-design-system-uploader、source_profile=default。短期STS認証、最大1時間。長期アクセスキーは作成していない|
|Budgets|diagram-library-s3-monthly、MONTHLY COST 1 USD、S3サービス全体対象、ACTUAL 80% / 100%、FORECASTED 100%|
|通知先|ユーザー指定のm-maruyama@findix.co.jp。3通知すべてのEMAIL購読設定をAPIで確認|

新バケットのVersioningとライフサイクルは有効にしていない。IAMロールには削除・バケット設定変更・キー作成の権限がない。IAM SimulatorでDeleteObject、PutBucketPolicy、CreateAccessKeyがimplicitDenyとなることを確認した（実際の削除・変更テストはしない）。既存3バケットのリージョン、BPA、暗号化、所有権、公開判定、Versioningを作成前後に比較し一致。既存バケットを変更するAPIは実行していない。

既存64 USD予算は保持。新1 USD予算は図解限定ではない。追加の100円方針への変更案は [cost-policy.md](cost-policy.md) を参照し、未適用として扱う。Budgetsのメール配信そのものは未検証で、通知設定確認を配信成功とは扱わない。

## 実S3検証

入力：outputs/linux-roadmap-final。図解ID37386704-778e-41a5-a0f6-71e6e64cdf24、論理版1。

|検査|結果・証拠|
|---|---|
|安全設定preflight|東京、全BPA、所有権、SSE-S3、非公開が合格|
|部分失敗|実S3へSVGをPUT・GET検証した後、PNG PUT前にローカルでInjectedUploadFailureを発生。state=failed、catalog未掲載、4ローカル成果物のハッシュ不変|
|再開|通常のnpm run uploadで同じID・版を継続。保存済みSVGは条件付きPUT→412→GET同一確認、残りを保存。state=complete|
|再取得|SVG、PNG、input、validation、metadata、catalog metadataの6個を実GETし、サイズ・SHA256・Content-Type・SSE-S3が一致|
|条件付き上書き|既存SVGへ異なる内容をIf-None-Match:*付きで送ると412。元のSHA256不変|
|条件なし上書き|同じキーへの条件なしPUTは403。元のSHA256不変|
|匿名取得|PNGへの未署名HTTPS HEADは403|
|最小権限LIST|prefixなしListObjectsV2は403|
|完了後の再実行|GET検証のみで完了、PUT回数0|

障害は制御されたローカル中断であり、実ネットワーク障害やAWS障害を再現したとは報告しない。今回は1図だけを保存した。S3キーはlibrary/diagrams/<ID>/versions/000001/、一覧完了マーカーはlibrary/catalog/<ID>/versions/000001/metadata.json。

|取得ファイル|bytes|SHA256|
|---|---:|---|
|diagram.svg|13485799|c4082d4798dc8c65789309f69c120337fffd616856fca848992581021e2e53f9|
|diagram.png|249402|8585653809f3c24322a2d291234b4e4377de3595c89f806cc7827cad7eb45e44|
|input.json|2076|93fe6f290df2c7d422ca1bb67ffba6f8c59b91f8dcf17a296045c2dbf20a2926|
|validation.json|22220|69d7eb797bde61942b9538a21bdad932a6250d560affb4917e236bc603a5679f|
|metadata.json（2コピー）|2894ずつ|06966b07f73594cd543cf472449dde048a0537c09d079cc470dc5be311a61b82|

ローカル証跡：outputs/phase3b-validation/integration-result.json、provisioning-result.json、new-bucket-settings.json、existing-buckets-before.json / after.json、budget-notifications-confirmed.json、iam-negative-simulation.json、lifecycle-status.json。再取得ファイルは同ディレクトリのdownloaded/に保存。認証情報・署名付きURLは記録していない。

## 回帰テストと変更ファイル

npm test：10/10合格、失敗・skipなし。Phase 2の3グループ（日本語SVGの実Chromium描画を含む）とPhase 3の7グループ（スキーマ、衝突、失敗、再開、安全設定、保持上限）が合格。生成・保存の既存src/、スキーマ、テンプレート、tests/は変更していない。

Phase 3B追加・更新：scripts/validate-s3.cjs、infra/uploader-trust.template.json、package.jsonのvalidate:s3、README.md、AGENTS.md、docs/aws-plan.md、docs/phase3-validation.md、docs/cost-policy.md。実設定config/s3.local.jsonと証跡outputs/はGit管理外。package-lockの依存版は変更していない。

## 再確認手順

```powershell
cd C:\Users\m-maruyama\Development\diagram-design-system
# defaultのaws loginセッションが有効であることが前提
npm run upload -- --input outputs/linux-roadmap-final --approve-content
# このコマンドはAWS読取のみ。証跡をoutputs/へ再保存する
npm run validate:s3 -- --input outputs/linux-roadmap-final
```

上書き拒否テストを再実行する場合だけ、対象・資料について書込テストの承認を得てからvalidate:s3へ --probe-overwrite --approve-content を追加する。--exercise-upload --approve-content は未掲載の新しい承認済みサンプル専用で、掲載済み図は拒否する。新たな機密資料の送信承認をこのLinux例の承認から推定しない。

## 残課題

Phase 4の認証・図解単位認可、署名URL発行、Web/iOSビューアーは未実装。バケットが接続可能でも一般公開しない。監査データイベントや有料request metricsは追加していない。旧論理版・単一PUT残骸の自動削除、64 MiB超/multipart、保持上限の全クライアント同時実行ロックは未対応。SVG約13 MBのフォント埋め込みが転送量の主因。Budgetsは即時の課金停止・100円上限保証ではない。

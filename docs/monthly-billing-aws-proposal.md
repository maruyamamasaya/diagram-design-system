# 月内AWS費用表示：追加費用とAWS変更案

2026-10-19。本人が本案を明示承認。コード/IAM/bucket固定key例外は無効flagで適用済み、Project配賦タグはActive。CEタグ値の反映待ちのため有効化・費用取得・iOS更新は未実施。[結果](../sessions/2026-10-19-monthly-billing-deployment.md)。以下は承認時の構成/試算。

## 変更対象

- 東京の既存diagram-library-apiのコードと環境変数を更新。本人owner認可、既存Cognito/同期/ゴミ箱、256MB/20秒/nodejs22、ログ14日を維持。新サーバー/DB/定期実行サービスなし。
- Lambda roleへce:GetCostAndUsage（APIの都合でResource=*）と、専用S3固定key library/billing/monthly.jsonだけのGetObject/PutObjectを追加。[IAM案](../infra/monthly-billing-lambda-policy.proposed.json)。CEの署名先はus-east-1。アプリ実装は単一アカウント・今月・固定Project条件に限定するが、このIAM権限自体はアカウントの請求読取を許可する。タグの変更権限はLambdaに付けない。
- 専用bucketのCAS許可例外へ上記1keyだけを追加し、無条件上書きは明示deny。[bucket policy候補](../infra/monthly-billing-bucket-policy.proposed.json)。既存TLS/AES256/公開ブロック/他prefixの保護を維持。資料の書込・削除なし。共有JSONは予約/完了の各1PUT。削除権限なし。
- 直前の実AWS設定/タグを読み取って候補との差分を確認する。Projectが未有効ならコスト配分タグとして有効化。既存専用bucket/API/Lambda/Logs/Cognito user poolのProject=diagram-design-systemを確認し、不足がある専用リソースにだけ追加する。既存3bucket/他projectのタグや予算は変更しない。現時点の有効状態を未確認のまま「有効」と報告しない。
- 本番はVIEWER_BILLING_ENABLED=false / VIEWER_BILLING_ALLOCATION_READY=falseで配備し、タグ有効化/反映を確認後に有効化。本人認証/未認証拒否/共有枠を本番読取で検証してからiOSへ反映する。今回はまだ配布しない。

過去分バックフィルは今回の既定の適用対象外。AWSのバックフィルAPIはProjectだけでなく全タグの現在の有効/無効状態を期間へ再適用するため、他の配賦結果も変えうる。過去の未配賦費用は共通・未配賦として残す。今月全体を再配賦したい場合は、現在タグ一覧と影響差分を確認した別案とする。[公式](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_StartCostAllocationTagBackfill.html)。

## 追加費用

AWS公式のCE料金を2026-10-19に確認：1リクエスト0.01 USD、ページごとに課金。API Gateway/Lambda/S3/ログ/転送は[本日取得済みの公式東京単価とSKU](shared-trash-aws-rates.json)を利用。[再計算](../scripts/estimate-monthly-billing.py)、[結果JSON](monthly-billing-aws-estimate.json)。為替150円/USD、税10%は試算条件。UIの請求データには税を二重加算しない。

7日間の共有予約を使い、31日月で最大5取得。通常2照会/取得（図鑑/共通各1ページ）=月10CEリクエスト、16.50円。両枠が各2ページの場合は月20CEリクエスト、33.00円。上限を超えるページは照会せず取得未完了とする。失敗時も有料リトライをせず、予約を維持する。

|条件（月31日・2端末）|費用データAPI|CEリクエスト|転送無料枠あり|転送無料枠なし|
|---|---:|---:|---:|---:|
|通常：各端末1回/日、応答64KiB|62回|10回|約16.65円/月|約16.72円/月|
|多用：各端末20回/日、応答64KiB|1240回|10回|約18.78円/月|約20.20円/月|
|多用＋クライアント3試行＋最大ページ、応答256KiB|3720回|20回|約39.76円/月|約56.84円/月|

API/Lambda/S3/ログの無料枠・クレジットは使わない。転送無料枠だけ有/無を分ける。各APIはLambda 256MB×2秒、各取得は追加7秒（CE9秒枠を含む）、S3 GETは毎回、PUT月10回、ログ各1KiB/14日保持。保存量は各応答サイズの10コピーを1か月保持する保守例。実bucketのversioningを変更せず、旧版が発生する設定なら保持分の増加も考慮する（削除はしない）。

追加固定費0円。新MAU0で既存本人ログインを共用し、新しい有料認証方式は追加しない。UIのAPI要求に既存tokenを付け、Lambdaは検証するだけ。既存1MAUを別途配賦する場合の参考2.48円/月は既存費用で、上表へ重複計上しない。既存のS3保存約2.28円/月・容量取得・閲覧・同期・認証等も上表とは別。アカウント共通費や他用途の実請求を足した全体額を断定しない。

初期適用は、配賦タグ/状態確認等の管理API最大10要求までを仮に全て0.01 USDとして保守的に見積もり、初回データ最大4CE要求とコード配備/少量検証を合わせ**約25円以内を見込む**。これは上限保証ではなく、初回データ照会は月額分と一部重複する。実bundleは5MiB以内、S3 PUT/GET・API20確認要求以内、追加定期照会なし。追加の有料調査が必要なら費用を示してから行う。

月100円目標に対し、通常は今回約17円分が追加される。多用・再試行例では約57円増なので既存分が約43円以上なら100円を超える。超える見込みでは取得を14日以上へ間引く/手動月次化してCE照会を減らす案を示し、更新頻度を黙って上げない。共有予約・予算通知を請求上限保証として扱わない。無料枠が完全に使える場合でもCE API自体は上記費用を見込む。

## 承認後の手順

1. 現AWS template/policy/タグの読取、差分確認。異なるscope/置換が出たらその部分の案を更新。
2. 固定key限定IAM/CAS policyと無効flagのコードを変更。既存asset保存は不変キー/AES256/条件付きPUT、GET/SHA照合。
3. Project配賦タグを確認/必要なら有効化、反映確認後にallocation readyと機能を有効化。反映待ちを0円と扱わない。有料検証照会は初回最大4ページ。
4. 本人認証の共有データ取得、未認証/他owner拒否、繰返し閲覧のCE再照会なし、既存一覧/ゴミ箱/同期を読取確認。実資料の変更/削除はしない。
5. 成功後にiOSを更新。実機画面の確認はiPad Miraを対象とし、操作可能な経路を確認して進める。

承認対象は上記コードasset保存・既存Lambda/IAM/bucket固定key例外・Project有効化/専用resourceの不足タグ補完・初回照会/読取検証・成功後iOS反映。承認後に無効状態の基盤配備まで実施し、請求データへの反映を待っている。[AGENTS](../AGENTS.md)の「具体的な構成と料金を示して明示承認を得るまで行わない」に従い、本人承認後だけ適用する。

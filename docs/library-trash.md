# クラウド資料のゴミ箱

2026-10-19の常設本棚・端末共通ゴミ箱/完全削除は、別フラグで無効のまま[実装中](shared-library-trash.md)。以下は先行実装の契約と履歴であり、新機能を本番利用可能とする記録ではない。

2026-10-10。本番AWS反映・既存iPhone更新/起動完了。実機のゴミ箱移動/復元操作は未確認。

## 操作と契約

iOSのクラウド資料カードの「…」→「ゴミ箱に移動」→資料名を含む確認。右上「その他」→「ゴミ箱」で同じ資料種別の一覧を表示し、カードの「…」→「復元」。長押しからも操作できる。保存済み端末コピーは残る。ゴミ箱は閲覧・ダウンロードを提供しない。完全削除・自動削除は今回の対象外。

- `GET /v1/diagrams?state=active|trashed`（既定active）。検索、種別、ページングは既存契約。cursorはstateにも束縛する。
- `POST /v1/diagrams/{id}/trash` / `restore`、JSON bodyは空の `{}` のみ。200は `{schemaVersion:"library-state-1.0",id,trashed,updatedAt}`。
- 共通owner認可、WebのCSRFを適用。資料ID全体（旧版・将来の追加版を含む）へ適用する。同じ操作を再実行できる。同時操作は最後に保存された状態が有効。
- ゴミ箱資料の詳細・版一覧・新規アクセスURLは404。状態取得失敗は一覧や取得を失敗にし、activeと推測しない。既に発行済みのS3 URLは最大300秒残る。既に取得されたコピーは回収しない。

## 保存と本番反映案

成果物とcatalogは変更せず、専用バケット `diagram-design-system-676643701781-apne1` の `library/state/{id}.json` に小さい状態JSONを保存する。復元はtrashed=falseの上書き。SSE-S3/AES256とExpectedBucketOwnerを指定。artifact/versionの不変性を維持する。端末とWebにAWS認証情報を渡さない。

ユーザーの「完了したら、デプロイまでお願い」の明示承認後、本番へ `VIEWER_TRASH_ENABLED=true` と次の権限を適用済み。無効時は従来の読取挙動を維持し、書込は503 TRASH_NOT_ENABLED。

- 既存Lambda `diagram-library-api` のコードと環境設定更新。
- 既存実行ロールの `library/state/*` だけへGetObject/PutObjectと、同prefixのListBucketを追加。DeleteObjectや成果物へのPutObjectは追加しない。
- [具体的なCloudFormation案](../infra/library-trash.proposed.json)は事前の構成案。実際の更新は実スタックのテンプレートからRole/Functionの差分だけを作成し適用。IntegrationはFunction.Arnに伴う間接更新のみで定義を保持。新規サービス、バケット、予算、Cognito設定は不要。
- iOSアプリは同Bundle IDで既存Vesperaへ更新・起動済み。実際の資料をゴミ箱へ移す検証は、対象の資料を指定した別承認後に行う。

## 費用

固定費を追加せず、S3 LIST/GET/PUTと既存Lambda/APIの従量利用が増える。[S3公式料金](https://aws.amazon.com/s3/pricing/)は2026-10-10に参照。東京の動的料金表から最新数値は抽出できていないため、以下は[既存試算の単価](cost-policy.md)を用いた参考値で、最新料金の保証ではない。

100資料・一覧再取得100回/月・全100件に状態ありを保守的に仮定すると追加10,000 LIST＋10,000 GET。月100回の移動/復元を100 PUTとして、(10000/1000×0.0047 + 10000/1000×0.00037 + 100/1000×0.0047)×160×1.10 = 約9.01円/月。通常は状態のない資料のGETは不要。詳細/アクセス操作の状態確認、既存Lambda/API、リトライは別。ゴミ箱の資料の保存料は継続する。月100円は利用量に依存し上限保証ではない。

## 検証

検証結果は[sessions記録](../sessions/2026-10-10-library-trash.md)。モック、Simulator、本番AWS、実機を区別する。

本番証跡：CloudFormation UPDATE_COMPLETE、コードSHA256一致、既存Role/Memory256 MB/Timeout20秒/owner維持、trash flag有効。HTTPSの一覧/ゴミ箱一覧/me/移動ルートは未認証401。認証済み実機の移動/復元は未検証。詳細は[sessions](../sessions/2026-10-10-library-trash.md)。

## iOS整理方法の変更

2026-10-10、本人が実機で移動操作失敗を報告し、iPhone側だけの非表示へ変更を依頼。iOSはクラウドtrash/restoreの呼出を外し、利用者別ローカル保存の非表示/再表示へ切替。クラウドAPI/AWSはこの切替で更新しない。失敗原因は未特定。[記録](../sessions/2026-10-10-ios-local-hide.md)。

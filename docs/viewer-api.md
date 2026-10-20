# Web・iOS共通API v1（ローカルPhase 4実装／公開認証は設計）

## 認証・認可
資料・利用者データのAPIはHTTPSとBearerトークン必須。データを含まない読取仕様fingerprintだけを返す `GET /v1/reader-contract` は認証不要（2026-10-20追加）。将来選ぶIdPのissuer・audience・署名・有効期限をサーバー側で検証し、認証済みsubjectが個人ライブラリの許可ユーザーであることを毎回確認する。認証だけで図解アクセスを許可しない。個人用のowner allowlistはサーバー設定で管理し、クライアントからowner、bucket、keyを指定させない。多人数対応時は所有者・ACLモデルの追加を必須とする。

Web・iOSにAWSアクセスキーを配布しない。バックエンドの最小権限IAMロールだけがS3を読み取り、認可後に期限付きGET URLを発行する。S3公開設定、静的Webホスティング、public-read ACLは使用しない。

## 一覧
`GET /v1/diagrams?limit=20&cursor=<opaque>`

200：`{items:[{id,title,type,createdAt,updatedAt,version,formats,pageCount,previewAvailable,validationChecks}],nextCursor}`。limitは1〜100。署名付きURLを一覧項目へ恒久保存しない。画像は後述のURL発行APIで取得する。タイトル・検証状態が機密になり得るので一覧も認可する。

catalog配下のmetadata／upload-manifestだけを読み、IDごとの最新の完了版を返す。S3キーの辞書順は作成日時順ではない。初期の小規模版はcatalogをページ付きで全走査して最新版を集約し、ID順で応答する。将来件数が増えれば専用インデックスを検討する。S3 Listの途中ページだけで「最新」と判定しない。

cursorはサーバー発行・改ざん防止・ユーザーとクエリー条件へ束縛し、有効期限を持つ。最新状態が途中で変わる可能性を明示する。安定したページングが必要なら短期スナップショットを使う。任意のS3 ContinuationTokenをそのまま受け付けない。

## 詳細・版一覧
`GET /v1/diagrams/{id}?version=<integer>`：版未指定は最新完了版。200：タイトル、タイプ、作成・更新日時、版、出力形式、各成果物の役割・サイズ・SHA256、検証状態と未検証項目。S3バケット、内部キー、認証情報、フォントのローカル絶対パスは公開APIへ露出させず、metadataから必要情報だけを投影する。

`GET /v1/diagrams/{id}/versions`：完了版の番号と日時。権限のない図解・存在しない図解は同じ404にして存在の漏えいを防ぐ。

## プレビュー・ダウンロード
`POST /v1/diagrams/{id}/access-url`

要求：`{version:1,artifact:"png",page:1,purpose:"preview"}`。artifactはsvg / png / pdf / pptx / validation / inputの許可リスト。pageは1始まりの整数（省略時1）で、プレゼンPNGのページを選ぶ。PDF/PPTXは資料全体。purposeはpreview / download。previewはPNG/PDF/SVGのみ。PPTXはdownloadのみ。previewはPNGを既定とし、SVGは明示操作のimg表示のみ。version未指定は最新完了版。検証結果と入力JSONも同じ認可を必須にする。

200：`{url,method:"GET",expiresAt,expiresIn:300,contentType,sizeBytes,sha256,fileName}`。有効期間は原則300秒、最大900秒。実際の有効期間は署名主体の短期認証情報の残り時間も上限となる。発行したURLはBearer相当なのでログ・解析ツールへ出さない。認可後のURL共有を完全に防ぐ方式ではない。[S3署名付きURL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)

S3キーは認可したmetadataの該当ファイルから解決し、任意キーを署名しない。Content-Typeを固定し、ダウンロードはContent-Disposition: attachmentでファイル名を制御する。SVGはブラウザーのHTMLへ直接挿入しない。初期ビューアーはPNGを表示し、SVGは明示操作によるimgプレビューとダウンロードに対応する。JSONの外部URL等も自動実行しない。

URL発行レスポンスはCache-Control: no-store、クライアントもURLを永続化しない。URL失効時は再認証・認可して再取得する。Web用CORSは実際のビューアーoriginとGET/HEADなど必要操作だけに限定し、初期Phase 3では未設定。iOSのHTTPS取得にも同じ認可手順を使用する。

## エラー
400は不正なID・版・形式、401は未認証・期限切れ、404は未存在または権限なし、409は未完了・整合性不一致、429は制限超過、503は一時的なS3障害。形式は `{error:{code,message},requestId}`。秘密情報や内部S3エラー本文を返さない。

## 最小構成と権限
将来は認証基盤＋VPC外のLambda＋HTTP API等を候補とするが、今回作成しない。EC2・NAT・ALB・WAF・独自KMSキー・PrivateLink・VPC Endpointは初期案から外す。認証方式選定時にはIdPやAPI利用料金を別途報告・承認する。

ビューアーロールは承認バケットのlibrary/catalog/に限定したListBucketと、metadataおよび署名対象ファイルへのGetObjectのみ。PutObject・DeleteObjectは付与しない。署名対象SVGの公開読み取りは不要。認可、期限、IDOR防止、ログの機密情報除外、CORS、iOS実機取得は将来の実装・試験項目。


## Phase 4実装差分
viewer/の/v1はローカルAPIを実装済み。qによるタイトル・タグ検索、type絞込に対応。Webは/api/webのcookie/CSRF経路、共通APIはBearer経路を使用。POST /v1/auth/token はローカル開発用パスワード交換、POST /v1/auth/revoke は失効。公開版のIdP/OIDCは未実装であり、冒頭のHTTPS・IdP要件は公開時の要件。ローカルHTTPはループバック限定の例外。

一覧はPNGのみ。SVGをHTML/iframe/objectへ挿入せずimgで表示し、S3 CORS変更なしで画像表示・ダウンロードを行う。ブラウザJSから署名URLをfetchする将来機能は別途限定CORSの承認が必要。Phase 4時点ではv1メタデータ対応で、v2/PDF/PPTX/WebPは未対応だった。現在の対応は下記Phase 11A差分を参照。詳細は [実検証](phase4-validation.md)。

## Phase 11A実装差分

旧metadata.jsonとPhase 7.6の最小upload-manifest.jsonを正規化し、type=presentation、pageCount、PDF/PPTX/ページPNGに対応。検索・版一覧・認可は同じAPIで提供する。新manifestの日時はcatalogのS3 LastModified（生成日時ではない）。schema検査合格と成果物の実体／目視確認は分離し、manifestだけから検証済みとは報告しない。旧v1のSVGは隔離img表示を維持し、新プレゼンのSVGは保存対象外。汎用パッケージ2.0とWebPは未対応。公開OIDCは未実装で、[公開設計](phase11a-deployment.md)に従う。

## Phase 11B-2公開APIのローカル実装

公開モードはVIEWER_AUTH_MODE=oidc、HTTPS、S3必須。Cognito access tokenのRS256署名／issuer／client_id／token_use／exp／iat／diagram-library/readを検査し、server owner subの資料ライブラリだけを許可。他subjectは404。/v1/auth/token、/v1/auth/revoke、Web cookieルートとmock artifactは公開モードで拒否。ログイン／refresh／revokeはCognitoのPKCEエンドポイントを使う。Webローカルの既存挙動は維持する。

`GET /v1/me`は認証／認可後に`{issuer,subject}`を返す（no-store）。iOSはID tokenの未検証decodeで利用者を決めず、このidentityで保存領域を分離する。

一覧に`scope=all|title|tags`を追加（省略all）。qと同じ部分一致・大小文字非区別で、cursorをsubject/q/type/scopeに束縛。実APIの未取得ページも検索対象とする。

公開リソースは未作成。JWTのstateless検証ではCognito revokeの即時失効を保証せずaccess token最大5分、発行済みS3 URL300秒の残存を許容する設計。iOSはログアウト時にKeychain削除・本番保存資料非表示、資料は同じ利用者での再ログイン用に保持。検証の境界は[Phase 11B-2](phase11b2-validation.md)。

illustration-s3-1.0に対応。type=illustration、pageCount=1、formats=png/pdf。成果物はdiagram.png/diagram.pdf。旧データの書換えなし。[契約](illustration-workflow.md)。

## ゴミ箱（ローカル実装・本番未適用）

資料ID単位で通常一覧と取得対象から外し、復元できる。`GET diagrams?state=active|trashed`、`POST diagrams/{id}/trash|restore`。既存owner認可/CSRFを維持し、成果物は保持。契約・権限と費用の正本は[ゴミ箱仕様](library-trash.md)。


## 資料限定の大容量対応（2026-10-15、本番反映済み）

manifest検査後にsrc/upload/limits.cjsの共有サイズ判定を使い、[資料限定承認](s3-storage.md#2026-10-15の資料限定サイズ承認)に保存先・キー・サイズ・SHA256が一致する40ページの資料だけを受理する。全42成果物がそろうことも確認する。通常の20MB/50MB上限、認証・owner認可・キー制約・短期署名URL・整合性情報は維持する。サイズや版を変えたmanifest、最終PNGを欠いたmanifestも拒否する。

viewer/tests/large-presentation.test.tsを追加。check-large-presentation.tsはローカル共通APIの一覧・詳細・全40PNG/PDF/PPTXを実S3から署名取得しSHA256照合する読取専用検証。URLやトークンを出力しない。公開APIと実機の確認とは区別する。

本人が今回限りの本番反映を承認。既存スタックのCodeKeyのみ更新しUPDATE_COMPLETE。コードSHA256一致・認証環境/IAM Role/256MB/20秒/API接続不変を確認。本番の未認証401・公開禁止auth交換404を確認。ログイン後のiPhone実機閲覧は未確認。[記録](../sessions/2026-10-15-industry-2040-large-viewer-deploy.md)。

## 整理同期API（本番有効化済み）

`GET /v1/organization/bootstrap`と`POST /v1/organization/sync`（begin/sync/finish）をTypeScriptで追加。既存Cognito検証＋専用同期scope/owner認可を使う。未設定/flag=falseのhandlerでは404。2026-10-18に承認後の段階的配備と実Cognito/少量合成データ検証を終え、既存公開Lambdaではflag=trueで有効化済み。資料の読取契約は保持。状態遷移・Swiftとの共通fixture・CAS/S3保存ポート・容量境界は[同期API仕様](organization-sync-api-local.md)、配備の現在値と通常本棚の未接続境界は[実AWS記録](organization-sync-deployment.md)を正とする。

整理同期ルート（2026-10-18）：承認後、GET /v1/organization/bootstrapとPOST /v1/organization/syncを既存公開APIへ有効化した。追加organization.sync scope・同owner・固定UUIDの検査、5開始/時、操作50件/256KiB、既存API全体1要求/秒を維持。資料本体の取得契約を変更しない。詳細は[同期契約](organization-sync-https.md)と[実AWS配備証跡](organization-sync-deployment.md)。

## S3実保存容量（2026-10-19、本番配備済み）

本人read認証付きGET /v1/storage-capacity。専用bucket全版/管理/ゴミ箱/削除マーカーのbyte合計と件数・完了日時を返す。保存先指定は不可、明示フラグ必須。[応答契約と制約](s3-storage-capacity.md)、[本番適用承認案](s3-storage-capacity-aws-proposal.md)。

## 今月のAWS請求（2026-10-19、未配備）

本人OIDC/read認証限定GET /v1/monthly-billing。固定account/今月/Project配賦分とタグ未配賦分を返す。7日共有予約・2枠各2ページ上限・強制更新query不可・既定無効。[契約](monthly-billing.md)、[AWS追加費用/適用案](monthly-billing-aws-proposal.md)。

## 取得互換性と障害隔離（2026-10-20）

保存/閲覧の共有検証器、本番fingerprintによる公開前停止、不正manifestの版単位隔離と一覧のwarnings、資料限定サイズ承認の配布条件は[取得互換性](library-fetch-repair.md)を正本とする。資料APIの認証・owner認可・短期URLは維持する。

# Web・iOS共通API v1（ローカルPhase 4実装／公開認証は設計）

## 認証・認可
すべてのAPIはHTTPSとBearerトークン必須。将来選ぶIdPのissuer・audience・署名・有効期限をサーバー側で検証し、認証済みsubjectが個人ライブラリの許可ユーザーであることを毎回確認する。認証だけで図解アクセスを許可しない。個人用のowner allowlistはサーバー設定で管理し、クライアントからowner、bucket、keyを指定させない。多人数対応時は所有者・ACLモデルの追加を必須とする。

Web・iOSにAWSアクセスキーを配布しない。バックエンドの最小権限IAMロールだけがS3を読み取り、認可後に期限付きGET URLを発行する。S3公開設定、静的Webホスティング、public-read ACLは使用しない。

## 一覧
`GET /v1/diagrams?limit=20&cursor=<opaque>`

200：`{items:[{id,title,type,createdAt,updatedAt,version,formats,previewAvailable,validationChecks}],nextCursor}`。limitは1〜100。署名付きURLを一覧項目へ恒久保存しない。画像は後述のURL発行APIで取得する。タイトル・検証状態が機密になり得るので一覧も認可する。

catalog配下のmetadataだけを読み、IDごとの最新の完了版を返す。S3キーの辞書順は作成日時順ではない。初期の小規模版はcatalogをページ付きで全走査して最新版を集約し、ID順で応答する。将来件数が増えれば専用インデックスを検討する。S3 Listの途中ページだけで「最新」と判定しない。

cursorはサーバー発行・改ざん防止・ユーザーとクエリー条件へ束縛し、有効期限を持つ。最新状態が途中で変わる可能性を明示する。安定したページングが必要なら短期スナップショットを使う。任意のS3 ContinuationTokenをそのまま受け付けない。

## 詳細・版一覧
`GET /v1/diagrams/{id}?version=<integer>`：版未指定は最新完了版。200：タイトル、タイプ、作成・更新日時、版、出力形式、各成果物の役割・サイズ・SHA256、検証状態と未検証項目。S3バケット、内部キー、認証情報、フォントのローカル絶対パスは公開APIへ露出させず、metadataから必要情報だけを投影する。

`GET /v1/diagrams/{id}/versions`：完了版の番号と日時。権限のない図解・存在しない図解は同じ404にして存在の漏えいを防ぐ。

## プレビュー・ダウンロード
`POST /v1/diagrams/{id}/access-url`

要求：`{version:1,artifact:"png",purpose:"preview"}`。artifactはsvg / png / validation / inputの許可リスト。purposeはpreview / download。previewはPNGを既定とし、SVGは明示操作のimg表示のみ。version未指定は最新完了版。検証結果と入力JSONも同じ認可を必須にする。

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

一覧はPNGのみ。SVGをHTML/iframe/objectへ挿入せずimgで表示し、S3 CORS変更なしで画像表示・ダウンロードを行う。ブラウザJSから署名URLをfetchする将来機能は別途限定CORSの承認が必要。v1メタデータ対応で、v2/PDF/PPTX/WebPは未対応。詳細は [実検証](phase4-validation.md)。

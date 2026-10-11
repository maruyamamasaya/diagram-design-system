# Phase 12B：一括生成からiPhone閲覧

2026-10-10。公開可能なリポジトリ内の検証用Linux運用資料を使用。実装・Web/iOSコード・AWSリソースは変更していない。今回は全テストを再実行しない。

## 対象とローカル検証

資料：Linuxコマンドと運用の基本（Phase 12B）、ID `8209f93e-a2dd-46bc-9969-d6f1176245b7`、版1、8ページ。
原資料はexamples/linux-operations/input.md、構成は既存Phase 7サンプルを読み、表題と注意点を整えた登録v2の6種。原資料の全8節と各ページのsourceReferencesを照合。図解は原資料と既存roadmap.jsonの推奨順序を使用。分岐図と報告しない。

`create:presentation`が生成・登録描画・全形式変換・SVG削除を実行。PNG8枚3200×1800、サムネイル8枚800×450、PDF8ページ960×540pt、PPTX8ページと全見出し・ネイティブ要素・SHA256を確認。PDF/PPTXの変換検査は既存経路で成功。全サムネイル一覧目視と原文照合に重大な崩れ/欠落なし。SVGは0件、state.svg=removed-after-export。元metadataのSVG記述は削除前の生成ハッシュ証跡。review passedを付けた再実行で同じattempt 1の完成パッケージを再利用した。

今回のPowerPoint実アプリ編集とiPhone表示、PDF/PPTX全ページの別レンダラーでの画像比較は未検証。PPTXは書体非埋込みで端末依存がある。

ローカル証跡：outputs/phase12b/presentation.json、input.md、generated/、contact-sheet.png、review.json、local-validation.json、pdf-text-check.json、upload-plan.json。

## 送信計画と承認

非公開S3 `diagram-design-system-676643701781-apne1`、東京、AES256。既存専用ロールの読取preflight成功（公開アクセスブロック・BucketOwnerEnforced・暗号化）。認証情報は記録していない。

資料キーのベースは `library/diagrams/8209f93e-a2dd-46bc-9969-d6f1176245b7/versions/000001/`。

|対象|bytes|
|---|---:|
|slides/001/slide.png|91466|
|slides/002/slide.png|109441|
|slides/003/slide.png|106342|
|slides/004/slide.png|116834|
|slides/005/slide.png|140689|
|slides/006/slide.png|99714|
|slides/007/slide.png|103675|
|slides/008/slide.png|123499|
|document.pdf|671631|
|presentation.pptx|36436|
|upload-manifest.json|3778|
|library/catalog/8209f93e-a2dd-46bc-9969-d6f1176245b7/versions/000001/upload-manifest.json|3778|

合計12ファイル1,607,283 bytes。既存のサイズ上限内。原資料・構成JSON・review・認証設定・サムネイルは送信しない。対象と保存先の提示後、本人が今回の12ファイルだけのアップロードを明示承認。既存の非公開設定・アクセス制御を維持し、AWS設定変更や他資料の送信は行っていない。

## 実S3・共通APIの確認

承認を入力/原資料fingerprintと保存先hashに束縛したpolicyで、同じcreate:presentationを再実行。既存uploadDirectory経路で全成果物を条件付きPUTし、GETのSHA256/サイズ/MIME/暗号化を照合してcatalogを最後に掲載した。upload-statusはcomplete。別の読取専用validate-presentation-s3.cjsで全12オブジェクトの一致と非公開設定を確認した。

既存の共通handleをローカル認証・実S3で呼び、一覧に新規ID/版、詳細に8ページ・PNG/PDF/PPTXを確認。既存access-url処理から署名GETしてPDF/PPTX/全8ページPNG、計10成果物のサイズ・SHA256一致を確認。署名URLやtokenは保存していない。これはローカル共通API処理の実S3確認であり、デプロイ済みHTTPS/OIDCの認証後確認と区別する。

証跡：outputs/phase12b/policy.json、s3-read-verification.json、api-download-check.json、生成版のupload-status.json。

## iPhone本人確認と完了

案内した本番ライブラリ更新・新規資料のPDF/PNG/PPTX取得と閲覧について、本人から「全部閲覧できた」と成功報告を受領。既存本番iOS経路は共通HTTPS/OIDC APIから一覧・資料を取得するため、新規資料の公開API反映とiPhone閲覧をクライアント経由の本人報告として確認した。エージェントの実S3照合・ローカル共通API確認とは証跡を区別する。端末トークンを抽出・記録していない。

Phase 12Bの完了条件（一括生成・承認済みS3保存・API反映・iPhone取得/閲覧・未検証事項の記録）を満たし、完了。新規AWSリソース/設定変更・他資料の送信・Web/iOSコード変更なし。

未検証：今回の資料の端末永続保存・オフライン閲覧、各ページの実機での詳細検査、PowerPoint実アプリ編集、Macからの認証済み公開API直接呼出し。MacにCognito tokenがないため一括CLIのstateはuploaded/API pendingのままで、本人確認は別のE2E記録へ保存する。これらを自動検査済みと扱わない。

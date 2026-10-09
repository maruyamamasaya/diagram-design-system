# Phase 7.6：S3保存互換性（完了）

2026-10-09 JST、Development Mode。最終結果：ユーザー承認済みRAG1件の保存と全12オブジェクトの再取得・SHA256照合が成功。以下の未完了記述は作業段階ごとの履歴であり、現在の状態は末尾の実保存結果を正とする。既存アップロードは単一SVG/PNG専用でプレゼン構造を受け付けなかったため、presentation-package-1.0専用分岐を追加した。保存契約は[s3-storage](s3-storage.md#phase-76プレゼン保存)。生成処理・既存単一図解保存・viewer・AWS設定は変更しない。

## 初期調査結果（実接続前）

- このMacにはAWS CLI、.aws/config・credentials・login/SSOキャッシュ、AWS認証環境変数、config/s3.local.jsonがない。SDKのuploaderプロファイルでCredentialsProviderError。読取専用スクリプトも認証段階で停止。専用バケットの現在の接続・読み取り権限は未確認。Windowsの過去成功は現在の認証証跡にしない。
- RAG版1のdry-run成功。元metadataと出力形式を維持し、計画をs3-manifest.jsonへ別保存。34オブジェクト（実ファイル32＋manifest2）、110,651,866 bytes、約105.53 MiB。個別キー・サイズ・SHA256はoutputs/phase76-validation/dry-run-summary.json。
- 保存モック11/11合格。許可リスト、原metadata不変、ハッシュ/パス/シンボリックリンク/不合格拒否、条件付き保存、部分失敗・再開・衝突、危険設定拒否、保持上限、完成後PUTなしを確認。既存Phase 2実描画3/3合格。ログはoutputs/phase76-validation。
- Web viewerはcatalogのmetadata.jsonだけを読み、許可形式はSVG/PNG/input/validation。PDF/PPTXと複数ページは未対応。新完了マーカーupload-manifest.jsonを旧一覧から分離したので既存表示を阻害しない。新viewer連携は別課題。

## 承認対象案（まだ送信していない）

公開可能なAI作成RAG解説8枚、ID b290c3e5-9e2f-4abc-9193-d937859e9af6、版1。ローカル：outputs/phase75-rag/<ID>/versions/000001。

保存先案：s3://diagram-design-system-676643701781-apne1/library/diagrams/<ID>/versions/000001/。東京、アカウント676643701781、専用uploaderロールを使用。元metadata/validation、構成JSON・公開解説原資料、参照Roadmap JSON2個、SVG8・PNG8・サムネイル8、PDF1・PPTX1、保存manifest2コピー。metadataに書体のローカルパスを含む。review・中間候補・追加design・認証設定は送信しない。顧客資料なし。

費用は既存コスト方針の東京S3 Standard単価による参考値。保存0.002576 USD/月（160円/USD・税係数1.10で約0.45円/月）、34 PUT＋34 GET照合約0.000172 USD（約0.03円）、無料転送枠がなければ1回全量取得約0.011748 USD（約2.07円）。preflight/LIST・再試行等は別。最新リージョン別単価をAPIで再取得しておらず、請求額保証ではない。[AWS料金](https://aws.amazon.com/s3/pricing/)、[計算前提](cost-policy.md)。Cost Explorer等の有料APIは使わない。

## 未完了・次の手順

認証済み端末の選択、対象と保存先の人間承認が必要。承認済み設定をエージェントだけでtrueへ変更しない。認証後に読取専用preflight・catalog/既存PNG取得を確認してから、承認されたRAG1件だけ保存。完了後は同スクリプトでmanifestの全キーをGETしSHA256を照合する。既存ロールのLISTはcatalogだけなのでdiagrams全一覧のために権限を拡張しない。manifestのファイル一覧と各GET証跡で保存対象を確認する。

Phase 7.6は**実アップロード・取得が未完了**。Phase 8設計を進めること自体は可能だが、S3保存の実AWS検証を完了済みとは扱わない。

## ユーザー指定による送信範囲・上限の改訂

同日、成果物のみ保存とサイズストッパーの指示を適用。上記34個の旧送信案は撤回し、旧s3-manifest.jsonは未送信の診断記録としてローカルに残す。現行はPDF/PPTX・各ページSVG/PNGのみ18ファイル＋管理用最小manifest2コピー（計20）。原資料・構成・検証・元metadata・サムネイルは送信しない。

新dry-runは合計110,246,422 bytes（約110.25 MB）のためUploadSizeLimitErrorで停止。個別は20 MB未満だが合計50 MB以上。主因は各SVG約13.5 MBの埋込み書体。自動でSVGを省略・圧縮したり、制限を解除して送信しない。対象形式の見直しまたはSVG軽量化が必要。サイズ境界・AWS通信前停止を含む保存テスト12/12合格。Phase2描画は保存条件だけの追加後に重複実行しない。

Mac用公式AWS CLIを/tmpへ取得してApple署名・公証確認済み。AWSログイン・接続・アップロードは引き続き未実施。

## 最終保存方針とSVG削除

ユーザー指定により、プレゼンのS3送信はPDF/PPTX/各ページPNG＋最小manifest2コピーへ変更。RAGは12オブジェクト・2,440,838 bytes（約2.44 MB）でdry-run合格。current-dry-run.jsonが現行計画。過去の34/20個案は診断記録であり送信しない。

さらに今回の3資料の生成SVG26個を削除。PDF/PPTX/PNGの削除前後ハッシュは不変。各版local-retention.jsonへ削除対象・サイズ・残存ハッシュを記録した。元metadataは生成時の履歴としてSVGハッシュを保持するが実ファイルは意図的に存在しない。保存処理は送信するPNG/PDF/PPTXだけを実ハッシュ照合し、SVGやサムネイルの存在を必要としない。再変換には原資料からの再生成が必要。SVG不在の保存検証を含む13/13合格。認証・実接続・送信は未完了。

outputs清掃：失敗生成版・テスト出力・重複する変換途中ファイルを削除。完成した4資料のPDF/PPTX/PNGハッシュは不変。清掃記録はoutputs/cleanup-record/2026-10-09-cleanup.json、必要な旧検証レポートは同evidence配下。AWS操作なし。

## Mac実接続確認

2026-10-09 22:52 JST。署名確認済みAWS CLI 2.37.11を一時配置から実行し、ユーザーがパスキーでAWSログイン。diagram-design-system-signinプロファイルから既存diagram-design-system-uploaderロールを短期STSで引受。アカウント676643701781と専用ロールをget-caller-identityで確認。ローカル認証プロファイルだけを追加し、IAM権限・AWS設定は変更していない。

専用SDK読取スクリプトが成功。東京・BPA全項目true・BucketOwnerEnforced・SSE-S3・非公開を確認し、旧catalogと既存PNGを取得、SHA256一致。証跡はoutputs/phase76-validation/aws-read-result.json。RAGの完了マーカーは未存在で実送信なし。現在は対象12個/約2.44 MBへの人間承認待ち。過去のMac認証なし記録は調査当時の状態。認証情報・認証URL・トークンを証跡/Gitへ保存しない。CLIは/tmpに一時配置、認証更新時に同CLIまたは公式CLIの恒久導入が必要。

## 承認済み実保存結果（最終状態）

ユーザーの「いいよ！」でRAG版1の対象・保存先を承認確認。config/s3.local.jsonへ承認を記録し、Macの専用uploaderプロファイルで既存CLIを実行。state=complete。PDF1、PPTX1、PNG8、最小管理manifest2の計12オブジェクト、2,440,838 bytesを既存専用バケットへ保存した。SVG・原資料・構成JSON・元metadata・検証記録は送信していない。

保存キー：s3://diagram-design-system-676643701781-apne1/library/diagrams/b290c3e5-9e2f-4abc-9193-d937859e9af6/versions/000001/（document.pdf、presentation.pptx、slides/001〜008/slide.png、upload-manifest.json）。最後の完了マーカーはlibrary/catalog/b290c3e5-9e2f-4abc-9193-d937859e9af6/versions/000001/upload-manifest.json。

保存直後のGET照合に加え、独立した読取専用スクリプトで12キー全てを再取得。サイズ・SHA256・Content-Type・SSE-S3一致。個別キー一覧・SHA256はoutputs/phase76-validation/aws-read-result.json、承認はupload-approval.json、実保存状態はRAG版内upload-status.json。条件付きPUTと不変版、20 MB/50 MBストッパーを維持。

Phase 7.6完了、Phase 8へ進める。Web viewerのPDF/PPTX・複数ページ対応は未対応の別課題。既存3バケット・専用バケット公開設定・IAM・予算・AWSリソースは変更していない。作業中の認証情報・署名URLはGitや検証記録へ保存しない。

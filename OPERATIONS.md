# ローカル起動と運用

人間向けの利用例は[README](README.md)。ここは環境と運用資料への入口とする。DBセットアップは不要。

## 初期準備
ルートで`npm ci`。実描画には日本語OFLフォントとChromiumが必要。Playwright同梱ブラウザーを使うなら`npx playwright install chromium`。既存ブラウザーは単一図解CLIでは`--browser`、試験とプレゼン経路では`DIAGRAM_BROWSER`を指定する。実行例とフォント制約は[README](README.md)。

viewerは独立packageで`npm --prefix viewer ci`、`npm --prefix viewer run init`、`npm --prefix viewer run build`、`npm --prefix viewer run start`。`http://127.0.0.1:3000`で閲覧する。initが作るviewer/.local/login.txtと.env.localは秘密情報としてローカルで扱う。開発起動は`npm --prefix viewer run dev`。

## 設定の探索先
|設定|利用箇所・意味|
|---|---|
|DIAGRAM_BROWSER|src/browser.cjs・tests/。既存Chromium実行ファイル|
|DIAGRAM_FONT|tests/engine.test.cjs・src/presentation/engine.cjs。単一CLIは`--font`|
|VIEWER_SECRET / VIEWER_PASSWORD_HASH|viewer/src/lib/config.ts。initが準備する秘密値|
|VIEWER_ORIGIN / VIEWER_OWNER / VIEWER_STORAGE|同config。ループバックorigin、単一owner、mockまたはs3|
|VIEWER_AWS_SOURCE_PROFILE / VIEWER_S3_ROLE_ARN|viewer/src/lib/store.ts。S3短期認証の元とロール|
|VIEWER_TEST_ORIGIN|viewer/scripts/browser-check.cjs。試験先origin|
|config/s3.local.json|承認済み保存設定、Git対象外。契約はschemas/s3-config.schema.json|
|viewer/config/tags.json|サーバー側タグ。変更後は再起動|

環境変数の実値、token、パスワード、認証ファイル、署名URLを作業記録へコピーしない。

## AWSと公開
S3保存は[保存仕様](docs/s3-storage.md)、[AWS構成](docs/aws-plan.md)、[コスト方針](docs/cost-policy.md)、[過去の実検証](docs/phase3-validation.md)を先に読む。保存先承認と資料送信承認を分ける。`--dry-run`はローカル計画、`validate:s3`の既定は実AWS読取。書込プローブ・削除・IAM・予算変更は既存AGENTSの承認条件を守る。

公開デプロイとCI/CDは未導入。viewerのローカル認証を公開しない。[公開候補と必要認証](docs/phase4-deployment.md)、[API](docs/viewer-api.md)、[iOS案](docs/ios-integration.md)を参照。

## 問題への入口
- ブラウザー未配置：src/browser.cjsとDIAGRAM_BROWSER、フォント欠落：src/font.cjsと指定パス・グリフ・ライセンスを確認。
- 過密・OVERFLOW：項目分割とテンプレート制約を確認。省略して通さない。
- `Run npm run init` / `ORIGIN_REJECTED`：viewer初期化、originと試験ポートの一致を確認。秘密値をログに出さない。
- S3認証期限・保存拒否：短期セッションと承認・版衝突・ハッシュを確認。拒否を権限拡大で解消しない。

# ローカル起動と運用

iOS / iPadOSのビルド・起動・テストは[このMacの共通端末方針](AGENTS.md#このmacのios--ipados開発端末)に従う。過去の検証記録にある別端末の指定を現在の実行先として流用しない。

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

Phase 7.6プレゼン保存も既存`npm run upload`を使用する。実行前のdry-run、書込承認、読取検証と旧viewer未対応は[保存仕様](docs/s3-storage.md#phase-76プレゼン保存)。Windowsの認証状態はMacへ継承されない。保存設定・短期認証は各端末で準備し、秘密をチャットやGitへ転記しない。

Macの接続確認済みプロファイル：diagram-design-system-signin（ブラウザ短期ログイン）→diagram-design-system-uploader（既存専用ロール）。AWS CLIは今回/tmpの署名確認済み配布を使用。認証期限切れ時は公式CLIでsigninプロファイルへ再ログインする。詳細は[Phase 7.6](docs/phase76-validation.md)。

## Phase 11Aローカル運用

Node 22以上で `npm --prefix viewer ci`、初回のみ `npm --prefix viewer run init`。viewer/.local/login.txtと.env.localは秘密を含むGit管理外ファイル。mockは `npm --prefix viewer run mock:init` とVIEWER_STORAGE=mock、実S3は.env.localにVIEWER_STORAGE=s3とVIEWER_AWS_SOURCE_PROFILEを認証済み短期認証のsource profile名に設定する。Macで確認したsourceはdiagram-design-system-signin。AWSログイン期限切れは再ログインが必要。viewerは専用ロールを読取専用session policy付きで引き受ける。

`npm --prefix viewer run build` 後 `npm --prefix viewer run start` で127.0.0.1:3000限定。外部公開は既存ガードで拒否する。公開前には[Phase 11A公開設計](docs/phase11a-deployment.md)に従いOIDCを実装・検証・承認する。

Phase 11B-2の公開APIは未デプロイ。承認後にproposed CloudFormationとローカルbundleを用いる。VIEWER_AUTH_MODE=oidc、VIEWER_STORAGE=s3、HTTPSのVIEWER_ORIGIN、64文字以上のVIEWER_SECRET（cursor署名）、VIEWER_OIDC_ISSUER／CLIENT_ID／OWNER_SUBが必要。パスワード設定は不要、owner未設定で認可しない。Lambdaは実行ロールだけを使い、profile／AWSキーを設定しない。[実装と承認境界](docs/phase11b2-validation.md)。

公開APIは承認後CREATE_COMPLETE。[適用パラメーターと再適用手順](docs/phase11b2-deployment.md)、[実リソースJSON](infra/phase11b2-deployment.json)を正本とする。OwnerSubject未設定で全資料アクセス拒否。CursorSecret値は記録・Git管理しない。

Phase 12は`npm run create:presentation`。[資料単位の承認と再実行](docs/phase12-workflow.md)に従う。API検証のCognito access tokenはDIAGRAM_API_TOKENから読み、状態/ログへ保存しない。新規AWS設定やiOS変更は不要。

一枚図はcreate:illustrationでローカル生成し、uploadのdry-run後に資料送信承認の範囲内で保存する。[手順](prompts/illustration.md)。

ゴミ箱の本番有効化はVIEWER_TRASH_ENABLED=true、既存ロールへのstate専用権限とLambdaコード更新が必要。本機能は2026-10-10本人承認後に適用済み。追加変更は対象を確認する。[構成・費用・操作](docs/library-trash.md)。

## Mac本棚

ローカル用アプリは`mac-app/scripts/build-app.sh`で生成し、`mac-app/dist/Zukan Bookshelf.app`を開く。既存outputsを保存場所として登録する。同期・外部送信は行わない。設定保存先、解除/復元の境界と制約は[Mac本棚](mac-app/README.md)を参照。

整理同期の検証サーバーはscripts/organization-sync-http-check.pyの--serveで一時起動し、Ctrl-Cで停止/一時領域削除する。公開待受・常駐設定を追加しない。[検証画面の運用](docs/organization-sync-ui.md)。

通常本棚の同期を試す場合は[専用テスト起動](docs/organization-sync-bound.md#テスト起動)を使用する。合成state/使い捨てSimulatorだけを使い、既存の利用者データへ有効化しない。接続は127.0.0.1の一時模擬サーバー、同期は手動。

同期開始前の管理JSONバックアップと画面復元は[管理データ保護](docs/organization-sync-recovery.md)。資料本体を含めない。今後のAWS変更は、適用前に必ず[料金シミュレーション](docs/cost-policy.md#整理同期のaws変更前)を提示し、承認後に実施する。

Mac/iPhone整理同期の当初案と試算条件は[設計・試算](docs/organization-sync-aws-plan.md)、適用済み状態は[配備記録](docs/organization-sync-deployment.md)。再計算は`python3 scripts/estimate-organization-sync.py`（ローカルのみ）。AWS変更時には公式単価/実測/既存設定を再確認し、変更セットと料金を提示して別承認後に適用する。

通常本棚のテスト同期サーバーは`--limited-serve`を使い、[利用者合計5回/追加同意](docs/organization-sync-quota.md)を確認する。旧コピー検証の`--serve`へ自動で切り替えない。回数台帳は管理バックアップ復元/同期解除で初期化しない。

TypeScript同期APIの`test:organization`は一時loopbackだけを起動し、ローカル署名トークン/Memory store/合成データで検証する。設定を注入しないローカルLambda試験では404を返す。本番は明示設定で接続済み。追加のAWS設定変更・初期化・配備には別承認と再見積もりが必要。[手順](docs/organization-sync-api-local.md)。

ローカルHTTPS検証は`npm --prefix viewer run test:organization:https`。一時証明書/秘密鍵/JWTは終了時削除し、OSへCAを追加しない。製品用TLSの例外なし。テストは本番同期から分離する。[境界](docs/organization-sync-https.md)。

整理同期の本番接続は有効。ログインUIと初期接続設計は[接続準備](docs/organization-sync-readiness.md)、実クライアントの運用は[接続状況](docs/organization-sync-live-clients.md)を参照する。追加の配備変更はAWS短期セッション再認証・ライブ差分・料金提示・明示承認後に適用する。

整理同期のAWS準備は承認後に適用済み、その後serverを有効化済み。固定管理キーCAS用のバケットポリシー例外も追加承認後に適用。以後のS3設定変更でこの限定例外を消さない。[最新の適用状態と検証](docs/organization-sync-deployment.md)。

整理同期APIは2026-10-18に実認証/合成1フォルダ検証後server enabledとなった。通常アプリへは自動接続しない。停止はstackのOrganizationEnabled=falseを変更セットでレビューして適用し、管理オブジェクトを削除/空で上書きしない。[最新状態](docs/organization-sync-deployment.md)。

通常本棚の製品接続は[実端末の接続状況](docs/organization-sync-live-clients.md)を参照。2026-10-18の公開設定で有効化したビルドから、本人ログイン→管理バックアップ→統合件数確認→手動同期を使う。以前の「通常起動では無効」は当時の検証ビルドの条件であり、現在の公開設定と区別する。AWS変更なしで利用できる既存APIを使用する。

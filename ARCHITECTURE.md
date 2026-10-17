# 現在の構成

資料を理解するAI、描画、ローカル保存、S3保存、閲覧を分離する。設計上の機能と実装・認定の差分は[CURRENT](CURRENT.md)を参照。

```text
資料 → AIの構成設計 → JSON または独自描画ソース
                      |
          単一Roadmap CLI / 独立プレゼンCLI
                      |
               ローカル outputs/
                      |
           upload CLI（単一図解v1） → 非公開S3
                                         |
ブラウザー → viewer/ API → 認証・owner認可 → 読取・期限付きURL
```

## 技術と責務
ルートはNode.js 22以上・CommonJS。Ajvで契約検査、fontkitでフォント、Playwright/Chromiumで実測と描画、pngjsで画像検査、AWS SDKで保存する。版の正本は`package.json`とlockfile。

|場所|責務と入口|
|---|---|
|rules/、templates/、prompts/|共通仕様、意味・構造、依頼の入口|
|schemas/、config/|入力・保存契約、スライド登録表|
|src/cli.cjs → model/rules/font/browser/engine.cjs|単一図解検査・描画。engineはBufferを返す|
|src/storage.cjs|ローカル保存。生成は保存先を知らない|
|src/upload-cli.cjs → src/upload/|既存完成図を読み、metadata作成・条件付きPUT・GET照合・catalog掲載|
|src/presentation/|独立の検査・描画・版別ローカル保存。既存CLIとは別経路|
|viewer/|Next.js App Router、React、TypeScript、jose。独立package・テスト|
|infra/、docs/|AWS設定案・既存構築証跡・責務別仕様|
|tests/、examples/、assets/|検証・入力例・ライセンス付きフォント|

## APIとデータ
`viewer/src/app/api/web/[...path]/route.ts`はWeb用、`v1/[...path]/route.ts`はBearer API、`api/artifact/route.ts`はmock成果物用。処理は`viewer/src/lib/api.ts`の`handle`へ集約。login/session/logout、auth/token/revoke、diagrams一覧・詳細・アクセスの契約は[API仕様](docs/viewer-api.md)。

DB・ORM・マイグレーションはない。入力JSON、ローカル成果物、S3のmetadata/catalog、サーバー側タグ設定を利用する。セッションと制限はプロセス内管理で、公開・複数インスタンス構成の認証基盤ではない。

## 認証と外部依存
ビューアーはローカルパスワード、Cookie/CSRF、短期Bearer、単一owner認可。S3はサーバー側短期認証で読取し、キーをブラウザーへ渡さない。公開ホストでは起動拒否を行う。秘密情報はGit対象外。

デプロイはルートのローカルCLIとループバックのviewer。リポジトリにCI/CD workflowはない。`infra/`の提案JSONは自動適用するデプロイ設定ではない。公開案は[Phase 4デプロイ](docs/phase4-deployment.md)、起動条件は[OPERATIONS](OPERATIONS.md)。

## Phase 11Aのviewer拡張

viewer/src/lib/manifest.tsで旧metadataとPhase 7.6の成果物限定manifestを共通モデルへ正規化する。S3 catalog以外を一覧探索せず、固定バケット・ID・版・許可形式・MIME・キー・ページ連続性を検査する。APIはpageCountとページ指定を提供し、UIはPNGのページ切替、PDF iframe、形式別取得を担う。現行の短期ロールに読取専用session policyを適用する。公開認証は[設計](docs/phase11a-deployment.md)段階。生成・upload・iOSの責務は変更しない。

## Phase 11B-2公開API境界

viewer/src/lambda.tsから共通handleへ入り、OIDCモードでCognito JWKS検証とowner認可を実施。実行ロールの短期認証でS3読取。ローカルNext.jsのcookie/password経路は維持し公開モードで拒否する。iOSは別リポジトリのCloudOIDC.swiftとHTTPSCloudAPI。公開リソースは未適用。[証跡](docs/phase11b2-validation.md)。

Phase 12のsrc/workflowは既存プレゼン生成と独立uploadを呼ぶオーケストレーター。原資料→Codex構成JSON→ローカル生成/検査/プレビュー→内容/目視と送信承認→既存S3 catalog→共通API一覧/詳細確認。Web/iOSは既存catalogを再読込する。状態はoutputs内のローカルJSON、追加DBやAWSリソースなし。

Phase 10Aのsrc/updateは既存構成JSON＋新旧原資料から更新計画JSON/Markdownを出す独立経路。描画・保存・AWSを呼ばない。[契約](docs/phase10a-update-plan.md)。

独立一枚図はsrc/illustrationで自由SVG／画像部品／全体PNGを変換・ローカル保存。専用loaderから共通upload処理を利用しillustration-s3-1.0をcatalog公開。共通APIがtype=illustrationへ正規化する。[契約](docs/illustration-workflow.md)。

Phase 10B：src/updateは計画を原資料から照合し、既存登録描画へ更新対象だけを渡す。旧成果物のコピー・ネイティブPDF/PPTX再構成は独立のローカル保存工程。旧版とS3/viewer境界を変更しない。[責務・版管理](docs/phase10b-partial-update.md)。

ゴミ箱の状態は成果物から分離し、viewerのowner認可後にlibrary/state/{id}.jsonへ保存するローカル実装。資料全版の可視性だけ変更。承認後の本番反映案と未検証境界は[仕様](docs/library-trash.md)。

## Mac本棚（独立ローカルアプリ）

`mac-app/`は明示依頼によるSwift Package。BookshelfCoreはFoundationの資料/版・フォルダ・設定保存・既存metadata取込、BookshelfはSwiftUI/AppKitのMac画面・アクセス権・PDFKit/Quick Look。生成outputsは参照のみ、分類はApplication Supportへ分離保存。iOSの変更と同期は対象外。[操作・境界](mac-app/README.md)。

Macの変更監視は別ターゲットBookshelfWatchingへ隔離。FSEventsからStoreの既存スキャナを呼び出し、Foundationの共通資料モデルはOS監視APIへ依存しない。

## Mac/iOSの整理共通層

`packages/LibraryOrganization`はFoundationだけのローカルSwiftパッケージ。MacのBookshelfCoreと隣接zukanのXcodeアプリが参照する。フォルダ・タグ・まとめを別概念として保持し、端末固有の取込/認証/保存はアダプターに残す。[データ仕様](docs/library-organization.md)。

整理同期エンジンは共通層内の独立した値型クライアント/模擬authorityとtransportプロトコル。テスト用HTTPブリッジだけがloopback待受し、本体アプリや常駐サービスを追加しない。[境界](docs/organization-sync-local.md)。

LibraryOrganizationのFoundationコアとは別ターゲットLibraryOrganizationUIに検証用SwiftUI/セッションを分離。既定のMac/iOS起動は読取専用アダプターで検証コピーへ投影する。明示的なテスト起動ではTestLibrarySyncBindingが通常Storeの保存差分と受信反映を接続し、端末固有情報の再結合・バックアップ・iOS反映ジャーナルは各アダプターが担当する。[通常本棚のテスト接続](docs/organization-sync-bound.md)。[構成](docs/organization-sync-ui.md)。

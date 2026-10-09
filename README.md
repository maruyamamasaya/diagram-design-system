# AI図解デザインシステム

AIエージェント向けの、横長モノクロ図解の共通ルール・テンプレート・依頼プロンプト。Phase 2は構造化JSONからSVGとPNGを生成するCLI、Phase 3は非公開S3保存用の独立CLI・メタデータ管理を提供する。Phase 3Bで承認済みの専用非公開S3・IAMロール・Budgetsを構築し、実保存と再取得を検証済み。Webアプリ・常駐サーバーは含まない。

## 利用方法
1. エージェントへ [AGENTS.md](AGENTS.md) を入口として指定する。
2. [生成プロンプト](prompts/generate.md) に目的、読者、入力、条件、形式を記入する。
3. エージェントは全共通ルールと、目的に対応するテンプレートを読む。
4. 成果物と検証記録を確認する。修正は [修正プロンプト](prompts/revise.md) を使う。

依頼例：「AGENTS.mdを読み、examples/linux-roadmap/input.mdをRoadmapとして生成してください。SVGとPNGを出力し、quality.mdに沿った検証記録を付けてください。」

未指定時は[export.md](rules/export.md)の対応済み全形式を標準生成対象とする。明示指定を優先する。成果物パッケージと将来のmetadata 2.0は[storage.md](rules/storage.md)を参照する。現行CLIのSVG・PNGとmetadata 1.0は維持し、全形式のオーケストレーション・不足分再生成・新形式の保存は未実装。ルールは出力仕様を定義するもので、実行環境の生成・変換機能を保証しない。

## ファイルの責務
|場所|責務|
|---|---|
|[AGENTS.md](AGENTS.md)|入口、優先順位、読み分け、実行・保守手順|
|[design](rules/design.md)|視覚トークン、文字、素材|
|[layout](rules/layout.md)|寸法、配置、密度、分割|
|[content](rules/content.md)|事実・原文・条件と入力対応|
|[export](rules/export.md)|標準成果物、形式別条件と対応状況|
|[storage](rules/storage.md)|成果物パッケージ、生成状態、再生成、S3保存と移行設計|
|[quality](rules/quality.md)|検査と完了判定、証跡|
|templates/|[Roadmap](templates/roadmap.md)、[Flowchart](templates/flowchart.md)、[Architecture](templates/architecture.md)、[Comparison](templates/comparison.md)の意味と構造|
|prompts/|生成・修正の依頼ひな形|
|[Linux Roadmap例](examples/linux-roadmap/README.md)|説明用入力、JSON入力、Phase 2検証記録|
|[JSONスキーマ](schemas/diagram.schema.json)|論理的な内部表現の型・必須項目|
|src/|入力検査、ルール読込、配置・生成・検証、保存、CLI|
|tests/|正常系・不正入力・過密入力・実レンダリングの回帰検証|
|[metadata schema](schemas/metadata.schema.json)|図解ID・版・日時・成果物・保存キー・検証状態|
|[S3 config schema](schemas/s3-config.schema.json)|保存先、所有アカウント、承認記録、SSE-S3|
|src/upload/、src/upload-cli.cjs|保存前検査、S3アダプター、再実行可能なアップロード|
|[AWS構成案](docs/aws-plan.md)、infra/|読取調査・料金・適用済み設定と将来変更案|
|[共通API仕様](docs/viewer-api.md)|Web・iOSの認証・認可、一覧・詳細・期限付き取得|

## Phase 2：CLIの実行

Node.js 22以上、npm、Chromium系ブラウザー、日本語を含むOFLフォントが必要。依存版はpackage-lock.jsonに固定する。

```powershell
cd C:\Users\m-maruyama\Development\diagram-design-system
npm ci
npx playwright install chromium
npm run generate -- --input examples/linux-roadmap/input.json --template roadmap --output outputs/my-run --font C:/Windows/Fonts/NotoSansJP-VF.ttf
```

インストール済みChromeを使う場合、最後のコマンドに `--browser "C:/Program Files/Google/Chrome/Application/chrome.exe"` を追加すればPlaywrightのブラウザー追加インストールは不要。Linux/macOSでは `--font` に日本語OFLフォントのファイルを必ず指定する。Windowsでは上記Noto Sans JPのパスを既定とするが、導入されていなければ明示指定する。

テストも同じブラウザー・フォントを指定できる：

```powershell
$env:DIAGRAM_BROWSER = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:DIAGRAM_FONT = 'C:/Windows/Fonts/NotoSansJP-VF.ttf'
npm test
```

CLIは `--input`（JSON）、`--template roadmap`、`--output`（このプロジェクトのoutputs配下）、`--font`、任意の `--code-font` と `--browser` を受け取る。パスは実行ディレクトリ基準。出力先は空の新規サブディレクトリを使い、既存結果は上書きしない。`.gitignore` が `outputs/` と `node_modules/` を除外する。現状のフォルダーにはGitが初期化されていないため、Git初期化後にもこの除外設定を保持する。

出力は `diagram.svg`（1600×900）、`diagram.png`（3200×1800）、入力の複製 `input.json`、`validation.json`。SVGは編集可能なtext・rect・pathと安定IDを持ち、フォントをdata URIで埋め込む。スクリプト、外部URLへの画像・フォント依存はない。フォントとライセンス情報はSVGのmetadataと検証記録に保持する。

## 内部表現と責務分離

[diagram.schema.json](schemas/diagram.schema.json) はバージョン付き論理モデルを定義する。段階にはID、見出し、目的、関連項目と種類（text / code）、任意の到達条件を持つ。接続には始終点、recommended / prerequisite、表示ラベル、根拠を必須にする。順序はsteps配列で指定し、接続は明示入力との一致を検査する。入力にない関係を推測しない。

`model.cjs` はJSON Schemaと意味上の制約、`rules.cjs` は共通ルールの数値・色トークンと参照ファイルのハッシュ、`font.cjs` はライセンスメタデータ・文字グリフを検査する。`engine.cjs` は実ブラウザーで文字を測定し、内部のカード・文字・接続配置からSVGを作り、そのSVGを画像としてレンダリングしてPNGを返す。配置情報と入力対応表はvalidation.jsonへ出力する。

`generate(input, {rules, font, codeFont, context, template})` は成果物をメモリー内のBufferとして返し、保存先を知らない。`saveArtifacts(artifacts, storage)` は `storage.write(name, bytes)` を使用する。Phase 3は別コマンドでローカル完成図を読み、S3保存アダプターを使用する。図解生成コードは変更していない。Webビューアーは保存済み成果物を閲覧する別機能として追加できる。

## 検証と制約

自動検査：スキーマ、ID重複、接続整合、原文保持、グリフ対応、SVG実測境界、文字同士の重なり、PNGデコード・寸法、全画素の不透明モノクロ。実際のSVGをChromiumでレンダリングする。目視確認と事実確認は自動で合格にしない。

- 対応範囲は1ページ、1〜4段階の直列Roadmap。並行・任意段階、フェーズ枠、自動複数ページ化、他テンプレート、PDF/PPTXは未実装。対象外入力は拒否する。
- 過密な入力・長すぎるコマンドはエラーにし、省略や最小文字サイズ以下への縮小はしない。日本語の自動改行は文字単位で、禁則処理は未実装。コマンドは空白区切りでのみ改行する。
- 日本語は実行環境のOFLフォントを使い、等幅フォントは同梱のNoto Sans Mono。日本語をcodeとして渡す場合はその文字を含む等幅OFLフォントを `--code-font` で指定する必要がある。
- フォント全体を埋め込むため、今回のSVGは約13 MB。サブセット化は今後の改善候補。対応ビューアーによって埋め込みフォントの描画が変わる可能性がある。Chromium以外の互換性は未検証。
- フォント境界を優先し、推奨行高では重なる場合は行高を広げる。この逸脱は検証記録に残す。
- ルールの文章をAIのように解釈するエンジンではない。数値・色はMarkdownから取得し、意味の実装はテンプレートアダプターが担う。ルール・テンプレートの意味を変更したらアダプターとテストを見直す。

最初の検証ケースと目視結果は [Phase 2検証記録](examples/linux-roadmap/phase2-validation.md) を参照する。

## Phase 3：S3保存

最初に `npm ci` でAWS SDKを含む依存を導入する。保存仕様と失敗・再試行は [s3-storage.md](docs/s3-storage.md)、AWS接続状況・専用バケット構成・料金・将来変更案は [aws-plan.md](docs/aws-plan.md) を読む。

```powershell
# AWSへ通信せず、ローカルのmetadataと保存計画を作る
npm run upload -- --input outputs/linux-roadmap-final --config config/s3.example.json --dry-run

# 保存先が承認・準備され、config/s3.local.jsonのapproved=trueを確認した後だけ実行
# --approve-contentはinput.jsonとvalidation.jsonを含む内容送信の明示許可
npm run upload -- --input outputs/linux-roadmap-final --approve-content
```

S3接続はAWS SDK標準認証チェーンで短期認証を使用する。認証情報の埋め込みは禁止。config/s3.local.json、outputs/、.aws/、.env等はGit除外。保存先例config/s3.example.jsonはapproved=falseのまま。承認済み実設定config/s3.local.jsonはapproved=trueで、専用AWSプロファイルdiagram-design-system-uploaderを使用する。アップロードCLIと生成CLIを分け、失敗してもローカル成果物を保持する。

追加のローカル出力はmetadata.jsonとupload-status.json。ID・版・ファイルSHA256を固定し、If-None-Match条件付きPUTとGET照合で異なる内容の上書きを防ぐ。全ファイルの保存検証後にcatalogへ一覧用metadataを保存する。既定3版を超える更新を止め、棚卸し・削除は承認を得て実施する。残骸や旧版の自動削除機能は未実装。

Web・iOS連携は [API仕様案](docs/viewer-api.md) で定義した。非公開S3を維持し、認証・認可後に短時間の署名付きURLで取得する。APIサーバー・認証基盤・ビューアーは今回未実装。

初期構成はSSE-S3、S3 Standard、最小権限、監視専用Budgetsを基本とする。EC2・NAT・ALB・WAF・独自KMSキー・PrivateLink・VPC Endpointは追加しない。将来Lambdaは不要なVPC接続を避け、CloudWatch Logs保持14日を初期案とする。課金する設定・監査機能の作成変更は、料金と必要性を示して承認を得る。

検証結果： [Phase 3実装検証](docs/phase3-validation.md)。Phase 3Bで最小権限ロールによる実PUT/GET、6オブジェクトのSHA256一致、412/403上書き拒否、部分失敗からの再開を確認した。ローカル回帰テスト10/10も合格。

## 拡張手順
新タイプは用途・選択基準・必要入力・形状と接続の意味・固有検査をtemplates/に追加し、AGENTS.mdの選択表を更新する。共通トークンはテンプレートへ複製しない。共通ルール変更時は全テンプレート・プロンプト・例の影響とリンクを確認する。

今後の技術案：他テンプレートのアダプター、自動ページ分割、禁則処理、フォントサブセット化、PDFと編集可能PPTXを追加する。続くPhaseで認証・認可を持つWeb・iOSビューアー、旧論理版・残骸の削除計画ツールを検討する。採用前にフォント・アイコンの許諾、PDF埋め込み、PPTX個別編集と互換性を評価する。自動検査を導入しても内容の正確性と視覚検証は残す。

## 変更記録
- 全形式標準化（設計）：export/storageルール、参照プロンプト、metadata-package 2.0スキーマを追加。1.0と既存CLIは維持。新レンダラー・AWS変更・2.0実行経路は未実装。旧成果物の改名や自動移行を行わず、移行条件はstorage.mdを参照。
- 初期版：ルール5種、テンプレート4種、プロンプト2種、説明用入力と検証ひな形を定義。図解・レンダラーは未生成。
- Phase 2（0.2.0）：論理JSON Schema、Roadmapエンジン、SVG・PNG、CLI、保存アダプター、回帰テストを追加。初期の入力例を保持し、対応するJSONと検証記録を追加。
- Phase 3（0.3.0）：S3保存モジュール、独立upload CLI、metadata/configスキーマ、衝突・部分失敗・再試行・版保持上限のテスト、IAMと料金・Budgets・API仕様案を追加。既存の生成コードとPhase 2テストを保持。

## Phase 3B：実環境と読み取り再検証

アカウント676643701781、東京ap-northeast-1の専用バケットdiagram-design-system-676643701781-apne1は非公開、BPA全true、SSE-S3、BucketOwnerEnforced。S3 Versioningと自動削除lifecycleは有効にしていない。既存3バケット・64 USD予算を変更していない。ロールdiagram-design-system-uploaderは既存管理ユーザーからの短期STS引受だけを許し、長期アクセスキーは作成していない。

```powershell
cd C:\Users\m-maruyama\Development\diagram-design-system
# AWSのdefault loginセッションが有効な場合、専用ロールを引き受ける
aws sts get-caller-identity --profile diagram-design-system-uploader
# 承認済みLinux例の通常アップロード。完了後の再実行はPUTなしで検証
npm run upload -- --input outputs/linux-roadmap-final --approve-content
# AWSへの書き込みをせず、再取得と整合性を検証
npm run validate:s3 -- --input outputs/linux-roadmap-final
```

再取得物と証跡はoutputs/phase3b-validation/へ保存する。検証用の --probe-overwrite / --exercise-upload はAWS書込テストなので、明示承認と --approve-content が必要。--exercise-upload は未掲載サンプルのみ使用できる。新たな機密資料の送信はこのLinux例の承認に含まれない。詳細・SHA256・残課題は [実検証記録](docs/phase3-validation.md)。

現在の新規予算diagram-library-s3-monthlyは月額1 USD・アカウント全体S3・ACTUAL 80/100%、FORECASTED 100%。メール購読設定を確認済みだが、配信実績は未検証。最新方針は追加月額100円以内で、[100円コスト設計](docs/cost-policy.md) に通常利用約6円/月、転送無料枠なし約36円/月、超過条件と図解専用0.50 USD・50/80/100%通知案を記載。為替160円/USD・税係数1.10の試算で、将来のAPI・認証費用は別見積もり。予算変更・タグ有効化は未実施。

- Phase 3B：専用S3・短期IAMロール・1 USD監視予算を承認後に構築。実アップロード・取得整合性・拒否・中断再開を検証し、再確認CLIと証跡を追加。追加100円コスト方針は調査・設計のみ。


## Phase 4：ローカルWebビューアー

```powershell
cd C:\Users\m-maruyama\Development\diagram-design-system\viewer
npm ci
npm run init
npm run build
npm run start
```

http://127.0.0.1:3000 を開き、viewer/.local/login.txtのランダムパスワードでログインする。initは既存設定を上書きしない。設定・パスワード・outputsはGit管理外。既定はmockで既存outputs/linux-roadmap-finalを使用する。

実S3の読取には有効なaws loginセッションを用意し、起動前に `$env:VIEWER_STORAGE='s3'` を設定する。既存専用ロールに読取専用セッションポリシーを適用する。ブラウザへAWSキーは渡さない。生成CLI・upload CLIとは独立する。

検証はviewer内で `npm run typecheck`、`npm test`、`npm run build`、起動後に `node scripts/browser-check.cjs`。ルートの `npm test` はPhase 2・3の回帰検証。別ポート時はVIEWER_ORIGINとVIEWER_TEST_ORIGINを一致させる。

[Phase 4実装・検証](docs/phase4-validation.md)、[認証・公開候補・料金](docs/phase4-deployment.md)、[共通API](docs/viewer-api.md)。現在はローカル専用。別PC/iPhoneからの利用には承認後の公開構築とOIDC認証が必要。

iOSは既存Presentation-Viewerへ図解ライブラリを追加する方針を推奨する。[連携案・実装順序](docs/ios-integration.md)。現在は設計のみで既存iOSアプリを変更していない。

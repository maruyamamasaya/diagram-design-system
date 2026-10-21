# AI図解デザインシステム

依頼別の入口は[作業経路](docs/work-routes.md)。資料制作・アプリ改修・設計思想の整理を分け、現在の責務は[ARCHITECTURE](ARCHITECTURE.md)、制作で得た選好と固定レイアウトは[レイアウト方針](docs/presentation-layout-policy.md)を参照する。

## 開発を継続するための入口
AIには「資料を作る」「システムを改修する」「文書を更新する」の目的と対象を伝える。同じ入力資料でも依頼に応じて経路を分ける。[AGENTS](AGENTS.md) → [現在地](CURRENT.md)から開始し、必要な[構成](ARCHITECTURE.md)、[コード探索](CODEMAP.md)、[検証](TESTING.md)、[運用](OPERATIONS.md)へ進む。[設計判断](decisions/README.md)と[作業記録](sessions/README.md)は必要な履歴だけ読む。

プレゼンの実装・登録・検証の現状は[CURRENT](CURRENT.md)を参照。開発の標準検証は`npm run verify`、文書だけなら`npm run verify -- docs`。詳細は[TESTING](TESTING.md)。

AIエージェント向けの、白背景・モノクロを土台にした横長図解の共通ルール・テンプレート・依頼プロンプト。Phase 2は構造化JSONからSVGとPNGを生成するCLI、Phase 3は非公開S3保存用の独立CLI・メタデータ管理を提供する。Phase 3Bで承認済みの専用非公開S3・IAMロール・Budgetsを構築し、実保存と再取得を検証済み。Phase 4は独立したローカル閲覧用ビューアーを提供する。資料の意味理解・構成設計はAIが担当し、既存CLIの対応範囲はAI生成の上限ではない。独立した図解作成アプリの開発が主目的ではない。

## 自然言語による資料生成（標準）

プレゼンは[内容に応じたページ設計](rules/layout.md#内容に応じたページ設計)を共通方針とする。情報量と構成の工夫が明示された制作では[専用プロンプト](prompts/presentation.md)の専用登録経路を選べる。

プレゼンの新規制作では、表現モードを「通常モード／グラフィック版」から選ぶ。未指定時の確認条件と制作条件から選択できる場合は[専用プロンプト](prompts/presentation.md)と[グラフィック版の運用](docs/presentation-graphic-mode.md)を参照。
Codexへ「AGENTS.mdを読み、この資料を図解して」と依頼し、資料本文またはファイルパスを渡す。JSONの事前作成は不要。Markdown、テキスト、技術ドキュメント、仕様書・設計資料を標準入力とし、PDF・Word・PowerPointは環境の読取能力を確認する。

依頼例：「AGENTS.mdを読み、examples/agent-creation/input.mdを図解して。図の種類と描画手段は内容に合わせて選び、対応可能な全形式をローカル保存し、検証記録を付けて。」

1. AIが資料を読み、必須項目・階層・関係・出典を整理する。
2. 全共通ルールと関連テンプレートを読み、構成と生成手段を選ぶ。Agent Creation Modeを標準とし、既存エンジンに適合すれば利用、範囲外ならSVG・HTML等を使う。
3. 共通設計から対応形式を生成し、[検証レベル](rules/quality.md)に沿って内容・日本語・配置を確認する。通常は標準検証と一覧目視、疑わしい箇所だけ詳細確認する。
4. outputs/配下でID・版、原資料、共通設計、描画ソース、形式別状態、検証記録を管理し、成果物と制約を報告する。
5. S3は保存先と資料送信の承認、既存保存仕様への適合を確認して別工程で行う。登録プレゼンと独立一枚図は対応済みの保存契約を使い、一般の独自成果物は互換性を個別確認する。

[生成モード・責務・現状との差分](docs/agent-creation.md)と[Markdown E2Eシナリオ](examples/agent-creation/README.md)を参照。制作実績はsessionsと個々の成果物の証跡に保持する。シナリオ追加や既存回帰テスト合格だけで意味理解を検証済みとは扱わない。

## 利用方法
1. エージェントへ [AGENTS.md](AGENTS.md) を入口として指定する。
2. [生成プロンプト](prompts/generate.md) に目的、読者、入力、条件、形式を記入する。
3. エージェントは全共通ルールと、目的に対応するテンプレートを読む。
4. 成果物と検証記録を確認する。修正は [修正プロンプト](prompts/revise.md) を使う。

依頼例：「AGENTS.mdを読み、examples/linux-roadmap/input.mdをRoadmapとして生成してください。SVGとPNGを出力し、quality.mdに沿った検証記録を付けてください。」

未指定時は[export.md](rules/export.md)の対応済み全形式を標準生成対象とする。明示指定を優先する。成果物パッケージと将来のmetadata 2.0は[storage.md](rules/storage.md)を参照する。旧単一図解CLIのSVG・PNGとmetadata 1.0は維持する。登録プレゼンの一括制作・PDF/PPTX・S3保存・部分更新、独立一枚図PNG/PDFは対応済み。一般metadata 2.0の不足分再生成は設計段階。ルールは出力仕様を定義するもので、実行環境の生成・変換機能を保証しない。

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

CLIは `--input`（JSON）、`--template roadmap`、`--output`（このプロジェクトのoutputs配下）、`--font`、任意の `--code-font` と `--browser` を受け取る。パスは実行ディレクトリ基準。出力先は空の新規サブディレクトリを使い、既存結果は上書きしない。`.gitignore` が `outputs/` と `node_modules/` を除外する。Git管理でもこの除外設定を保持する。

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

Web・iOS連携は [API仕様案](docs/viewer-api.md) で定義した。非公開S3を維持し、認証・認可後に短時間の署名付きURLで取得する。公開API・公開認証基盤・iOS連携は未実装。ローカルWebビューアーの実装状況はPhase 4を参照する。

初期構成はSSE-S3、S3 Standard、最小権限、監視専用Budgetsを基本とする。EC2・NAT・ALB・WAF・独自KMSキー・PrivateLink・VPC Endpointは追加しない。将来Lambdaは不要なVPC接続を避け、CloudWatch Logs保持14日を初期案とする。課金する設定・監査機能の作成変更は、料金と必要性を示して承認を得る。

検証結果： [Phase 3実装検証](docs/phase3-validation.md)。Phase 3Bで最小権限ロールによる実PUT/GET、6オブジェクトのSHA256一致、412/403上書き拒否、部分失敗からの再開を確認した。ローカル回帰テスト10/10も合格。

## 拡張手順
新タイプは用途・選択基準・必要入力・形状と接続の意味・固有検査をtemplates/に追加し、AGENTS.mdの選択表を更新する。共通トークンはテンプレートへ複製しない。共通ルール変更時は全テンプレート・プロンプト・例の影響とリンクを確認する。

今後の技術案：他テンプレートのアダプター、自動ページ分割、禁則処理、フォントサブセット化、PDFと編集可能PPTXを追加する。続くPhaseで認証・認可を持つWeb・iOSビューアー、旧論理版・残骸の削除計画ツールを検討する。採用前にフォント・アイコンの許諾、PDF埋め込み、PPTX個別編集と互換性を評価する。自動検査を導入しても内容の正確性と視覚検証は残す。

## 変更記録
- 2026-10-09：Agent Creation Modeを標準、Deterministic Rendering Modeを補助として定義。自然言語入力、柔軟な描画手段、共通検証・ローカル管理、Markdown E2Eシナリオを追加。Phase 2〜4のコード・スキーマ・保存形式は変更せず、既存出力の移行は不要。自然言語生成E2Eは未実施。
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

iOSの閲覧クライアントは隣接する [zukan](../zukan/README.md)（旧名：Presentation-Viewer）。図解ライブラリ・本番OIDC認証・クラウド取得・オフライン閲覧を実装済み。現在の状態は [zukanの現在地](../zukan/CURRENT.md)、Mac/iPhoneの整理同期は[接続状況](docs/organization-sync-live-clients.md)を参照する。[連携方針](docs/ios-integration.md)には当初の設計を保持する。

## Phase 5：プレゼン設計基盤
登録されたTitle / Bullet / Two Column Comparison / Diagram / Table / Summaryを選択・組合せする設計を追加。[設計](docs/presentation-design.md)、[選択・配置ルール](rules/presentation.md)、[プロンプト](prompts/presentation.md)、[6ページJSON例](examples/linux-presentation/source.json)。描画経路の存在と認定状況は[CURRENT](CURRENT.md)を参照する。既存単一RoadmapのSVG/PNG機能は維持。

```powershell
node -e "require('./src/presentation/validate.cjs').validatePresentation(require('./examples/linux-presentation/source.json')); console.log('valid')"
npm test
```

入力JSON検証は構造と意味の一部だけを確認し、視覚品質や参照ファイルの実測ハッシュを保証しない。描画品質を確認したテンプレートを本番登録する工程は次フェーズ。[検証記録](docs/phase5-validation.md)。

## Phase 6：複数スライドSVG/PNG生成

Development Modeでエンジンを実装。Creation ModeではAIがMarkdownを読み、登録テンプレートで構成したJSONをCLIへ渡す。CLI自身が自然言語を解析する機能はない。Linux技術資料の8節をAIが8ページに整理した再現例はexamples/linux-operations/。

```powershell
$env:DIAGRAM_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run generate:presentation -- --input examples/linux-operations/presentation.json --source examples/linux-operations/input.md
# --output ディレクトリ / --font OFL日本語TTF / --browser 実行ファイル を指定可能
npm test
```

出力はoutputs/<presentationId>/versions/<6桁版>/。同じID・版を上書きしない。例の版は2（開発中の失敗版1を保持）。再実行は入力のversionを増やすか別の--outputを指定する。版番号を自動採番して資料同一性を曖昧にしない。途中失敗はローカル成果物を保持しvalidation.jsonへ記録する。既存generate/uploadのCLIは維持。

6種のSVG/PNGと800×450 PNGサムネイル、構成JSON、原資料、参照図解、検証と専用metadataを生成。Diagramは直列Roadmapのみ対応。表・箇条書き・比較軸の実測高さ超過は単位ごとに分割し、元slideId＋part、固有pageIdを保持。単一要素が登録上限に収まらない場合は停止し、AIによる分割・構成修正を要求する。文字を縮小/切捨てしない。

PDF・PPTX・軽量Web SVG・WebPはunsupported。現行uploadやviewerへプレゼンパッケージを直接渡さない。[実装・検証と残課題](docs/phase6-validation.md)、[内部構造・互換性](docs/presentation-engine.md)。

## Phase 6.5：改善版プレゼン
6種のv2を登録し、従来v1も利用できる。[採用方針](docs/presentation-skill-policy.md)・[配置仕様](docs/presentation-layout-v2.md)・[比較記録](docs/phase65-validation.md)。

```powershell
$env:DIAGRAM_BROWSER="C:/Program Files/Google/Chrome/Application/chrome.exe"
npm run generate:presentation -- --input examples/linux-operations/presentation-dense.json --source examples/linux-operations/input.md --output outputs/phase65-reproduction
```

既存の同じID・版があれば上書き拒否。再実行では構成JSONのversionを上げるか、新しい出力先を指定する。PDF/PPTXは未実装。

## Phase 7：ベクターPDF・編集可能PPTX
新規資料はv2を標準とし、明示v1は維持します。手順・環境・書体の制約は[出力仕様](docs/presentation-export.md)、結果は[Phase 7検証](docs/phase7-validation.md)。

```powershell
$env:DIAGRAM_BROWSER="C:/Program Files/Google/Chrome/Application/chrome.exe"
npm run generate:presentation -- --input examples/linux-operations/presentation-phase7.json --source examples/linux-operations/input.md --output outputs/phase7-reproduction
npm run test:exports
```

標準でSVG/PNG/サムネイル・構成/メタデータ・PDF・PPTXを生成。画像だけなら`--formats svg,png`、既存の未変換パッケージは`npm run export:presentation -- --input <package-directory>`。同じID・版や既存の変換ファイルは上書き拒否。AWS・viewer連携は別工程です。

### Phase 11A：資料ライブラリ

既存Web viewerは旧SVG/PNG図解とPhase 7.6のPDF/PPTX/ページPNG成果物に対応。検索・一覧・ページ切替・PDFプレビュー・形式別取得をローカル認証環境で利用できる。PPTXはPNGでプレビューし対応アプリで編集する。外部公開用OIDCは未実装。[検証](docs/phase11a-validation.md)と[公開方式・費用案](docs/phase11a-deployment.md)を参照。開発順序は11A→11B→12→10、8・9は保留。

## Phase 12：制作ワークフロー

`npm run create:presentation -- --input <構成JSON> --source <原資料Markdown>` で全形式・検査・一覧プレビューをローカル生成。Codexの原資料読取からの手順、資料単位の送信承認、API確認と安全な再実行は[一括ワークフロー](docs/phase12-workflow.md)を参照。

Phase 12一括ワークフローの標準納品はPNG/PDF/PPTX・サムネイル。SVGは内部変換後に削除する（既存単独生成CLIの互換仕様は維持）。

## Phase 10A：更新計画

`npm run plan:presentation -- --input <構成JSON> --before <旧sourceId辞書JSON> --after <新sourceId辞書JSON> --output <新規ディレクトリ>`。差分とスライド更新計画をJSON/Markdownで出力する。再生成・アップロードは行わない。[Linux例・判定仕様](docs/phase10a-update-plan.md)。

### 制作の基本配色と密度

白背景・モノクロは土台とし、公式サービスアイコンと必要な補助色を使えます。配色は[design](rules/design.md)、プレゼンの標準枚数と関連テーマの統合は[layout](rules/layout.md)を正とします。既存の定型レンダラーの配色・分割動作は変更していません。

独立した複雑な一枚図は `npm run create:illustration -- --input <job.json> --font <OFL日本語.ttf>`。[制作方法の選択と画像生成](prompts/illustration.md)。新規図解は未指定なら[横長標準](rules/layout.md)とし、説明不足は[補足ルール](rules/content.md)に従って補う。PNG/PDFを既存uploadへ渡せる。

## Phase 10B：部分更新

`npm run update:presentation -- --baseline <旧版> --plan <Phase10A計画JSON> --input <新構成JSON> --sources <新sourceId辞書JSON> --output <出力ルート> [--font <TTF>] [--browser <Chrome>]`。更新対象だけ描画、維持対象をハッシュ一致で再利用し、新版PNG/PDF/PPTX/サムネイルを作成。要確認が残れば保留する。[手順・Linux例・制約](docs/phase10b-partial-update.md)。

## Macの資料本棚

既存成果物をサムネイルで探し、仮想フォルダ・検索・プレビューで整理する独立Macアプリを`mac-app/`へ追加。[起動と使い方](mac-app/README.md)。iOS同期は未実装。

## 2026-10-19 文書整理・固定列幅の追加

現行状態と過去証跡を分離し、制作・アプリ改修・設計思想の入口を整理。通常表の役割別固定列幅は任意項目の追加で、既存v1/v2・省略時の等幅を保持する。移行は不要。明示利用する場合だけ新しい資料版でwidthProfileを指定する。[配置仕様](docs/presentation-layout-v2.md)。

## グラフィック版の共通描画

構成・手順・原因分岐・同軸比較・大きい図版・図版比較の6種をschema1.3で登録。既存画像と生成画像のPNG/JPEGを台帳・ハッシュ付きで埋込み、PNG/PDF/編集可能PPTXを生成する。画像検索/生成は制作者が行い、描画器は入力済み素材を安全に配置する。[仕様とCLI](docs/graphic-renderer.md)、[入力例](examples/graphic-slides/fixture.cjs)。通常v1/v2の移行は不要。新機能を使う資料だけschema1.3・明示templateIdを指定し、新版へ保存する。画像付き部分更新は全体生成を使う。

## 共通アイコン

人物・もの・PC・サーバーの汎用線画とAWS/Azure公式素材を[共通アイコン集](assets/icons/README.md)へ保持。[検索できる一覧](assets/icons/index.html)から意味で選び、出典・版・利用条件とともに制作パッケージへコピーする。描画器の自動配置は追加していない。

# 検証の入口

実在するコマンドだけを使用する。ルートの`npm test`はNode test runner（単一図解実レンダリング、S3モック、パッケージ・プレゼン契約）。viewerの`npm test`はtsxのAPI試験。lint/format script、ルートtypecheck/build、DB migration/security専用コマンドはない。

## 実行環境
Node.js 22以上と各packageの依存が必要。実描画はChromiumと日本語OFLフォントが必要。Windowsでは次の既存設定を使える（存在する実行ファイルを指定）。

```powershell
$env:DIAGRAM_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe'
npm test
npm --prefix viewer test
npm --prefix viewer run typecheck
```

`DIAGRAM_FONT`は実レンダリング試験の日本語フォント。Windows既定は`C:/Windows/Fonts/NotoSansJP-VF.ttf`。TEMPのrenameが拒否される環境では、Git対象外のoutputs/下に専用TEMP/TMPを作ってプロセスに設定する。

## 変更と検証

検証レベルの正本は[rules/quality](rules/quality.md)。通常はLevel 1と、新資料・デザイン変更のLevel 2を適用する。Level 3は形式変換・安全性などの変更時や明示要求時に対象範囲へ絞る。既存の合格証跡を変更理由なく再実行しない。

標準入口は`npm run verify`（Full）。`npm run verify -- docs`は入口文書のローカルリンク先存在と`git diff --check`。`npm run verify -- fast`はそれにルートtest、viewer test/typecheckを追加。Fullはさらにviewer build。既存コマンドを逐次実行し、最初の失敗で停止する。依存追加・AWS通信・ブラウザーE2Eはない。実描画試験はローカルChromiumを起動する。

実装中は関連テストまたはFast、完了前は変更範囲に応じた関連テスト。全体に影響する実装変更はFull。文書のみならdocsでよい。リンク検査は入口・子AGENTS・decisions/sessionsの対象のみで、アンカーや全仕様文書の意味、秘密漏洩、コードとの鮮度は自動判定しない。

|変更|必要な検証|
|---|---|
|文書・リンク|文書リンク検査、`git diff --check`、正本との照合|
|共通ルール・図解エンジン|ルート`npm test`（実レンダリング含む）、生成物の目視。4テンプレート・プロンプト・実例への影響確認|
|保存|ルート`npm test`（衝突・失敗・再実行・安全設定と描画）。実AWS操作は別承認|
|プレゼン契約|`node --test tests/presentation.test.cjs`とルート回帰。描画品質はこのテストの対象外|
|プレゼン描画|tests/presentation-engine.test.cjs（全6種・ハッシュ・版衝突・表分割）とルート回帰。参照照合・失敗・境界ケースと目視証跡も確認してから認定|
|viewer API/認証/読取|viewer test + typecheck。構成変更ならbuild|
|viewer UI・起動・全体構成|viewer test + typecheck + build、起動後browser-check。新しい画面を目視|

ブラウザーE2Eはviewer起動後にviewer内で`node scripts/browser-check.cjs`。設定・既存mock成果物が必要で、S3モードは実通信する。標準のローカル検証から分離する。過去証跡は[Phase 4](docs/phase4-validation.md)。

契約検査、モック、実描画、内容確認、目視、実AWS接続を区別して記録する。失敗や未実施を合格として扱わない。

Phase 7の変換は`npm run test:exports`で実行する。v1/v2を別々にPDF/PPTXへ変換し、構造・manifest・上書き拒否・SVG不正ハッシュ時の保持を検査。Codex依存・Chromeが必要。root testの描画回帰は画像出力を指定して維持する。Linux8枚の実PowerPoint・Poppler比較は[出力手順](docs/presentation-export.md)に従う別検証。

Phase 7.6保存変更：`node --test tests/upload.test.cjs tests/presentation-upload.test.cjs`（13件、サイズ境界・SVG削除後を含む）と`node --test tests/engine.test.cjs`（既存3グループ）。実AWS確認は`node scripts/validate-presentation-s3.cjs --input <版> --config <設定>`の読取専用経路。認証なし・モック合格を実接続成功としない。

## Phase 11A検証

`npm --prefix viewer test` はローカルmock fixtureを準備し旧／新APIと拒否条件を検証する。fixtureのPDF/PPTXは実成果物があればそれを使い、なければAPI契約用の短いダミーであり表示品質を証明しない。`npm --prefix viewer run typecheck`、`npm --prefix viewer run build` を実施する。

ローカル起動後 `DIAGRAM_BROWSER="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" VIEWER_STORAGE=s3 node viewer/scripts/browser-check.cjs`。認証済みAWS profileと実RAG成果物のmock:initコピーが必要。PNG/PDF/PPTX取得SHA256、ページ8、PDF表示、検索、ズーム、ログアウト、390px幅を検証しoutputs/phase11a-validationへ記録する。PNG/PDFの画像を目視し、自動操作だけで目視済みとしない。実S3チェックは読み取りのみ。

Phase 11B-2：viewer testにoidc.test.tsを含む。認証済み一覧はfixture注入、実Cognito接続ではない。`node viewer/scripts/package-lambda.cjs`はローカルbundleのみ。実S3の署名GET検証はviewer内で既存.env.localと短期認証を使い`VIEWER_STORAGE=s3 node --env-file=.env.local --import tsx scripts/check-signed-download.ts`（読取のみ）。公開／iPhone実S3の証跡と区別する。

Phase 12：`node --test tests/workflow.test.cjs`で生成失敗からの試行隔離、完成後再利用、資料変更/破損拒否、機密送信拒否、HTTPS/API認証・ページング・成果物ハッシュ確認を検証。既存保存テストが条件付き書込・途中失敗・再実行を担う。実AWS/API/端末は別証跡。

Phase 10A：`node --test tests/update-plan.test.cjs`でLinux8枚の局所追加と維持、変更/削除、要確認、旧原資料照合、CLI上書き拒否を検証。ルートnpm testに含む。描画・AWS検証ではない。

独立一枚図：`node --test tests/illustration.test.cjs`。API新manifestとPNG/PDF参照はviewer test、iOS分類は別repoのCloudLibraryTests。実画像生成・AWS・実機は個別証跡。

Phase 10B：`node --test tests/partial-update.test.cjs`（対象限定、再利用/分割/順序、保留・不変版・破損/失敗）をルートtestに追加。`node --test tests/export/partial-composition.test.cjs`（実pypdf/native XML/notes/master参照/入力保持）をtest:exportsに追加。DIAGRAM_PYTHONは既存Codex同梱Python。Linux実E2Eと簡易目視は[記録](docs/phase10b-partial-update.md)参照。

実S3の一枚図読取：viewer内で短期認証・既存.env.localを使用し `VIEWER_STORAGE=s3 node --env-file=.env.local --import tsx scripts/check-illustration.ts <ID>`。署名URL/認証情報をログへ出さずPNG/PDFのサイズ・SHA256を確認。公開認証/実機の証跡とは分ける。

ゴミ箱：viewer/tests/trash.test.tsで移動/復元・取得拒否・認証・未知入力・破損・S3限定キー/SSE・無効書込/障害を検証。mock状態ファイルを変更するためviewerテストはtest-concurrency=1。別repoのCloudLibraryTestsで端末保存維持・失敗時一覧保持・復元を検証。本番は別承認。[仕様](docs/library-trash.md)。

資料限定サイズ承認：tests/upload-size-approval.test.cjsで承認済み44オブジェクト、別保存先・別版・改ざん・追加対象・重複・低水準writeのAWS通信前拒否を確認する。通常保存モック・描画回帰も維持する。

大容量閲覧：viewer/tests/large-presentation.test.ts。読取実証はviewer内で `VIEWER_STORAGE=s3 node --env-file=.env.local --import tsx scripts/check-large-presentation.ts`。ローカル共通APIを経由する実S3検証であり、本番認証/実機の成功とは区別する。

Mac本棚の変更は`mac-app/README.md`のSwiftテストと`mac-app/scripts/build-app.sh`。実outputs読込と、ネイティブ画面で一覧/検索/フォルダ/プレビュー/再起動を確認する。生成・AWS・Web viewerから独立した変更ではNode/実AWS回帰を一律に実行しない。

Mac監視の回帰にはBookshelfWatchingTestsの実FSEvents接続が必要。サンドボックスでFSEventStreamStartが拒否される場合は、通常のMac実行環境で再検証する。作成/新版/削除の画面反映も更新ボタン操作なしで確認する。

整理共通層の変更：packages/LibraryOrganizationのswift test（旧Mac設定/iOS分類・まとめの変換と再保存・旧任意項目・未知版/破損拒否・一括移動・タグ正規化・まとめ構造）、Mac既存Swiftテスト、隣接zukanのiOS Simulator XCTestを実行する。iOSはKeychainテストのため通常のSimulator署名が必要。ローカルパッケージ参照が解決できる並列配置はdocs/library-organization.md参照。

Macタグ/まとめ：BookshelfCoreTests/OrganizationTestsで旧library.json・追加フィールド復元・原本タグ/端末上書き・まとめの順序/最新版/未取得保持・入力制限・分類保持を検証。編集シート/タグ検索/まとめ並べ替え/前後プレビュー/再起動/解除は実画面で確認する。

整理同期：共有パッケージのswift testに加え、scripts/organization-sync-http-check.pyへビルド済みOrganizationSyncMockを渡す。127.0.0.1と合成一時データだけを利用し、書込後の応答喪失を注入する。環境がloopback待受を拒否する場合は通常のMac実行環境で検証する。実AWS/公開認証検証とは区別する。[手順](docs/organization-sync-local.md)。

同期画面：共有SyncLabTests、Mac SyncAdapterTests、iOS取込テスト、HTTPハーネスのsmoke-ui。チェックポイント復元/破損保持/原設定不変/解除の後片付けを確認する。Macの画面確認とiOSのビルド/XCTestの検証境界はdocs/organization-sync-ui.md参照。

通常本棚のテスト同期は共通BoundSyncTests、Mac SyncAdapterTests、iOS CloudLibraryTestsで通常保存/受信/復元/反映中断を確認する。専用ツールの両画面操作と実HTTPの範囲は[同期テスト仕様](docs/organization-sync-bound.md#確認した範囲)。

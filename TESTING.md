# 検証の入口

iOS / iPadOSのビルド・起動・テストは[このMacの共通端末方針](AGENTS.md#このmacのios--ipados開発端末)に従う。過去の検証記録にある別端末の指定を現在の実行先として流用しない。

素材UI変更：共有Swift packageの `BookshelfMaterialTests` は実SwiftUI描画の画素変動を検査する。`BOOKSHELF_MATERIAL_EVIDENCE=<出力先>` を指定して `swift test --disable-sandbox --package-path packages/LibraryOrganization --filter BookshelfMaterialTests` を実行すると素材面PNGを保存する。画像の存在・decode成功だけでは描画成功としない。Mac/両Simulatorでの素材目視と署名アプリ配布も確認する。[回帰検査と証跡](docs/bookshelf-material-themes.md#素材が描画されない問題の修正)。

共通ゴミ箱（本番有効。自動試験はモック）はviewerの`lifecycle.test.ts`（revision/CAS、計画変更、途中削除と再送、認可、S3 prefix/暗号化/バージョニング）と共有Swiftの`LibraryLifecycleTests`（永続削除通知/古い応答/復元）を検証する。`node --import tsx --test --test-concurrency=1 tests/lifecycle.test.ts tests/trash.test.ts`はviewer内で実行。CLIのIPC待受を使わない。iOSのコピー削除XCTestと実画面/通常ビルドの制約は[作業中の仕様](docs/shared-library-trash.md#検証記録)を参照。

実在するコマンドだけを使用する。ルートの`npm test`はNode test runner（単一図解実レンダリング、S3モック、パッケージ・プレゼン契約）。viewerの`npm test`はtsxのAPI試験。lint/format script、ルートtypecheck/build、DB migration/security専用コマンドはない。

## 実行環境
Node.js 22以上と各packageの依存が必要。実描画はChromiumと日本語OFLフォントが必要。Windowsでは次の既存設定を使える（存在する実行ファイルを指定）。

```powershell
$env:DIAGRAM_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe'
npm test
npm --prefix viewer test
npm --prefix viewer run typecheck
```

MacでもNode.js 22以上を選び、`DIAGRAM_FONT`と`DIAGRAM_BROWSER`を明示する。Windows既定のフォントパスはMacには存在しない。描画試験を個別に追跡したい場合は、同じ環境変数で `node --test --test-concurrency=1 tests/*.test.cjs` としてファイル単位で逐次実行できる。遅い試験をログの無更新だけで失敗と判定せず、試験単位の終了結果を確認する。

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

管理バックアップ/復元はSyncRecoveryTests、Mac SyncAdapterTests、iOS CloudLibraryTestsで、資料本体を含まないこと・管理JSONのバイト一致・欠損ファイル・中断/失敗/再起動時の同期停止を検証する。[実画面の範囲](docs/organization-sync-recovery.md#検証)。

同期回数制限はSyncRateLimitTests/SyncThrottleTests、実HTTPのsmoke-limit（2端末/再起動/追加/要求数）とsmoke-limit-concurrent（10並行のうち5許可）で検証する。[条件とコマンド](docs/organization-sync-quota.md)。

通信削減はSyncEfficiencyTestsとHTTP smoke-efficiency（503/Retry-After/応答喪失/再起動/待機中追加と編集/別端末削除/応答バイト/要求数）。[手順](docs/organization-sync-efficiency.md#検証と再現)。

TypeScript同期APIは`npm --prefix viewer run test:organization`。Swiftビルド→5共通fixture（75ステップ）→認可/CAS/並行/欠損/容量/S3コマンド差替→使い捨てloopbackのSwift実HTTPを実行する。Node.js 22以上。AWS実接続はしない。[境界](docs/organization-sync-api-local.md#検証と再現)。

認証付きHTTPS/分割はHTTPSConnectionTestsとviewerのtest:organization:https。通常TLS拒否→テストleaf限定信頼、JWT/401更新/125フォルダ/2バッチ目ACK喪失/待機/再起動/双方向を実TLSで検証。iOSはURLProtocolで既存認証→bootstrap/バイト分割も実行。[範囲](docs/organization-sync-https.md)。

同期の接続準備：SyncSetupTestsはBundleの明示true/欠落/固定HTTPS設定を検査。organization-runtime.test.tsは無効時の未接続・設定不備停止・bootstrapでS3通信ゼロを確認。準備CLIは初期JSON/hash/固定UUID・元構成維持・既存出力上書き拒否を確認。[実画面の未検証事項](docs/organization-sync-readiness.md#検証と残り)。

整理同期の実AWS検証は本人承認後の限定実行。viewer/scripts/check-organization-aws.tsは固定origin/UUID・空snapshot前提・本人の一時tokenを必要とし、合成フォルダ1件だけを操作してtombstone/receiptsを保持する。通常の自動テストから呼ばない。現在は初回空状態前提を満たさないため、再実行前に別の検証計画が必要。[実検証結果](docs/organization-sync-deployment.md)。

通常クライアント接続：HTTPSConnectionTestsで並行呼出しの要求開始間隔1秒以上、iOS CloudLibraryTestsで同じ管理領域の2画面が単一キューを共有し準備だけでは既存JSONが不変であることを検査。[実機適用・保持確認の範囲](docs/organization-sync-live-clients.md)。

共通ゴミ箱の配備準備（2026-10-19）：`node --test tests/document-lock.test.cjs tests/upload.test.cjs tests/presentation-upload.test.cjs` 16件、viewer 31合格/1スキップ・型検査、日本語SVG/PNG実描画3件、Mac `swift test` 27件/1スキップ/失敗0。Node24、Mac/Chromeは承認付き実行。ログは `outputs/shared-trash-readiness/`。モック検証は実AWSゴミ箱確認とは区別する。[承認案](docs/shared-trash-aws-proposal.md)。

共通ゴミ箱の本番検証（2026-10-19本人承認後）：合成1件の認証付きHTTPS15要求、S3残存0/既存catalog53件保持/削除ID再公開拒否に合格。両アプリ有効化後、iOS71 XCTest失敗0・共通Swift43合格。Mac本番削除通知受信とシート表示を確認。[証跡](docs/shared-trash-deployment.md)。

S3専用本棚：Mac `CloudBookshelfTests` はURLProtocolで認証API/署名URL/実バイト/破損キャッシュ/遅延削除通知をモック。Mac32（1スキップ）、iOS72、共通44合格。実サービス/実機確認は別。[記録](docs/s3-only-bookshelf.md)。

S3保存容量：viewer/tests/storage-capacity.test.tsで全版/削除マーカー/ページング/部分失敗/認証/フラグ/キャッシュ/キー非公開を検査。iOSは隣接zukanのCloudLibraryTestsの専用endpoint・scope・履歴分離テスト。AWS CLIの全版実読取と本番新API検証は区別する。[仕様](docs/s3-storage-capacity.md)。

今月のAWS請求：viewer/tests/monthly-billing.test.tsで配賦フィルター/対象account/小数/credit/ページ上限/20並行Lambda/失敗後予約/再起動/月替わり/本人認可/署名HTTPと固定S3 CASをモック検証。iOS CloudLibraryTests.testMonthlyBillingEndpointAllocationAndExactTotalsで取得・Decimal・通信/認証分類・不一致/配賦待ち/欠落拒否。[仕様](docs/monthly-billing.md)。実CE照会とモックを区別する。

フォルダ統合：共通`LibraryFolderTests`が旧まとめの複数所属/順番保持、通常移動/解除、種類別の階層分割・決定的ID・再実行を検査。iOS `testUnifiedFoldersPreserveLegacyMembershipAndSeparateKinds`は統合経路の保存/再起動を確認。Simulatorのpackage module不一致時は`ONLY_ACTIVE_ARCH=YES ARCHS=arm64`で対象を揃える。[証跡](sessions/2026-10-19-folder-unification.md)。

Mac閲覧キャッシュ：`CloudBookshelfTests.testCoverGridDoesNotEvictPreviouslyReadPDFButBudgetsStillApply`で表紙48版と既読PDFの共存、本文版枠、総容量枠を確認する。実機の速度比較とは分離。[調査記録](sessions/2026-10-19-mac-preview-cache-quota.md)。

固定列幅表：`tests/presentation-width-profile.test.cjs`で列役割/列数拒否・旧等幅保持・実測/分割/全セル保持を確認。変換時は`tests/export/presentation-exports.test.cjs`の固定列幅ケースでPDF文字とPPTXネイティブ列幅を確認。目視・実PowerPointは別証跡。

共通グラフィック：`node --test tests/graphic-presentation.test.cjs`で6種実描画、素材ハッシュ/出典/生成表示/危険パス/symlink/型/容量/境界/重なり/超過拒否を確認。`tests/export/graphic-exports.test.cjs`はPNG/JPEG画像とネイティブ要素、PDF文字保持、PPTX画像バイト/生成記録を照合。最終形式の再描画と目視は[記録](sessions/2026-10-19-graphic-renderer.md)。

取得互換性：`node --test tests/reader-contract.test.cjs` は共有読取ソース/SHA256とSwift承認台帳の一致、本番仕様不一致時のAWS通信0を検査。viewerの`catalog-isolation.test.ts`は不正な1版を除外して健全な一覧を維持する。Lambda包装もソースfingerprintが古ければ停止する。実端末の限定本番検証は隣接zukanの `testLiveProductionReadAndOfflineReopen`。通常試験ではスキップし、本人の実機/既存ログイン・明示した読取予算と `ZUKAN_LIVE_READ_VERIFY=1` のときだけ実行する。資料/整理状態は更新せず一時領域に取得し、PDFKit描画とOfflineAPIでの再表示を検査。[実施証跡](docs/library-fetch-repair.md)。

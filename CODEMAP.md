# コード探索の入口

概念から以下の機能を選び、パスを絞って検索する。全ファイルの読込・一覧化は不要。

|機能|主要パスと入口|検索語|関連テスト|
|---|---|---|---|
|単一図解生成|src/cli.cjs、src/engine.cjs `generate`、src/model.cjs `validateInput`|roadmap、OVERFLOW、generate、validateInput|tests/engine.test.cjs|
|共通ルール・フォント・ブラウザー|src/rules.cjs `loadRules`、src/font.cjs `loadFont`、src/browser.cjs `openBrowser`|tokens、ensureGlyphs、DIAGRAM_BROWSER、DIAGRAM_FONT|tests/engine.test.cjs|
|ローカル保存・契約|src/storage.cjs `saveArtifacts`、schemas/|LocalStorage、schemaVersion、metadata-package|tests/engine.test.cjs、tests/package-schema.test.cjs|
|S3保存|src/upload-cli.cjs、src/upload/workflow.cjs `uploadDirectory`、metadata.cjs、s3-storage.cjs|approveContent、IfNoneMatch、catalog、sha256|tests/upload.test.cjs|
|プレゼン|src/presentation/cli.cjs、engine.cjs `generatePresentation` / `renderSlide`、validate.cjs `validatePresentation`|templateId、OVERFLOW、sourceReferences、rendererImplemented|tests/presentation.test.cjs（契約）、tests/presentation-engine.test.cjs（描画・分割）|
|閲覧UI|viewer/src/app/page.tsx、components/DiagramCanvas.tsx|zoom、fullscreen、DiagramCanvas|viewer/scripts/browser-check.cjs|
|共通ゴミ箱（本番無効）|viewer/src/lib/lifecycle.ts、lifecycle-runtime.ts、packages/LibraryOrganization/Sources/LibraryOrganization/LibraryLifecycle.swift|LibraryLifecycle、deletion-plan、LibraryLifecycleIndex|viewer/tests/lifecycle.test.ts、LibraryLifecycleTests.swift|
|認証・API|viewer/src/lib/api.ts `handle`、auth.ts、config.ts、app/のroute.ts|login、session、bearer、ORIGIN_REJECTED、diagrams|viewer/tests/api.test.ts|
|S3読取・mock|viewer/src/lib/store.ts `catalog` / `find` / `access`|VIEWER_AWS_SOURCE_PROFILE、GetObject、mockBytes|viewer/tests/api.test.ts、browser-check.cjs|
|AWS読取検証・運用案|scripts/validate-s3.cjs、infra/、docs/|probe-overwrite、exercise-upload、Budgets|tests/upload.test.cjs（AWS実接続ではない）|

## 検索手順
概念だけ分かる場合は利用可能なSemantic/Repository Search、または上表から始める。symbolが分かったらexact/symbol検索、呼び出し元はReferences Searchか`rg`で探す。Semantic Searchの導入・索引サービスはこのリポジトリにない。

```powershell
rg -n 'uploadDirectory|createMetadata' src tests
rg -n 'handle|ORIGIN_REJECTED' viewer/src viewer/tests
rg -n 'process\.env|TODO|FIXME' src scripts viewer/src viewer/scripts
rg --files src tests viewer/src viewer/tests
git grep -n 'validateInput' -- src tests
```

`git grep`は未追跡ファイルを含まない。未コミットの新規実装も探す場合は`rg`を使う。広域検索では`-g '!**/node_modules/**' -g '!**/.next/**' -g '!outputs/**'`を追加し、秘密設定を読込・出力しない。

入口 → 主要処理 → 保存/データ → 外部依存 → テストを追い、definition・references・tests・configuration・data dependenciesを確認する。短い汎用symbol（`handle`、`find`）や圧縮されたプレゼンコードは探索しづらいため、パスとエラー文字列を併用する。検索性だけを理由にrenameしない。

プレゼンv2の描画：`src/presentation/dense.cjs`、数値正本：`config/presentation-profile.json`。既存engine.cjsが登録IDに応じて選択する。

PDF/PPTX：src/presentation/export.cjs、ネイティブ表罫線：normalize-pptx.py、既存パッケージ変換：export-cli.cjs、新規v2選択：defaults.cjs。実形式比較：scripts/validate-presentation-formats.py、PowerPoint確認：scripts/validate-powerpoint.ps1。

プレゼンS3：src/upload/presentation.cjs（許可リスト・計画・保存）、workflow.cjsでschemaVersion分岐。読取確認：scripts/validate-presentation-s3.cjs。回帰：tests/presentation-upload.test.cjs。旧catalog metadataとは別マーカーを使用。

## Phase 11A追加入口

- viewer/src/lib/manifest.ts：最小presentation manifestの安全な正規化。
- viewer/src/lib/store.ts、api.ts：旧／新catalog、ページ指定、PDF/PPTX取得。
- viewer/scripts/mock-init.cjs、viewer/tests/presentation.test.ts：ポータブルな旧／新fixtureと契約・改ざん拒否検証。
- viewer/scripts/browser-check.cjs：ローカルUIから成果物取得／SHA256と画面を検証。
- [検証結果](docs/phase11a-validation.md)、[公開設計](docs/phase11a-deployment.md)。

Phase 11B-2：viewer/src/lib/oidc.ts（JWT／owner）、viewer/src/lambda.ts（HTTP API入口）、viewer/scripts/package-lambda.cjs（ローカルbundle）、viewer/tests/oidc.test.ts（公開認証回帰）、infra/phase11b2-api.proposed.json（未適用）。

Phase 12：src/workflow/cli.cjs → run.cjs（入力束縛、試行隔離、プレビュー、資料/保存先承認、独立upload、verifyApi）。tests/workflow.test.cjs。運用は[一括手順](docs/phase12-workflow.md)。

Phase 10A：src/update/cli.cjs → plan.cjs（diffSource/createUpdatePlan/toMarkdown）。tests/update-plan.test.cjs。原資料差分・旧行参照・更新計画専用。[仕様](docs/phase10a-update-plan.md)。

独立一枚図：src/illustration/cli.cjs → create.cjs、src/upload/illustration.cjs、viewer/src/lib/manifest.ts。[制作入口](prompts/illustration.md)。

Phase 10B：src/update/regenerate-cli.cjs → regenerate.cjs（prepare/regenerate、既存generatePresentation呼出）→ compose.py（PDFページとPPTX OPC依存グラフの再構成）。schemas/presentation-metadata.schema.jsonの任意update記録。tests/partial-update.test.cjs、tests/export/partial-composition.test.cjs。[仕様](docs/phase10b-partial-update.md)。

ゴミ箱：viewer/src/lib/store.tsのlibraryState/setLibraryState/requireActive、api.tsのstateフィルターとtrash/restore。viewer/tests/trash.test.ts。[仕様・本番反映範囲](docs/library-trash.md)。

資料限定サイズ承認：src/upload/limits.cjs と config/upload-size-approvals.json。計画と低水準writeで保存先/キー/サイズ/SHA256を照合。tests/upload-size-approval.test.cjs。閲覧APIの上限は別契約。

Mac本棚：mac-app/Sources/BookshelfCore/Library.swift（資料/版、フォルダ、設定、metadataスキャン）→ Sources/Bookshelf/Store.swift（Macアクセス/更新/保存）→ BookshelfApp.swift（一覧・分類・検索・プレビュー）。mac-app/Tests/BookshelfCoreTests、scripts/build-app.sh。[手順](mac-app/README.md)。

Mac自動更新：mac-app/Sources/BookshelfWatching/FolderWatcher.swift（FSEvents・デバウンス・解除・代替タイマー）→ Bookshelf/Store.swift（スキャン中の再実行・再アクティブ化）。mac-app/Tests/BookshelfWatchingTestsは実OSイベントを検証。

Mac複数選択：mac-app/Sources/BookshelfCore/BookSelection.swift（ID集合/範囲/選択対象/移動/ドラッグ解析）とTests/BookshelfCoreTests/BookSelectionTests.swift。Mac画面の選択ジェスチャー・下部メニューはBookshelfApp.swift。

Macドラッグ：Sources/Bookshelf/CardDragSurface.swift（AppKitのクリック/移動判定、選択集合のドラッグ開始）→ FolderDropSurface.swift（アプリ内由来検査、強調、ドロップ受理）→ LibrarySettings.moveBooks。Tests/BookshelfDragTestsは実Pasteboardを使い受け取り・一括保存・拒否・キャンセルを確認。

Macフォルダ画像：Sources/Bookshelf/FolderIcons.swift（ImageIO縮小/端末コピー/設定更新/解除）、BookshelfCore/Library.swiftのShelfFolder.iconFile（任意）。Tests/BookshelfDragTests/FolderIconTests.swiftで独立コピー/寸法/旧設定互換を確認。

Macフォルダ順：BookshelfCore/FolderOrder.swift（初期順/手動順/並べ替え）、LibrarySettings.folderOrder（任意UUID列）。FolderDropSurface.swiftは同一ウインドウのマウス押下/移動/解放でフォルダ順を変更し、弱参照の行集合から挿入先を判定。資料ドラッグのOS受取は別処理。FolderOrderTests＋DragTestsで検証。

Mac資料の一括ドラッグ：CardDragSurface.swiftのmouseDown/mouseDragged/mouseUpが選択IDを開始時固定し、FolderDropView.documentTargetで解放先を確定。highlightDocumentsで強調、既存receive→moveBooksで一括保存。DragTestsで複数ID/キャンセル/対象外を検証。

整理共通層：packages/LibraryOrganization（OrganizationFolder、LibraryClassification、ReadingCollection、OrganizationState）。Mac BookshelfCoreは互換アダプター、iOS zukanは型alias＋閲覧検証extension。旧JSON移行/ラウンドトリップはOrganizationTests。[仕様](docs/library-organization.md)。

Macタグ/まとめ：BookshelfCore/Organization.swift（BookReference/分類/まとめ保存/最新版解決）、LibrarySettingsの互換decode、Bookshelf/OrganizationEditors.swift（編集シート）、ShelfView（絞込/まとめカード/読む順プレビュー）。OrganizationTestsで旧設定互換/保存復元/制限/元分類保持。

整理同期のローカル版：packages/LibraryOrganization/Sources/LibraryOrganization/{Sync,SyncImport,LoopbackSyncTransport}.swift、Sources/OrganizationSyncMock/main.swift。SyncTests.swift（オフライン/再送/競合/削除/統合）、scripts/organization-sync-http-check.py（実loopback HTTP・応答喪失）。既存アプリStore未接続。[仕様](docs/organization-sync-local.md)。

同期画面：packages/LibraryOrganization/Sources/LibraryOrganizationUI/{SyncLabSession,SyncLabView}.swift。Mac ShelfStore.makeSyncLab/iOS CloudLibraryStore.makeSyncLabは元設定の読取専用アダプター。SyncLabTests/SyncAdapterTests/iOS CloudLibraryTestsとmock CLI smoke-uiで検証。[境界](docs/organization-sync-ui.md)。

通常本棚のテスト同期：SyncLabSession.TestLibrarySyncBindingとcaptureLibraryChanges、Mac ShelfStore.change/makeSyncLab、iOS CloudLibraryStoreの通常保存とCloudFileStore.applyTestLibrarySync/recoverSyncApply。BoundSyncTests、Mac SyncAdapterTests、iOS CloudLibraryTests。[境界](docs/organization-sync-bound.md)。

同期開始/復元：LibraryOrganizationUI/SyncRecovery.swift（設定項目件数/復元点）、SyncLabSession.makeBackup/restoreBackup（永続停止）、Mac Storeの管理JSONバイト復元、iOS CloudFiles.managementBackup/restoreManagementBackup/recoverManagementRestore。SyncRecoveryTests/SyncAdapterTests/CloudLibraryTests。[仕様](docs/organization-sync-recovery.md)。

実端末同期の未適用設計：docs/organization-sync-aws-plan.md、単価/SKUはorganization-sync-aws-rates.json、結果はorganization-sync-aws-estimate.json。scripts/estimate-organization-sync.pyはネットワーク/認証なしのDecimal再計算だけを行う。

同期回数：LibraryOrganization/{SyncRateLimit,LimitedLoopbackTransport}.swift、UI/SyncThrottleStateとSyncLabSession.limitedTransport、SyncLabViewの確認UI。Mock limited/smoke-limit/smoke-limit-concurrentとHTTP--limited-serve、SyncRateLimitTests/SyncThrottleTests。[仕様](docs/organization-sync-quota.md)。

整理同期の通信削減：SyncRetry.swift、LimitedLoopbackTransport、SyncLabSessionのretryAt/knownSnapshot、模擬serverのunchangedRevision。正本は[無変更応答と失敗待機](docs/organization-sync-efficiency.md)。

AWS向け同期APIのローカル入口：viewer/src/lib/organization/{model,service,s3-store}.ts、api.tsの注入ルート、lambda.tsのcreateHandler。viewer/tests/fixtures/organizationとOrganizationSyncMock conformanceでSwift照合。再現はviewerのtest:organization。[仕様](docs/organization-sync-api-local.md)。

HTTPS同期：LibraryOrganization/AuthenticatedSyncTransport.swift、UI/OrganizationOIDC.swiftとSyncLabSession。Mac Store/iOS CloudOIDC・CloudLibraryStoreの明示注入。HTTPSConnectionTests、viewer/scripts/check-organization-https.ts。[手順](docs/organization-sync-https.md)。

本番接続準備：UI/SyncSetupView.swift、Mac Store.connectOrganizationSync、iOSのonSyncLogin、viewer/lib/organization/runtime.ts、infra/organization-sync.proposed.json、viewer/scripts/prepare-organization-deployment.ts。[未適用手順](docs/organization-sync-readiness.md)。

共通ゴミ箱の資料単位CAS排他は `src/upload/document-lock.cjs`、保存側の有効化はconfigの `lifecycleProtection`。配備差分生成は `scripts/prepare-shared-trash-aws.cjs`、料金再計算は `scripts/estimate-shared-trash.py`。[承認案](docs/shared-trash-aws-proposal.md)。

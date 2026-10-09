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

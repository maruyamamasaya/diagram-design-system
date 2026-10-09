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

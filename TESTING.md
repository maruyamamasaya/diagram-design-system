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

標準入口は`npm run verify`（Full）。`npm run verify -- docs`は入口文書のローカルリンク先存在と`git diff --check`。`npm run verify -- fast`はそれにルートtest、viewer test/typecheckを追加。Fullはさらにviewer build。既存コマンドを逐次実行し、最初の失敗で停止する。依存追加・AWS通信・ブラウザーE2Eはない。実描画試験はローカルChromiumを起動する。

実装中は関連テストまたはFast、完了前は変更範囲に応じたFull。文書のみならdocsでよい。リンク検査は入口・子AGENTS・decisions/sessionsの対象のみで、アンカーや全仕様文書の意味、秘密漏洩、コードとの鮮度は自動判定しない。

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

# プレゼン形式変換

SVGが配置・文字折返し・ページ分割の正本。Chromium印刷でベクターPDF、SVGのtext/rect/pathを共通sceneへ読み、Artifact ToolでネイティブPPTXを作る。表はネイティブ表、矢印は個別編集可能な線分。接続先移動への自動追従は未対応。表セルのOOXMLは順序を保って罫線を設定し、v2へ既定グリッドを加えない。v1は既存グリッドを保持する。新規templateId省略はv2へ補完するが、保存済みの明示v1は移行しない。

## 環境と依存
既存Node/Chrome、Codex同梱@oai/artifact-tool 2.8.89・Python・Presentationsスキルのfinalizerを使用。必要に応じDIAGRAM_ARTIFACT_TOOL（mjs）、DIAGRAM_PYTHON、DIAGRAM_PRESENTATIONS_SKILL、RUNTIME_NODE_MODULESを絶対パスで指定する。既定は今回確認したCodex primary runtimeの位置。別環境では同じ配置を仮定しない。依存の不足で出力に失敗したらローカルSVG/PNGを保持し、画像だけの--formats svg,pngを利用できる。

新規npm依存なし。Artifact Toolのpackage.jsonはprivateで公開ライセンス欄がない。同梱ランタイムを使用し再配布しない。単独配布可能なOSSとは扱わない。Python側のOOXML処理は標準ライブラリ。フォントは既存OFLメタデータ検査を継承。PDFは埋込み、PPTXは非埋込み。編集端末にNoto Sans JPとNoto Sans Monoが必要。

## 実行
READMEのgenerate:presentationは標準で全4形式。--formats svg,pngで画像だけを選択。--formats svg,png,pdfでPDFまで選択可能。既存パッケージへの追加はexport:presentation -- --input <package>。既存変換ファイルの上書きは拒否し、失敗時の再生成は新しい資料版・出力先を使う。export-failure.jsonへ失敗理由を残し、原資料・画像を削除しない。並列変換は.export.lockで拒否。プロセス強制終了時の残留lockは、処理終了を確認してから手動対応する。

PPTX候補をprivate export-validationで作り、スキルの整合性・指定寸法・書体・ネイティブ表・再インポート検査を通したファイルだけ標準名へ同一バイトコピー。PDF/PPTXのSHA256・サイズはmetadata.deckArtifactsへ追加。旧メタデータも受理する追加フィールド。生成済みと視覚確認済みを別に記録する。

## Linux8枚の再検証
PowerPoint/PopplerとPythonのpypdf・pdfplumber・Pillowが必要。以下はproject rootから実行する。

```powershell
$package="outputs/66666666-6666-4666-8666-666666666666/versions/000008"
New-Item -ItemType Directory -Force "$package/format-validation"
pdftoppm -scale-to-x 1600 -scale-to-y 900 -png "$package/document.pdf" "$package/format-validation/pdf"
./scripts/validate-powerpoint.ps1 -InputFile "$package/presentation.pptx" -OutputDirectory "$package/format-validation/powerpoint"
& "$env:USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe" scripts/validate-presentation-formats.py $package
```

PowerPoint検証スクリプトはLinux8枚のページ3表・ページ5図を使うサンプル専用。本番原本は読取専用で開き、編集テストは別コピーに行う。Monoを検証中だけWindowsへ登録し、終了後解除する。恒久的なフォントインストールはしない。成果物を見る端末のフォント要件はこれでは解消しない。PDF/PPTXを1600×900へ描画し、SVG/PNGとテキスト一致・ページ寸法・前景一致を比較。画像指標だけで合否にせず、全ページ目視を行う。

ChromiumのPDFでは日本語を自己完結したType3ベクターグリフとして保持する場合がある。FontFile埋込みと区別して検査する。共有グリフが互換漢字に割り当たるToUnicodeは、原文に互換字がなく正字がある場合だけ補正する。描画命令は変えず、コマンドや意図的な互換文字を正規化しない。

ToUnicode補正は埋込みフォントのglyph IDを照合し、原文にない別文字から原文内の一意な同一グリフ文字へ戻す。互換漢字・中黒等の共有グリフが対象。曖昧な場合と原文に意図的な別文字がある場合は変更しない。

PPTXの位置補正はNoto Sans JP/Monoで実PowerPointと照合したもの。PPTX変換はこの2書体に限定し、--fontで別の書体を選んだ場合はPPTXを拒否する。SVG/PNG/PDFでは既存の許可済みフォント経路を維持。書体追加は再キャリブレーションと視覚検証後に対応する。

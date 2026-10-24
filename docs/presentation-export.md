# プレゼン形式変換

SVGが配置・文字折返し・ページ分割の正本。Chromium印刷でベクターPDF、SVGのtext/rect/pathと登録グラフィックの埋込みimageを共通sceneへ読み、Artifact ToolでネイティブPPTXを作る。表はネイティブ表、矢印は個別編集可能な線分。接続先移動への自動追従は未対応。表セルのOOXMLは順序を保って罫線を設定し、v2へ既定グリッドを加えない。v1は既存グリッドを保持する。新規templateId省略はv2へ補完するが、保存済みの明示v1は移行しない。

上記の正本は変換時の共通描画表現を指す。SVGは制作中のPNG描画・PDF/PPTX変換・検証に必要であり、削除後に同じパッケージをexport CLIへ直接渡して再変換はできない。完成済みPDF/PPTXの通常の閲覧・編集には外置きの内部SVGは不要。制作完了後は[整理手順](local-output-cleanup.md#制作完了時の標準運用)に従って不要分を削除し、再変換が必要なら保持した入力・描画コード・素材・フォントから別の作業先で再描画する。SVG自体の納品指定や必須入力の参照がある場合は保持する。

## 環境と依存
既存Node/Chrome、Codex同梱Artifact Tool・Python・Presentationsスキルのfinalizerを使用。初期Windows証跡は2.8.89、MacのMVP再検証は2.8.59。独立線分はgeometry=lineを使い、接続先なしのconnector APIに依存しない。必要に応じDIAGRAM_ARTIFACT_TOOL（mjs）、DIAGRAM_PYTHON、DIAGRAM_PRESENTATIONS_SKILL、RUNTIME_NODE_MODULESを絶対パスで指定する。既定は初期Windowsで確認したCodex primary runtimeの位置。別環境では同じ配置を仮定せず、load_workspace_dependenciesで実行ファイルとスキル位置を確認して上記変数へ渡す。通常の検証は[rules/quality](../rules/quality.md)、MVP証跡は[Phase 7](phase7-validation.md)を参照。依存の不足で出力に失敗したらローカルSVG/PNGを保持し、画像だけの--formats svg,pngを利用できる。

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

Phase 10BではSVG削除済みの旧版にも対応するため、維持対象のPDFページとPPTXネイティブパーツを再利用し、新生成ページと合成する。SVGからの既存一括変換は維持。[再構成の契約・制約](phase10b-partial-update.md)。

共通グラフィックのPNG/JPEGは埋込み画像として原バイトと縦横比を保持し、PPTXの画像要素へ変換する。文字・図形・線は独立編集要素、altと由来/利用条件/ハッシュ・生成記録は画像とノートへ保持。[素材契約](graphic-renderer.md)。画像そのものを編集可能な図形としては報告しない。

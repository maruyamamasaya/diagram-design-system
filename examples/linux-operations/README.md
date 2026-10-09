# Linux運用8ページ検証例

input.mdはPhase 6の再現検証用に補完した入力資料。presentation.jsonはAIが8節を整理した構成で、CLIの自動Markdown解析ではない。調査順序は検証用提案。実コマンド実行・実環境検証を意味しない。sourceVersionは改行を含む実バイト列SHA256、locatorは原資料の行範囲。

生成はREADMEのgenerate:presentationを使用。同じID/版は上書きされないので、修正はversionを増やすか別--outputへ出す。SVG/PNG/PDF/PPTXに対応。Linux入力とRoadmapの改行は.gitattributesでLFに固定し、実バイトの参照ハッシュを維持する。最終形式の検証範囲は[Phase 7](../../docs/phase7-validation.md)を参照。目視・内容レビューはdocs/phase6-validation.mdを参照。

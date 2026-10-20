# クラークとサザランドの一枚図

- Request：簡単な生涯と功績を一枚図へ。クラーク完成・S3保存後にサザランドを制作。
- Investigation：CURRENT、独立一枚図入口/仕様、共通6規則、PDF skillを読取。Clarke Foundation/IET、京都賞/MIT/CHM/ACM SIGGRAPH/NSFで年次と功績を照合。URLと入力対応は各source.md。
- Changes：Agent Creation ModeのSVG主体。1600×900で年表と3領域の功績。PNG 3200×1800、各1ページPDF。実装変更なし。
- Files Changed：outputs/6309c1e2-aed6-4a03-af12-9ab725a8758c/versions/000001、outputs/5bdfb637-26f7-4585-88f6-23b1b581b60e/versions/000001、制作原本はoutputs/clarke-workとoutputs/sutherland-work。
- Validation：Level 1/2。CLIのdecode/labels/glyph/textBounds合格。PNG目視とpdftoppmで両PDFを再描画・目視し、日本語・内容・余白を確認。クラークPDFのpdffontsは埋込みあり。サザランドの出生地表記と1968年の余白を修正し再確認。5回の見直し内容はsource.md。Node 16と未導入Playwrightブラウザでは失敗、Node 22と既存Chromeで成功。PDFは既存CLI寸法1200×675.12pt（標準960×540ptとの差、比率誤差約0.02%）を保持。PPTXは経路対象外。
- Result：クラークは利用者の送信指示に従い既存承認済み設定へupload complete。PNG/PDF・最小manifestのみ、条件付き保存とGET照合。AWS構成変更なし。サザランドも追加の本人指示後に同じ承認済みS3へupload complete。PNG/PDFと最小manifestを条件付き保存しGET照合完了。
- Remaining Issues：本棚の実機表示は未確認。両資料ともS3保存完了。

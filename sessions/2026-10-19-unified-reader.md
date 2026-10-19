# iPhone/iPad統合ビューアー

- Request：一覧から直接単ページ表示、スワイプでページ送り、ピンチで拡大、タップで操作表示/非表示。両Simulatorを先行し実機反映する。
- Investigation：既存DocumentViewerの通常/プレゼン二重操作を統合。PDFKitと画像UIScrollView・共通外部出力sessionを再利用。
- Changes：共通画面/上部操作/下部ページ送り/任意ページ一覧、初回PDF単ページ、拡大中パンの誤ページ送り防止。保存・形式切替と先行キャッシュ修正を保持。
- Files Changed：別repo zukanのDocumentViewer/ImageDocumentView/PDFDocumentView、ViewerStateTests、仕様/状態/作業記録。本repoはこの記録のみ。
- Validation：iPad M5/iPhone17eのiOS26.5 Simulatorで各71 XCTest失敗0。両画面でPDF/PNG単ページ、タップ、スワイプ、ページ一覧、形式切替、画像拡大中ページ維持を確認。iPadで保存/閉じるも確認。実機向けbuild/codesign合格。
- Result：実機インストール結果は別repo docs/unified-reader.mdへ記録。AWS/API変更なし。
- Remaining Issues：二本指ピンチ自体/PPTX/外部画面の今回手動確認は未実施。実機の操作感は本人確認待ち。

# iPad閲覧不具合の修正

- Request：本人のiPadでPDFを選べず、PNGは2枚目へ進まない。先にSimulatorで確認する。
- Investigation：表紙キャッシュのPNG1枚を全閲覧ファイルとする既存open処理が原因。
- Changes：別repo zukanのStore.readingFilesを導入し、オンラインは資料の全形式/ページ、オフラインは取得済みへ限定。初期形式は一覧のPDFを優先。
- Files Changed：別repoのCloudLibraryView/Store・CloudLibraryTests・CURRENT/検証文書。本repoはこの記録のみ。
- Validation：iPad Simulator69 XCTest失敗0。画面でPDF表示/形式切替/PNGスワイプ2枚目/次ボタン3枚目/PDF復帰を確認。Mira指定build・codesignと上書きインストール成功。
- Result：資料/認証情報の削除不要。AWS/API変更なし。
- Remaining Issues：修正版の本番実資料閲覧は本人確認待ち。正本zukan/docs/reader-cover-cache-fix.md。

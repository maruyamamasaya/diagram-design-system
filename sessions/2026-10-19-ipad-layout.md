# iPad向け既存アプリの画面改善

- Request：既存アプリをiPadでも快適に使えるよう対応する。
- Investigation：現在のiOS正本はDevelopment/zukan。ユニバーサル設定とPDFページ一覧は既存対応。本棚の上部操作と強制回転を改善対象とした。
- Changes：広幅で左本棚／検索／分類、compact幅と大文字で引き出し、選択操作の横スクロール、compact閲覧メニュー、iPadの強制回転解除。
- Files Changed：別repoのCloudLibraryView.swift、DocumentViewer.swift、PresentationViewerApp.swiftと操作／状態／検証文書。本repoはこの記録のみ。
- Validation：iPadOS26.5 Simulator通常署名67 XCTest失敗0、generic iOS build成功。縦横本棚・フォルダ作成／資料移動・PNG通常／全画面閲覧・大文字の引き出しを実操作確認。別repoのgit diff --check合格。旧構造検査は共有パッケージを拒否する既存条件で不合格。
- Result：実装とシミュレーター検証完了。証跡はzukan/outputs/ipad-layout、正本はzukan/docs/ipad-layout.md。
- Remaining Issues：実iPad未接続。実ウィンドウ縮小、PDF/PPTX手動操作、実認証／整理同期／オフライン・外部画面は今回未確認。追加の旧OS／iPhone Simulator確認は起動・インストール遅延で完了せず。AWS・本番API・既存端末データは変更なし。

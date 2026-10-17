# 選択資料のフォルダへの一括ドラッグ

- Request：複数選択した資料を左のフォルダへドラッグで一括移動。途中のアイコン質問には、アプリは画像設定済み、フォルダ個別画像は未実装と回答。
- Investigation：SwiftUIのカードGesture/draggableとListのonDropを確認。カード/フォルダの実マウス領域をGeometryReaderで明示し、両端をMac専用AppKitへ分離。
- Changes：CardDragSurface.swiftはマウス押下/移動/解放を判別してNSDraggingSessionを開始。ドラッグ開始時の選択ID一式をNSPasteboardItemへ格納、件数プレビュー表示。FolderDropSurface.swiftはアプリ内CardMouseView由来のみ受理、フォルダ強調、キャンセル解除、既知ID集合の既存一括保存へ接続。未選択カードからのドラッグはその1冊だけ。元ファイル移動なし。
- Validation：release build、配置先署名、git diff --check合格。新規NSDraggingInfo/実Pasteboardテスト2件＋既存10件＝12テスト合格（/tmp/bookshelf-native-drag-tests.log）。制限実行内のPasteboard拒否は通常OS接続環境で再実行。監視の旧rootゼロ通知という過剰なテスト条件が祖先イベントで失敗し、実際の新root変更を確認する条件へ修正。監視の本体は変更なし。
- UI：途中版で複数クリック選択の維持を確認。途中からネイティブ座標操作がnoWindowsAvailableを返し、App再接続/セッションリセットでも解消せず。AX読取/アクションは可能。最終版の実画面ドラッグ→ドロップ成功の目視は未確認とし、README/CURRENTへ明示。診断用ログ出力は最終ソース/アプリから除去。
- Result：/Applications/Zukan Bookshelf.appへ最終版を更新。65冊と分類情報/原本は保持、iOS/AWS変更なし。フォルダ画像設定は今回追加しない。

# フォルダ並べ替えの実画面検証・修正

- Request：実画面でドラッグを確認し、動かない箇所を直す。
- Investigation：CUAで空の確認用フォルダを作成。通常版への座標操作でnoWindowsAvailableが発生し、別操作スクリプトへの切替案は本人が拒否。以後もCUAのみを使用。重複登録のない一時検証コピーでドラッグ開始/受取の診断を行い、通常版でも操作可能になった。AppleScript/CGEvent等の別UI操作は使用していない。
- Findings：ドロップ面が文字の高さ14ptしかなく行端で失敗。短距離のOSドラッグで開始/解放の処理が安定しないケースと、挿入線が残るケースを実画面で確認。
- Changes：フォルダ行を最低26ptへ拡大。フォルダ並べ替えはOSドラッグセッションから同一ウインドウ内のmouseDown/mouseDragged/mouseUpへ変更。弱参照の行集合から位置を判定し、上下4ptの余白も許容。クリックとドラッグを区別し、解放時だけ保存、取消/完了時は挿入線を消去。資料のNSDraggingSession受取は維持し、ホバー表示状態に依存せず送信元と位置を再検査。
- UI Validation：/Applications/Zukan Bookshelf.appの最終修正版で、確認用フォルダを技術フォルダの下へ移動→上へ移動→下へ移動→上へ移動→下へ移動を連続確認。名前順（確認用→技術）ではない「技術→確認用」にして終了/再起動し、その順序の保持をAXとスクリーンショットで確認。資料一覧65冊も維持。証跡はmac-app/.build/validation/folder-order/{before-restart,after-restart}.png。
- Cleanup：確認用フォルダは画面の右クリック→解除で削除。既存の技術フォルダ/資料所属/原本を保持。一時検証.appを終了・除去し、診断コードは最終ソースとアプリから削除。
- Tests：19件すべて合格（/tmp/bookshelf-folder-order-ui-tests.log）。マウス押下→移動では保存せず解放で一括保存、クリック区別、取消後に移動しない回帰を追加。既存監視/画像/分類/保存検証も維持。release build/配置先codesign/git diff --check合格。
- Files：mac-app/Sources/Bookshelf/{FolderDropSurface,BookshelfApp}.swift、Tests/BookshelfDragTests/DragTests.swift、README/CURRENT/CODEMAP、本記録。
- Result：実画面の並べ替えと再起動保持まで検証完了。iOS/AWS/同期変更なし。大量フォルダ時のドラッグ中自動スクロールは今回未実装・未検証。

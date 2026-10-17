# Mac本棚：複数選択と一括フォルダ移動

- Request：資料を複数選択し、まとめてフォルダへ移動。
- Investigation：BookshelfAppの単一選択・メニュー・ドロップと、Coreの資料ID/設定永続化を確認。
- Changes：FoundationのBookSelectionへID集合・フォーカス・範囲/追加/全選択・表示外除去・ペイロード解析を分離。LibrarySettings.moveBooksで一括変更。SwiftUIは明示的な修飾キーGestureを使用し⌘/Shift対応。選択件数/解除/一括移動を下部表示、右クリックは選択中なら一式・未選択ならその1冊。複数IDのドラッグとListのonDropへ接続。
- Validation：release buildと配置先codesign検証合格。新規3＋既存7＝10テスト合格（/tmp/bookshelf-multiselect-tests.log）。途中ビルドと編集が重なった失敗は、編集終了後の再実行で解消。最終UI調整後のrelease buildも合格。
- UI：⌘クリックの2冊選択/解除、Shiftの3冊範囲選択、選択2冊の下部メニュー移動を確認。確認用フォルダで2冊表示を確認後、解除して元の未整理へ復帰。設定/原本/65冊は維持。修飾キーの組合せを初期実装から修正して再確認。
- Result：/Applicationsのアプリを更新・起動済み。通常一覧へ戻して納品。iOS/AWS変更なし。
- Remaining Issues：ドラッグは実装/ペイロードテスト済みだが、ネイティブ自動操作での移動成功は確認できず。検証済みの一括移動メニューを案内する。⌘Shift同時操作、VoiceOverの修飾キー操作は未検証。

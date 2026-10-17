# Macフォルダごとの画像アイコン

- Request：左の各フォルダへ好きな画像を設定。
- Changes：ShelfFolder.iconFileを任意追加。FolderIcons.swiftでImageIOによる最大128px縮小・UUID名PNGコピー・安全なローカル参照・設定成功後だけ旧コピー削除。右クリック/上部メニューに画像選択・標準復帰を追加、サイドバー22pt枠で縦横比保持。ネイティブフォルダ面にもコンテキストメニューを明示的に接続。
- Validation：release build/配置先codesign検証/git diff --check合格。既存12＋画像コピーと縮小/元画像削除後保持/壊れた画像/旧設定読込/永続化2＝14テスト合格。/tmp/bookshelf-folder-icons-tests.log。
- UI：技術フォルダ選択→上部メニュー→画像ピッカーから既存Bookshelf.pngを選択。設定保存と8641bytesのコピーを確認。直後にAX/スクリーンショットがtimeoutし、アプリを終了/再起動後は通常応答。再起動後のサイドバーに本棚画像を目視。標準アイコンに戻して検証用の指定を解除。右クリック入口そのものは未操作、上部メニュー経路を確認。
- Result：/Applicationsの本棚を更新済み。65冊と分類/原本保持、iOS/AWS/同期変更なし。孤立した画像コピーの一括清掃、画像トリミングは未実装。

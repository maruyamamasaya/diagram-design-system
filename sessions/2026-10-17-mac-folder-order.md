# 左側フォルダのドラッグ並べ替え

- Request：左のフォルダをドラッグして自由に並べ替える。
- Changes：LibrarySettingsへ任意folderOrder、FolderOrder.swiftで従来初期順/手動順/前後挿入/新規末尾/削除時順序清掃。SidebarはorderedFoldersを表示。FolderDropSurfaceはフォルダドラッグ開始・専用Pasteboard型・挿入線・アプリ内送信元確認・上下への挿入を追加。資料由来の一括分類とは別処理。階層変更ではなく表示順の変更。
- Validation：release build/配置先codesign/git diff --check合格。既存14＋Core3/ネイティブ1＝18テスト合格（/tmp/bookshelf-folder-order-tests.log）。上下移動/保存復元/旧設定/自己・不明ID拒否/新規追加/親子/アイコン/資料所属の維持と、フォルダの挿入が資料受取を呼ばないことを確認。
- UI：/Applicationsの更新版を起動し65冊と既存技術フォルダを確認。確認用フォルダ作成のAXクリックが30秒timeout、操作セッションリセット後も作成前の通常画面であり、保存設定に新規フォルダなし。実画面のフォルダドラッグ成功は未確認としてREADME/CURRENTへ記録。
- Result：配置済みアプリを更新。ユーザーの資料/既存分類を維持。iOS/AWS/同期変更なし。

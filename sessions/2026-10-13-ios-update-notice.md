# iOS端末優先・更新通知

- Request：保存/キャッシュを優先し、新版がある時だけ表示する合意案を実装。
- Investigation：別repoの版別詳細・SHA256検証キャッシュ・保存コピー優先は既存。カードは旧版/新版を別表示し保存マークがあった。
- Changes：IDごとに統合、端末利用可能版を通常タップで開く。オンライン新版にのみ更新ボタン。キャッシュのみの旧版閲覧/サムネイル/ページ切替を対応。通常の保存マークを削除。
- Files Changed：Presentation-ViewerのCloudLibraryStore.swift、CloudLibraryView.swift、CloudLibraryTests.swift、CURRENT.md、README.md、docs/local-update-notice.md。
- Validation：project構造検査とdiff check合格。追加回帰テストはApple SDK不在で未実行。iOSビルド/目視/実機反映未実施。
- Result：ローカル実装完了。AWS/API変更なし。
- Remaining Issues：Macでビルド/XCTest、更新ボタンと旧版維持の画面確認。版跨ぎ差分転送は追加なし。

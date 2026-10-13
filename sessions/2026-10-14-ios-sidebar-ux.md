# iPhoneの一覧とプレゼン操作の再配置

- Request：一覧のタグ/切替で表示領域が狭くなる問題をサイドパネルへ整理。プレゼンのスライド一覧を本文から分離し、最後に実機デプロイ。
- Investigation：現checkoutは別repo Development/zukan。既存のLibraryView修正と実機更新記録を保持。タブ、分類、検索、認証gate、PDF/PNG、サムネイルを確認。
- Changes：iPhoneの常設タブ/分類/ナビバーを左下の引き出しへ整理。現在のライブラリ/条件を入口に表示。検索、タグ、グループ、既存管理操作とローカル管理を配置。プレゼンのスライド一覧/下操作を独立領域へ変更、本文非重複と安全領域を確保。空Viewのサムネイルtaskを修正。
- Files Changed：別repo PresentationViewerApp.swift、CloudLibraryView.swift、LibraryView.swift、DocumentViewer.swift、CURRENT.md、README.md、docs/library-sidebar.md。本repoは本記録のみ。
- Validation：構造検査とdiff --check合格。署名付きSimulator49 XCTest合格。初回署名なしテストはKeychain関連3アサーション失敗。最終Simulator/Device build・codesign成功。iPhone17e Simulator横向きで一覧、メニュー開閉、PNGプレゼン、サムネイル、ページ送り/選択同期、一覧開閉と非重複を目視。
- Result：本人デプロイ依頼後、Vesperaを同Bundle IDで更新インストールし更新版起動成功。AWS/API変更なし。
- Remaining Issues：実機の両手操作感、PDF実表示、縦向き最終表示、iPad、Dynamic Type/VoiceOver操作は未確認。

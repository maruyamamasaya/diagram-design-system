# 右下の丸い入口と閲覧タイトルバーの整理

- Request：広い入口を丸ボタンへ変更。右側から左へパネルを開く。閲覧タイトルバーの占有も整理。先行のデプロイ依頼を継続。
- Investigation：別repo Development/zukanのLibraryDrawerとDocumentViewerを確認。
- Changes：48pt右下丸ボタン、右端展開/開閉スワイプ、絞り込みの小さな印。iPhone閲覧のタイトルバーを隠し、右の資料パネルへ名前/形式/保存/終了操作を配置。
- Files Changed：別repo PresentationViewerApp.swift、DocumentViewer.swift、README.md、CURRENT.md、docs/library-sidebar.md。
- Validation：最終Simulator/Device build・codesign・diff --check合格。Simulator横向きで右下配置/右パネル開閉/資料タイトルバー除去/名前・保存・形式・終了操作表示を目視。先行の49 XCTest結果は維持し、今回の配置変更で再実行なし。
- Result：Vesperaへ同Bundle IDで更新インストール成功。起動確認は後記。AWS/API変更なし。
- Remaining Issues：実機操作感、縦向き/iPad/Dynamic Type/VoiceOverは未確認。

実機起動の結果：端末ロック（Locked）のため起動要求を拒否。更新インストールは成功、解除後の起動確認は未完了。

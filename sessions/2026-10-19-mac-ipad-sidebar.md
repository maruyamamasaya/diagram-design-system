# Mac/iPadの左本棚統合

本人承認の画面案を実装。Macは既存一覧を保持しゴミ箱をシートからサイドバー選択先へ変更、保存場所を開閉式、上部バーを薄くした。iPadは上部folderControlsを左常設レールへ移し、種別も左で切替。重複したクラウド上部タブを隠し、ローカルとログイン前は戻り道を保持。

Mac27件/1スキップ/失敗0、release署名/Applications更新/起動、ゴミ箱と一覧往復を実UI確認。iPad71 XCTest失敗0、署名build/codesign、Mira更新/起動成功。Simulator画面で配置確認。[仕様と証跡](../docs/mac-ipad-sidebar.md)。AWS変更なし、元資料保持。既存の閲覧画面や共通ゴミ箱の先行変更を保持。

# iPadの本棚を一つの入口へ

## Request
図解/プレゼン切替とフォルダの役割の重複を解消する。

## Investigation
隣接zukanのCloudLibraryViewが種類別に資料・フォルダ・タグ候補を制限していた。既存の親フォルダを表示すれば切替を省ける。

## Changes / Files Changed
zukan CloudLibraryView：iPadの切替メニューを固定見出しへ変更し、全資料と親を含む全フォルダを表示。検索・タグ候補も横断。選択フォルダの種類に従い配下へ作成し、固定親の改名/解除を防ぐ。iPhoneの操作は保持。共有データ型・AWS変更なし。
仕様正本docs/mac-ipad-sidebar.md、CURRENT、zukan docs/library-folders.mdを更新。

## Validation
Simulatorビルド成功。iPhone 17 / iOS Simulatorの既存XCTest75件、失敗0。iPad分岐の表示目視は未実施。両repo git diff --check成功。
ログ：/private/tmp/zukan-sidebar-unified-tests.log。

## Result / Remaining Issues
本人の実機反映指示後、既存チームによるiOS署名build・codesign検査成功。iPad Miraの既存bundle com.example.PresentationViewerへ更新インストールし起動成功（17:32 JST）。アプリ削除なし。iPad画面の目視・手操作は未実施。既存作業中のフォルダ統合差分を保持。

実機ビルドログ：/private/tmp/zukan-ipad-single-library-device-build.log。初回はチーム未指定で失敗し、既存配布チーム明示で成功。

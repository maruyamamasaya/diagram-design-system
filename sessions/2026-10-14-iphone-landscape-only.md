# iPhoneアプリ横向き専用

- Request：アプリ全体を横向き専用に修正。
- Investigation：指定のPresentation-Viewerは存在せず、実repoは /Users/maruyamasusumuya/Development/zukan。起動時横向き要求のみでPortraitが許可されていた。
- Changes / Files Changed：別repoのApp方向ポリシー、閲覧要求、Debug/Release方向設定、回帰テスト、構造検査、README/CURRENT、docs/iphone-landscape-only.md。作業用コピーで検証後、元内容を照合して適用。
- Validation：Xcode26.6/iPhone17e Simulator26.5の通常署名build・49 XCTest合格。構造検査・差分空白検査合格。生成Info.plistは左右Landscapeのみ。初回署名なしはKeychain認証テストで失敗、通常署名再実行は全件合格。
- Result：iPhoneでは縦向き要求・自由回転復帰をLandscapeへ正規化し、対象scene復帰でも要求。
- Remaining Issues：画面キャプチャ不安定のため一覧の目視は未完了。実機更新/回転ロック/復帰操作は未実施。

実機更新追記：本人依頼後、既存Team/Bundle IDで実機Debug build・codesign検証合格。Vesperaへ更新インストールし、2026-10-14 11:11 JSTに既存プロセス終了・更新版起動成功。実機の横画面表示/復帰/回転ロック操作は本人確認待ち。別repoのdocs/iphone-landscape-only.mdとoutputs/iphone-landscape-onlyへ証跡保存。

# iOS開発端末の共通指示

## Request
既存指示を維持して指定iPhoneシミュレーターの再利用とデータ保護を永続化し、iPad Proも対象へ追加。

## Investigation
`xcrun simctl list devices available` で指定iPhone 17e / iOS 26.5 / UDIDの存在（Shutdown）を確認。利用可能なiPad Proシミュレーターはなし。実機の接続は未確認。

## Changes / Files Changed
AGENTS.mdを方針の正本とし、OPERATIONS.md・TESTING.md・隣接zukan/AGENTS.mdから参照。既存の変更は保持。

## Validation
指定端末を読取確認。`npm run verify -- docs` 合格（318文書のリンク先存在・diff空白検査）。zukanの参照先と見出しも確認。

## Result / Remaining Issues
iPad Proの世代・サイズ・OS・UDIDと実機/シミュレーター区分は未確定。対象確認まで作成や代替選択を行わない。端末の起動・変更、ビルド・テスト、データ削除は実施していない。

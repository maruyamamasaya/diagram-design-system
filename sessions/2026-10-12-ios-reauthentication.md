# iOS再ログイン・タブ復帰

- 依頼：認証エラーからのアプリ内復帰と、ローカル資料から図解タブへ戻る際の誤選択改善。
- 変更対象：別repo Presentation-Viewer。エラー/その他の再ログイン、成功後一覧再作成、TabView選択と固定タグを追加。既存未コミットの端末コピー改善は保持。
- 検証：Simulator XCTest46件合格、最終Simulator build成功、diff check合格。実認証/実機タブ操作/実機更新は未実施。AWS操作なし。
- 正本：Presentation-Viewer/docs/reauthentication-validation.md。

- 本人のデプロイ依頼後、署名build/codesign合格、Vespera更新インストール・更新版起動成功。実機操作は本人確認待ち。

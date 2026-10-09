# Phase 11B Mac再検証

Request：既存iOS連携・Mac/Simulator/実機検証、公開API設計。
Investigation：既存モック/HTTPS adapter・保存実装と最新viewer-api、Xcode/Simulator/接続iPhoneを確認。
Changes：既存検索UIを含む再検証、公開API設計と証跡文書。SVG除外はユーザー確認で維持。
Files Changed：docs/phase11b1-status.md、docs/phase11b-public-api-plan.md、iOS側VALIDATION.md・docs/phase11b-refresh-validation.md。
Validation：Simulator build/XCTest23件合格、一覧目視、実機署名build/更新/起動成功、構造・diff検査成功。
Result：モック実装維持、AWS変更なし。2リポジトリ独立。
Remaining Issues：UI操作ツールの2回タイムアウトで手動操作未実施。実機画面・機内モード・公開OIDC/API/Keychain未検証または未実装。

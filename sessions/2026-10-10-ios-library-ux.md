# iOS図解ライブラリのUX改善

- Request：一覧・閲覧・保存の導線をまとめて改善して実装。
- Changes：Presentation-Viewerでサムネイルカード、PDF優先直接表示、再取得なし閲覧中保存、補助メニュー、保存済み資料の集約。
- Validation：Simulator21テスト合格・画面目視、既存Apple IDで実機build／更新インストール／起動成功。
- Result：既存フォルダ機能と整合性検査を維持。本番S3・AWS変更なし。
- Remaining：実機操作感、SVG/PPTX表示の追加確認、公開OIDC／HTTPS。正本はiOSリポジトリdocs/ux-refresh-validation.md。

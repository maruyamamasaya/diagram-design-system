# 現行文書のiOSプロジェクト参照更新

- Request：今使う文書の旧参照をzukanへ更新し、過去の作業記録は保持する。
- Investigation：旧フォルダはzukanへ移動済み。現行originはzukan.git。実行コード/ビルド設定の旧フォルダ依存は検索範囲で検出なし。
- Changes / Files Changed：README.md、CURRENT.md、docs/ios-integration.md、隣接zukan/README.md。現行名と配置・相互リンクを更新し、READMEの設計のみ/本番未設定という説明を修正。連携方針の当初設計には日付と現行状態への案内を追加。
- Validation：npm run verify -- docs合格（185文書・リンク欠落0）、両repoのgit diff --check合格。現行文書の旧名は移動経緯の説明だけに限定。
- Result：案内をzukanに統一。過去の作業/検証記録、Xcodeプロジェクト/Scheme、既存の別作業の実装変更は保持。
- Remaining Issues：アプリ実装変更なし。ビルド/実機/AWS検証は対象外。

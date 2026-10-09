# ローカルビューアーの作業規則

ルートの[AGENTS](../AGENTS.md)に追加する。独立Next.js/TypeScript packageとテストを持つため、この領域へ固有規則を置く。

## Phase 4：ビューアー保守
明示依頼されたローカルビューアーは初期基盤のアプリ開発禁止の例外としてviewer/へ分離する。生成・upload CLIは変更しない。変更前に[API](../docs/viewer-api.md)、[コスト](../docs/cost-policy.md)、[デプロイ](../docs/phase4-deployment.md)を読む。非公開S3の読取のみ、単一owner認可・短期URL・秘密情報非露出を維持する。ローカルパスワード認証をそのまま公開してはならない。実装範囲と検証の正は[Phase 4検証](../docs/phase4-validation.md)。UIはモノクロを守り、スマホでも図解16:9を保持する。公開・IAM変更・有料リソース・予算変更は具体的な料金を示した別承認が必要。


検証の正本は[TESTING](../TESTING.md)。API入口はsrc/lib/api.ts、認証はauth.ts、読取はstore.ts。秘密値をクライアントへ渡さず、変更前に呼出元とtests/api.test.tsを確認する。

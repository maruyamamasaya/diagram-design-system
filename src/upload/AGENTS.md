# S3保存コードの作業規則

ルートの[AGENTS](../../AGENTS.md)、Phase 3の承認・安全規則に追加する。生成から独立し、外部書込・衝突・再実行の固有契約を持つ領域として分離する。

変更前に[保存仕様](../../docs/s3-storage.md)、metadata/configスキーマ、[コスト方針](../../docs/cost-policy.md)を読む。workflow → metadata → s3-storageとupload-cliの呼出元を追う。許可リスト・不変ID/版・条件付きPUT・GETハッシュ照合・完了後catalog掲載・ローカル保持を維持する。

検証は[TESTING](../../TESTING.md)。保存モックの成功を実AWS接続済みと報告しない。実AWS・書込プローブ・承認設定変更はルート規則に従う。生成CLIとviewerを保存コードの都合で変更しない。

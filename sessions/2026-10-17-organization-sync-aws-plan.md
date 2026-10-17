# Mac・iPhone整理同期のAWS構成と料金設計

## Request
既存認証/APIを再利用し、資料本体はS3読取のまま、実端末同期のAWS設計と料金シミュレーション。設計のみ、AWS変更なし。

## Investigation
既存Cognito Essentials/owner、HTTP API ANY/v1 proxy、Node22 Lambda256MB/20秒、IAM/API本文制限、iOS PKCE/Keychain、共通Swift同期モデルを照合。構成は既存デプロイ記録とローカルコードから確認し、今回ライブAWSは参照していない。東京の公式公開価格表5サービスを認証不要HTTPで当日取得。API1.29USD/100万等をSKU/公開日付きで抽出。課金API/Cost Explorer/AWS CLIは不使用。

## Changes / Files Changed
[設計正本](../docs/organization-sync-aws-plan.md)、単価organization-sync-aws-rates.json、計算結果organization-sync-aws-estimate.json、オフライン再計算scripts/estimate-organization-sync.pyを追加。CURRENT/CODEMAP/OPERATIONS/コスト方針に参照を追加。アプリ/API/認証/インフラの実装・設定は変更しない。

## Validation
Decimalで再計算し保存JSONとの一致、各端末回数×2台×30日の一致、内訳と合計、無料転送/枠なし/認証費配賦、差分取得の感度分析を確認。文書検査合格。単価は取得時の公式値、使用量/実行時間/為替/税は明示的な設計仮定で請求上限ではない。

## Result / Remaining Issues
既存Pool/API/Lambda/S3＋Mac用public client、管理専用キーのS3条件付き書込を第一案。通常追加1.11〜3.41円/月、多用20.40〜135.20円/月。既存本人のMAU増分0、1MAU全額配賦なら別途2.64円。資料閲覧費は既存料金として区別。S3全状態/履歴16MiB上限/遷移条件を明示し、安全なreceipt削除を未設計のまま実施しない。

次はAWSなしでTS authority/条件付き保存/HTTPS transportとMacの認証・S3閲覧を接続し、Swift相互検証。実測後に再見積もり/読取監査/変更セット提示と別承認を経て配備する。既存利用者データ/実機/AWSは未変更。公開価格表の一時取得ファイルは計算用に抽出後削除し、単価/SKU/公開日をGit管理する。

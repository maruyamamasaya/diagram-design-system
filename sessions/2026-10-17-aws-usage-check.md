# AWS利用量の簡易確認

- Request：S3の使用量とAWS全体の利用料金を確認。
- Investigation：アカウント676643701781へ短期認証で接続。Cost Explorer全サービス・全リージョン（10/1以上10/17未満UTC）、Budgets、全4バケットの現行オブジェクトLISTと東京S3日次メトリクスを読取。
- Changes：AWS変更なし。ローカル証跡のみ保存。
- Files Changed：本記録、Git管理外outputs/aws-usage-2026-10-17/{cost,storage}.json。
- Validation：全4バケットのLIST成功。現行合計594,673,247 bytes、18,819個。専用バケット547,518,651 bytes、761個。日次メトリクスは時点差がありLISTと区別。全サービス利用料金0.6651097752 USD、Credit等込み-0.0000017038 USD（丸め誤差水準、Estimated）。主因CloudTrail 0.50692、S3 0.1185800483 USD。Budgetsは64 USD全体・1 USD S3、実績表示とも0 USD、Health HEALTHY。
- Result：容量・現時点請求に切迫した問題は見当たらない。Credit前の料金が発生しており無料と断定しない。日次別照会後に月次サービス/RECORD_TYPE別を取得して相殺確認。今回CE照会2回分の費用は未反映の可能性。
- Remaining Issues：10/17当日・請求反映遅延、クレジット残高/有効期限、全AWSリソース棚卸しは未確認。LIST合計に非現行版・未完了multipartを含めない。設定変更・削除なし。

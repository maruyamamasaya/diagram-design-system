# ログ増加・保持期間の読取確認

- Request：ログ増加速度と保存期間に問題がないか確認。
- Investigation：全2ログバケットの現行LISTをLastModified UTC日で集計。ライフサイクル・Versioning、東京CloudWatch Logs全7グループ、CloudTrail全2証跡の記録対象と配信状態を読取。
- Changes：AWS変更なし。記録のみ。
- Files Changed：本記録、outputs/aws-usage-2026-10-17/log-retention.json、trail-settings.json（Git管理外）。
- Validation：10/10〜16の7日平均は全体証跡754個/日・0.834 MiB/日、PoC231.4個/日・0.422 MiB/日。10/3〜9平均846.7個・1.118 MiB、250.9個・0.531 MiBから減少。10/17は途中日のため平均から除外。オブジェクト数はイベント数ではなくDigestを含む。全体証跡は7056 Digest＋6905ログ、全リージョン記録。PoCもCloudTrailであり、東京管理イベントの記録範囲が重なる。両証跡IsLogging=true、最新配信成功、応答に配信エラーなし。
- Result：急増なし。全体ログバケットはNoSuchLifecycleConfigurationで自動削除なし。PoC全キーはEnabled・90日削除。両バケットVersioning未有効。CloudWatch図解API14日・230309 bytes、PoC6グループ7日・storedBytes=0。現在ペースが続けばS3両ログ合計約38 MiB/30日増加（削除前）、全体証跡は約304 MiB/365日。保持設定のない全体ログと管理イベント重複記録が将来の整理候補。保持要件は未確定。
- Remaining Issues：他リージョンCloudWatchは未調査。LISTは残存現行オブジェクトの更新時刻集計で、イベント発生数や厳密な過去の流入量ではない。ログ本文は未取得。保存期間変更・証跡停止・削除は未実施。

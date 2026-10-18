# 実Cognito・実AWSの少量同期検証と有効化

Request: 本人のパスワード再設定完了後、ログイン/少量データ確認/有効化を続行。資料・整理情報を保持。
Investigation: 一時helperの実PKCEログインと認可済み/v1/me成功・owner一致を確認。無効API404のため一時有効化が必要で、最初の実行は自動承認レビューで従来の順序違反として拒否され未実行。本人が一時有効化→合成検証→成功時維持/失敗時無効化の順序を追加明示承認した。
Changes: flag-only変更セットはFunction/Integration Modify・双方置換False/削除なし。実行後UPDATE_COMPLETE、server true。元コード/環境/Role/Memory/Timeout/Runtimeを保持。停止用ガードを用意して実テスト実行。
Validation: 実Cognito Mac token→実API/Lambda/S3で10通信。空snapshot/作成/同要求ID再送/古い版競合/改名/削除/無変更/終了合格。revision3/receipt4/有効整理レコード0/閉じた受付1を保持。既存library757件544869659 bytes一致、BPA/AES256維持、未認証401。本人CONFIRMED/メール確認済み。
Result: server同期有効を維持。通常の本棚は未接続、元資料/端末管理情報未変更。一時token/refresh credentials削除、helper終了/登録解除/appコピーと一時補助scriptを削除。料金条件変更なし。最新配備記録とCURRENT/運用/検証を更新。
Remaining: 普段のMac/iPhoneへの設定反映/配布と管理バックアップ/統合確認による参加、実機同期、Macクラウド本体取得導線は別工程。通信断再送はローカル実TLSの既存証跡で、今回は成功済み要求の明示再送。失敗停止経路は実行不要だったため実失敗テスト済みとはしない。

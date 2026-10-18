# 同期検証前の本人アカウント復旧

Request: 本人が登録メールを確認済みにし、同アドレスへ再設定コードを送ることを明示承認。資料/整理情報を保持。
Investigation: Cognitoメール未確認が再設定拒否の原因。復旧先verified_email、MFA OFF、本人ownerとの一致を確認。
Changes: 同じownerのemail_verified=true、AdminResetUserPassword実行。新しいユーザー/メール変更/資料変更なし。
Validation: API成功、再読取でRESET_REQUIRED・email_verified=true。コード/パスワードを取得せず。CUA画面取得はtimeoutReachedで未確認。
Result: 送信要求成功（受信は本人確認待ち）。本人がコード/新パスワードを画面入力する必要がある。同期false・管理データ保持。追加リソース/新規MAUなし、月額試算変更なし。
Remaining: 本人の再設定/ログイン後、少量の実API同期検証と段階的有効化を継続する。

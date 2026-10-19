# 共通ゴミ箱のAWS適用（本人操作待ち）

2026-10-19。本人が具体的な料金/変更案と、合成1件検証後の両アプリ有効化を承認。

[配備記録](../docs/shared-trash-deployment.md)。直前template/policy一致、限定bucket/uploader policy、CFN Function/Role/Integration Modify・置換なしでUPDATE_COMPLETE。コードSHA256一致、既存owner/認証/256MB20秒/整理同期維持。保存CLI保護を有効化。合成UUID1件4オブジェクト9755bytes保存・全GET/SHA256成功。

一時有効化は成功したが、本人のKeychain応答待ちでHTTPS操作が未完了。本人へ端末での確認を依頼。フラグfalseへ戻し、両アプリ無効を維持。合成資料は後続検証用に保持。既存資料削除なし。Macのrelease buildは別途記録。秘密を表示せず、補助トークンは取得でき次第権限0600の一時ファイルから検証に使い削除する。

再開：Keychain許可→本人セッションでAPI確認→一時有効→合成移動/復元/全削除/再試行/既存catalog完全保持→両アプリflag true・テスト・ビルド・既存インストール更新。新AWS料金/構成への拡大はしない。

## 再開・検証成功

本人のKeychain許可後、AWS切替中の短期トークン失効に備え再取得（本人が再度許可）。直後に15 HTTPS要求で合成1件の移動/復元/全削除/重複操作/復元拒否/削除通知に合格。検証用4ファイル残存0、既存catalog53件のキー/size/ETag保持、保存CLIで削除ID再公開拒否。短期トークン削除。サーバー有効維持。Mac有効版release署名/Applications更新/起動、ゴミ箱シートと本番deleted1件の保存確認。iOSデモAPIは非対応能力を明示して回帰修正後、71 XCTest合格・実機署名build成功。詳細は配備記録。

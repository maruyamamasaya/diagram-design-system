# 共通ゴミ箱の配備記録

2026-10-19。本人が[変更・料金案](shared-trash-aws-proposal.md)を承認し、AWS適用→合成1件検証→成功後両アプリ有効化を指示した。

## 適用済み

- 準備時の実template・bucket policyと直前の取得値の一致を確認。
- 既存bucket policyの限定CAS例外、保存roleのSharedLibraryLifecycleを追加。
- 新bundle SHA256 `8e1cf136c05aa72c5abd26a2fad00091d8cf4eb04589f5e7e9649f81d147dd38` を既存deployments/apiの不変キーへAES256/If-None-Matchで保存。
- CloudFormation `shared-trash-disabled-20261019` のFunction/Role/Integration Modify・Replacement=Falseを確認して実行。UPDATE_COMPLETE。コードSHA256、256MB/20秒/nodejs22、既存owner/認証/整理同期の維持を確認。
- 保存CLIの承認済みローカルconfigで `lifecycleProtection: true`。
- サーバーを承認済み合成検証用に一時有効化。UPDATE_COMPLETE、コード/環境の差分が機能フラグのみと確認。
- 新UUID `be36f20b-9868-4f9a-bbde-c994213c861e`、版1、合成の白紙PNG/PDFと最小manifest2コピー、計4オブジェクト9755 bytesだけを保存。全GET/SHA256照合成功。既存catalogのキー/サイズ/ETagを基準保存。

## 検証・有効化

- 本人がKeychainを端末上で許可。トークンが短期のため切替待ち後に一度再取得し、直後に本番HTTPSで15要求を実行した。トークンは検証後に削除し、内容は表示/記録していない。
- 本番Cognito本人認証→共有snapshot→trash→重複trash→詳細404→restore→詳細200→再trash→4オブジェクトの計画/全容量一致→delete→重複delete→restore409→deleted通知、すべて合格。
- S3残存0、既存catalog全53オブジェクトのキー/サイズ/ETag一致、削除済みIDへの保存CLI再公開拒否を確認。検査用Listは保存roleに権限がないprefixのため、権限拡大せず既存調査profileの読取で検証。保存roleでは再公開拒否を確認した。
- サーバー有効trueを維持。UPDATE_COMPLETE、既存owner/認証/整理同期/実行設定は維持。削除済み通知と解放済み資料ロックは意図して保持する。
- Macのbuild-app.shで `LibraryLifecycleEnabled=true` を永続設定。release build/署名確認後Applications版へ更新。旧プロセスを終了し更新版を起動、共通ゴミ箱シート表示と、本番の合成deleted通知1件のローカル保存を確認。
- iOSの元zukan Info.plistで有効化。有効化テストがデモ接続にもAPIを要求していたため、CloudLibraryAPIにsupportsLifecycleを追加し本番HTTPSだけ有効とした。修正後arm64 Simulator **71 XCTest・失敗0**、署名付き実機build/codesign成功。Vesperaの既存bundleへインストール/起動成功。既存の閲覧画面改修は保持。
- 共通Swift43テスト・失敗0、Mac27件/1スキップ/失敗0（前段）、Mac有効版release build成功。

AWSの予算・Cognito・公開設定・暗号化・バージョニング・他バケットは変更していない。利用者資料は削除していない。詳細証跡は `outputs/shared-trash-readiness/`。実機の手操作による往復と、オフラインiPhoneのコピー削除は本人と最終確認する。iOSのコピー保持/完全削除/再保存拒否はXCTestで検証済み。

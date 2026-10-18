# 整理同期の実AWS差分と最終見積もり

Request: AWSへ再ログインしてライブ構成との差分と料金を確認し、承認前にAWSを変更しない。
Investigation: AWS CLI login成功。STS/CloudFormation GetTemplate/Describe/List、Lambda configuration、Cognito pool/client/scope、IAM inline/attached policies、API stage/routes、ログ/S3 BPA/encryption/ownership/versioning、予定キーHeadとlibrary/サイズ一覧を読取。
Changes: 承認用docs/organization-sync-aws-review.md、CURRENT/readinessの状態更新。ライブ由来の未適用template、配備予定zip/hash、単価照合/容量/差分証跡はoutputs/organization-sync-auditへ保存。既存固定UUIDを保持。
Validation: Account/owner/key一致、IAMがlive templateと一致、MacClient1件追加・Scope/Client/Role/Functionだけの更新案、その他8リソース定義一致。S3管理キー404、既存BPA/AES256/owner-enforced/Versioning未有効、Lambda256MB20秒x86/VPCなし/ログ14日。公式9単価再取得一致、全料金ケースを再計算。文書リンクと差分検査。
Result: 通常+初回追加7.71円/月、全端末毎時5回正常27.62円、多分割常用165.78円（転送無料枠なし）。旧条件の既存費33〜36円が続けば通常総額41〜44円の参考。実請求総額の監査ではない。管理JSON151 bytesとコード673228 bytesの承認対象をhash固定。
Remaining Issues: 100円保証なし。実変更セットのreplacement判定/配備/実Cognito追加scope/実機・新画面操作は未実施。API1rpsを含む分割間隔確認、Macのクラウド本体取得は別工程。変更セット作成/リソース変更/S3書込/課金API照会は一切なし。

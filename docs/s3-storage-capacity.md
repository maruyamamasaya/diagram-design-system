# S3保存容量と月額費用

2026-10-19。iOSの旧「保存料金シミュレーション」を置換。本人承認後、本番API/IAM適用・認証付き容量照合・iPhone/iPad更新と起動まで完了。

## 集計契約

単一owner認証の `GET /v1/storage-capacity` が専用バケット `diagram-design-system-676643701781-apne1` 全体の ListObjectVersions を全ページ取得する。最新版/旧版・非現行S3版・ゴミ箱・管理ファイル・配備コードも含む。ファイル本体のGETはしない。Versions.Size合計と、削除マーカーのUTF-8キー長（Standard課金対象）を合算する。未完了multipartのパート、請求の時間積算や無料枠は対象外。取得中の変更に対する原子的スナップショット保証はない。

応答：`scope: dedicated-bucket-all-versions`、`sizeBytes`（削除マーカー分を含む）、`objectCount`（全オブジェクト版数）、`deleteMarkerCount`、`standardOnly`、`updatedAt`（取得完了ISO日時）。キー・版ID・bucket名を返さない。保存クラスがStandard以外/不明なら容量だけ表示し、料金は算出しない。

既存の本人認証/read scopeを通す。クエリによる保存先指定を拒否。`VIEWER_STORAGE_CAPACITY_ENABLED=true` とstorage=s3の両方が必要。無効時503。成功結果をプロセス内60秒保持し並行要求を共有。失敗はキャッシュしない。100ページ/8秒の走査上限、S3通信全体の9秒中断を持ち、超過・ページ循環・不正サイズ・途中失敗で部分合計を返さない。

iOSは画面初回と更新ボタンで取得。容量・単価・為替・税率の入力UIを廃止。東京Standard最初の50 TiB、0.025 USD/GiB・月、150円/USD、税10%の固定参考条件で月額目安を表示する。50 TiB超は料金算出を停止。料金は請求実績ではなく現在の容量を1か月保持した場合の保存費。通信/API/認証等は含まない。失敗時は前回取得値と日時を保持。サーバー未対応時に旧metadata集計へ代用しない。

履歴は利用者別 `s3-storage-cost-history.json` に最大365回、取得時料金を保存する。同じ取得日時のサーバーキャッシュ結果は重複記録しない。旧最新版のみの `storage-cost-history.json` は保持し、新履歴へ混在させない。端末コピー削除で履歴を消さない。既存のサンプルAPIはサンプルである旨を画面表示し、本番S3取得と区別する。

## 実読取と検証

2026-10-19 JST、既存調査profileでAWS CLI ListObjectVersionsの全ページを読取：851オブジェクト版、592,850,188 bytes（約565.4 MiB / 0.5521 GiB）、全件Standard、削除マーカー0。上記条件で約2.28円/月。CLIでの実読取であり、本番新APIや端末での成功を示すものではない。

APIテストはモックで全版/管理/ゴミ箱、削除マーカーの日本語キー長、ページ継続/循環、途中失敗、不正サイズ、保存クラス不明/非Standard、空bucket、認証/フラグ/クエリ拒否、同時要求共有/キャッシュ/キー非公開を検査。iOSはURLProtocolで認証ヘッダー・専用endpoint・scope拒否・protocol経由の呼出し、新旧履歴分離を検査。実行結果は[sessions](../sessions/2026-10-19-s3-storage-capacity.md)参照。

AWS適用は[料金と承認案](s3-storage-capacity-aws-proposal.md)。公式：[全版一覧](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectVersions.html)、[削除マーカー課金](https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeleteMarker.html)、[S3料金](https://aws.amazon.com/s3/pricing/)。

## 本番反映（2026-10-19）

本人が料金/構成案を承認。CloudFormation s3-capacity-20261019はFunction/Integration/RoleのModifyのみ、Replacement=Falseを確認して実行しUPDATE_COMPLETE。既存テンプレートへ容量用の限定ListBucketVersions policy・trueフラグだけを追加、コードassetを不変キーへAES256/条件付きPUTしGET/SHA256一致を確認した。既存認証/owner/整理同期/ゴミ箱/256MB/20秒/nodejs22を維持。

本番本人認証付きGETは593,772,472 bytes / 852版 / 削除マーカー0 / Standardのみ。CLI全版一覧と完全一致。配備zip922,284 bytes追加分だけ前段から増加。目安2.2811円/月（固定参考条件）。未認証401・保存先指定query400、旧一覧先頭20件/次ページ有無・ゴミ箱snapshot・整理同期bootstrapの一致を確認。資料の変更/削除を伴う検証なし。

iOS署名build/codesign成功後、既存bundleへVespera（iPhone17e）とMira（iPad）を更新インストール・起動成功。手入力UIは廃止。本番容量画面の実機手操作/画面目視は未確認。Mac版アプリ更新は今回の対象外。証跡：outputs/s3-capacity-deployment/、[適用記録](../sessions/2026-10-19-s3-storage-capacity-deployment.md)。

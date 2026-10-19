# スマホ・Mac共通ゴミ箱：AWS変更承認案

2026-10-19、東京リージョン。**未適用・承認待ち**。ローカルの実装とLambda bundle作成まで完了。実AWSのゴミ箱操作・既存資料削除は未実施。

## 変更範囲

既存 `diagram-library-api` のコードとIAM roleを更新し、`LibraryLifecycleEnabled` を追加する。既存256MB/20秒、ログ14日、Cognitoの単一owner認可を維持する。常時稼働サーバーや新しい課金サービスは追加しない。

既存の非公開バケット `diagram-design-system-676643701781-apne1` に、資料単位の状態 `library/lifecycle/{id}.json` と排他 `library/document-locks/{id}.json` を保存する。移動・復元は資料本体を消さない。完全削除は確認済み資料IDの全版だけを対象に、成果物とcatalogを削除する。削除通知は残して遅れて接続する端末へ伝える。

- Lambda：新prefixの限定Get/Put/List、GetBucketVersioning、`library/diagrams/*` と `library/catalog/*` のDeleteObjectを追加。[権限差分](../infra/shared-trash-lambda-policy.proposed.json)。DeleteObjectVersionは追加しない。
- 保存CLI role：状態の読取と資料ロックのCAS書込を追加。[追加inline policy](../infra/shared-trash-uploader-policy.proposed.json)。資料削除権限は追加しない。
- バケット：既存TLS/AES256/上書き拒否を維持し、上記roleの新prefixに限って条件付き更新を許可。[ポリシー全文](../infra/shared-trash-bucket-policy.proposed.json)。公開設定・暗号化・バージョニングを変更しない。
- 両アプリ：サーバー検証後に共通ゴミ箱を有効化してビルド・更新する。完全削除通知の保存後、アプリ管理下のコピーを消す。オフライン端末は次の接続時に反映。Macの制作原本フォルダは対象外。
- 全保存CLIを更新し、承認後にローカル設定 `lifecycleProtection: true` とする。新旧CLIの混用は禁止。クラッシュしたuploadのロックは、旧処理の停止確認後に個別復旧する。

[構成変更一覧](../infra/shared-trash-change-plan.proposed.json)。新AWSリソースの作成・置換・削除、Budgets/Cognito/KMS/VPC/WAFの変更は含まない。コードassetは既存の配備先へ新キーで保存し、旧コードを復旧用に保持する。

## 料金試算

追加固定費0円。AWS公式の東京リージョン料金表を2026-10-19に確認し、1 USD=160円・税10%として計算。為替は計算条件であり実勢相場ではない。API/Lambda/S3/ログの無料枠・クレジットは利用しない前提。転送の100GiB無料枠が使える場合と、残りがない場合を分ける。

| 条件（月30日、2端末） | 転送無料枠あり | 転送無料枠なし |
|---|---:|---:|
| 通常：各端末10更新/日、状態50件・catalog53件、移動/復元25回・完全削除5件・保存10回 | 約12.4円/月 | 約13.9円/月 |
| 通常操作をすべて3回試行、Lambda各5秒 | 約45.4円/月 | 約49.8円/月 |
| 多用：各端末60更新/日、状態300件・catalog400件、移動/復元200回・完全削除50件・保存100回 | 約298.4円/月 | 約353.6円/月 |

通常条件はAPI1235回・S3 GET98015回・PUT/LIST4330回、Lambda各2秒、応答64KiBで保守的に試算。状態取得とcatalog更新の双方で全件取得を計上し、catalogも毎回コールド扱い。S3状態/ロックの保存、削除前検査、ログ取込・14日保持、転送を含む。DELETE自体は無料だが、列挙・確認・状態更新は料金対象。

既存資料本体の保存/ダウンロード、既存の整理同期、既存owner1 MAUの認証費は別。既存ownerの追加人数は0、無料枠なしで既存1 MAU分を別途割り当てる場合は約2.64円/月。今回の変更による認証人数の増加はない。合成データだけの一時検証は約2.1円を見込む（100 APIを全て20秒、GET1000・PUT/LIST500などで試算）。これは請求上限ではない。

月100円以内は通常条件では満たす見込みだが、多用条件では超える。資料増加時は更新頻度を落とすか、状態の差分取得/集約indexを別途実装する。自動定期ポーリングは追加しない。予算通知を費用上限として扱わない。

[計算結果](shared-trash-aws-estimate.json)、[単価/SKU/取得日](shared-trash-aws-rates.json)、[再計算スクリプト](../scripts/estimate-shared-trash.py)。公式：[S3料金](https://aws.amazon.com/s3/pricing/)、[API Gateway料金](https://aws.amazon.com/api-gateway/pricing/)、[Lambda料金](https://aws.amazon.com/lambda/pricing/)、[Cognito料金](https://aws.amazon.com/cognito/pricing/)。

## 承認後の適用・確認

1. 適用直前に現設定と差分を再取得。異なる場合は影響を確認する。まずフラグ無効のままコード/限定権限を更新し、保存CLIの保護を有効化する。
2. サーバーを一時有効にして、内容のない検証専用資料1件（新しいUUID、1MB未満）だけをアップロードし、認証・一覧・移動・復元・計画確認・完全削除・再試行を検証する。この合成資料のアップロードと完全削除も今回の承認対象。既存45資料を検証で削除しない。
3. 成功ならサーバー有効を維持し、iOS/Macの機能フラグを有効化・ビルド・既存アプリを更新する。失敗時はフラグ無効へ戻し、結果を報告する。実機の操作は本人と確認する。

今回求める承認は、上記AWS設定/コード更新、一時有効化と合成資料の保存/完全削除、成功後の両アプリ有効化まで。利用者資料の一括削除は含めない。

## 現時点の検証

保存・排他16テスト、viewer31合格/1スキップ、TypeScript型検査、既存日本語SVG/PNG実描画3テスト、Mac27テスト/1スキップ/失敗0、Lambdaローカルbundle作成に合格。ログ：`outputs/shared-trash-readiness/`。iOSの前回68 XCTestと実機更新は完了済み。新APIを使った両実機間の同期とS3削除は承認後に検証する。

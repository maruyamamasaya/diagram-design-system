# S3実保存容量：AWS適用とiOS更新

## Request

料金・構成案を本人が明示承認し、AWS適用/確認成功後iOS反映を指示。

## Investigation

直前のCloudFormationテンプレート/stack/configを取得。前段のゴミ箱有効化後の構成に合わせ、既存parameter値を維持。デバイスVespera/Miraの接続を確認。

## Changes / Files Changed

CloudFormation s3-capacity-20261019：Roleへ固定専用bucketのs3:ListBucketVersionsを追加、FunctionへVIEWER_STORAGE_CAPACITY_ENABLED=true、codeを更新。変更セットはFunction/Integration/RoleのModifyのみ、置換なし。UPDATE_COMPLETE。

Code zip 922,284 bytes、SHA256 aadb6693b3b56ba7332eed886ba5707d0bd2e04759e698c1340c79b4fdf40c71。不変deployments/apiキーへAES256/条件付きPUT、GET/SHA256一致。既存owner/Cognito/同期/ゴミ箱、role ARN、256MB/20秒/runtime/handlerが維持され、適用templateが提案値と完全一致することを確認。bucket設定・他bucket・予算は変更しない。

iOS署名build/codesign成功。Vespera/Miraへcom.example.PresentationViewerを上書きインストール/起動成功。実行ファイルSHA256 78f1a7b30634133934ea01fba0200ac43a093e3612799dfef7e8a1aa2b5432cc。既存資料/設定を削除せず、アンインストールなし。Macアプリは変更しない。

## Validation

- 実本人認証付きHTTPS容量API：593,772,472 bytes / 852版 / 削除マーカー0 / Standardのみ。AWS CLI全版一覧と一致。配備前851版592,850,188 bytesからcode zip1個922,284 bytes分増加。
- 月額保存費目安2.281099円（0.025 USD/GiB月、150円/USD、税10%）。実請求とは区別。
- 未認証401、不正query400。旧一覧先頭20件と次頁有無・lifecycle snapshot・organization bootstrapの基準一致。公開API計11要求（事前4/事後7）、資料書込/削除なし。
- Keychainから既存Mac本人ログインを利用。必要時既存Cognitoで短期accessを更新。token/refreshはログ/ファイルに保存しない。Keychainアクセス完了を確認。
- ローカル前段：viewer35合格/1スキップ、型検査、iOS73 XCTestと最終関連2テスト合格。今回の署名付きdevice build/codesign成功。
- 証跡 outputs/s3-capacity-deployment/（権限制限700/600）、ビルド /private/tmp/zukan-s3-capacity-device-build.log。両repo diff --check合格。

## Result / Remaining Issues

AWS適用・本番認証読取突合・両端末更新/起動完了。iOS実画面の表示/更新ボタン手操作は未確認。未完了multipartは容量対象外。新規/過去資料の変更・削除なし。

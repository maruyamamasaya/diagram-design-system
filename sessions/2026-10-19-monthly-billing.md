# 今月のAWS費用：配賦と取得回数抑制

## Request

API/認証/通信等の今月費用を表示。図鑑と共通費を分け、取得回数を抑え、AWS変更前に追加費用を提示。

## Investigation

現容量APIは保存費の参考額のみ。CE有料APIは各ページ0.01 USD、請求反映は通常24時間以上。2枠をSERVICE/USAGE_TYPEで分け、Project有効化を前提にする。タグ未配賦を図鑑に推定配分しない。他Project/他accountは対象外。バックフィルは全タグ状態に影響するため今回既定案から除外。公式仕様/料金をWebで確認したが、実AWSへのCE照会・変更はしない。

## Changes / Files Changed

viewer monthly-billing.ts/runtime.ts/API/テスト、既存署名ライブラリの直接依存化（新たなパッケージ実体追加なし）、S3固定key/IAM/bucket CASの未適用案、費用再計算スクリプト/JSON/仕様/入口文書。iOS CloudAPI/CloudLibraryView/CloudLibraryTests/README/CURRENT/仕様へ表示とDecimal検証を追加。既存未コミット変更を保持。

共有状態をS3へCAS予約してから2枠各最大2ページ取得、最短7日/31日月最大5取得。失敗/停止/保存失敗でも予約を維持し自動有料再試行なし。月替わりに旧費用を今月と表示せず、部分集計も公開しない。本人認証限定、既定無効、配賦未準備を0円としない。USD元額/円は参考換算で二重税計上しない。

## Validation

- viewer46テスト：45合格/1スキップ/失敗0。配賦/固定account/小数/credit/20並行Lambda/永続予約/失敗/再起動/月替わり/ページ上限/不正応答/固定S3 CAS/署名先/有料自動再試行なし/本人OIDCと他owner拒否をモック検証。型検査成功。
- iPhone17e iOS26.5 arm64 Simulator：74 XCTest成功（新費用API/正確な合計・通信/認証分類・配賦準備/欠落拒否を含む）。最終の表示文言を含む関連テスト結果は追記。
- Lambda bundleローカル作成のみ。約0.9MiBで見積の5MiB以内。
- 両repo diff --check合格。ログ /private/tmp/monthly-billing-all-viewer-tests.log、/private/tmp/zukan-monthly-billing-tests.log、/private/tmp/zukan-monthly-billing-final-tests.log。
- offline試算：通常16.72円/月、多用20.20円/月、再試行/ページ/本文最大例56.84円/月（転送無料枠なし・150円/USD・税10%）。初期約25円の保守見込みを別途提示。

## Result / Remaining Issues

ローカル実装/検証済み。AWS本番・タグ・実機アプリは未変更。追加費用/権限/共有CAS案を本人へ提示し承認待ち。本番CE応答や実機画面の動作は未実証。タグ反映待ちや今月過去分未配賦を明示する。iPadの実画面確認は本人指定を保持し、可能な実機操作経路を適用時に確認する。

最終追記：最終表示文言を含むビルドと月内費用APIの関連1 XCTestも成功。

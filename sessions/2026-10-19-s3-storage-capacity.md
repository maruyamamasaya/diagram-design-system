# S3実保存容量と月額費用

## Request

手入力シミュレータを廃止し、実S3保存容量を取得して月額保存費を表示する。

## Investigation

既存iOS画面は最新版catalog/detailの成果物のみの合計だった。Macには同シミュレータ実装なし。既存の未コミット変更を保持。専用bucketの全版一覧を既存調査profileで読取し、851版/592,850,188 bytes/全件Standard/削除マーカー0を確認。CLIの実読取であり新本番APIの実証ではない。

## Changes / Files Changed

viewer storage-capacity.tsとGET route、限定短期role policy、APIテストを追加。iOS CloudAPI/CloudCapacityView/CloudFiles/CloudLibraryTestsを更新。画面初回取得、手入力廃止、固定参考条件、全版/削除マーカー、60秒cache、部分失敗拒否、履歴領域分離/同一取得日時重複防止。仕様・viewer-api/CODEMAP/TESTING/CURRENT・iOS README/仕様/現在地を更新。AWS適用案とListBucketVersions限定policyを準備。

## Validation

- viewer全36テスト：35合格/1スキップ/失敗0、TypeScript型検査合格。CLIのtsx IPCはsandboxで拒否されたためnode --import tsxで同テスト全件実行。
- iPhone 17e / iOS26.5 arm64 Simulator：73 XCTest合格。初回x86_64共通パッケージ依存解決で失敗、arm64へ合わせて再実行成功。
- 最終履歴重複防止後の関連2テスト結果は末尾へ追記。
- Lambda bundleローカル生成成功、両repoのdiff --check合格。
- ログ /private/tmp/s3-capacity-viewer-tests.log、/private/tmp/zukan-s3-capacity-tests.log、/private/tmp/zukan-s3-capacity-final-tests.log。

## Result / Remaining Issues

ローカル実装完了。AWS権限/コード/フラグ、本番認証GET照合、端末更新、画面目視は未実施。AGENTSのAWS事前料金提示/承認に従い適用待ち。[具体案](../docs/s3-storage-capacity-aws-proposal.md)。未完了multipartは対象外。料金は現容量の1か月保存費目安で実請求ではない。

最終追記：履歴の同取得日時重複防止を含む関連2 XCTestも成功。

本人承認後の本番適用・端末反映は[続きの記録](2026-10-19-s3-storage-capacity-deployment.md)で完了。

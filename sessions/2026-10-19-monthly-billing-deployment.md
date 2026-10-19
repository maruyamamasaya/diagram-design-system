# 今月のAWS費用：配備済み・タグ反映待ち

## Request

本人が料金/構成を承認し、AWS適用・確認成功後iOS反映を指示。実機確認はiPad Miraだけ。

## Changes

2026-10-19 JST、直前の実CloudFormation templateは前回容量API配備と完全一致。専用bucket policyは以前のPrincipal配列順以外一致し、実policyの順序を保持して差分を作成。

- 専用bucket/Lambda/API/Logs/Cognito user poolの5リソースで既存Project=diagram-design-systemを実読取確認。resourceタグの補完不要。
- Projectのコスト配分タグはInactiveだった。本人承認範囲でActiveへ変更。LastUpdatedDate 2026-10-19T05:30:55Z。バックフィルなし。他タグ/他bucket/予算は変更しない。
- 専用bucketのlibrary/billing/monthly.jsonだけをCAS例外へ追加し、同keyの無条件書込をdeny。従来TLS/AES256/他prefix保護を維持。
- 固定keyにschemaVersion/予約UUID/過去のnextRefreshAtだけの初期状態をIfNoneMatch=*、AES256で作成しGET照合。既存keyを上書きしない。初回GetObjectはmissing keyに対するListBucket権限なしでは403になりうるため、配備時の初期化で対処。List権限の拡大はしない。
- CloudFormation monthly-billing-disabled-20261019をFunction/Integration/RoleのModify・Replacement=Falseと確認後実行。UPDATE_COMPLETE。ce:GetCostAndUsageと固定key Get/Putを追加。billing/配賦readyフラグは両方falseのまま。
- コードzip 924,972 bytes、SHA256 dc15794b15a37c7a1fa50600a3254ca8127bdfe81ac8e9d4556ec4dd69356478。既存deployments/apiの不変キーへAES256/条件付きPUT、GET/SHA一致。Lambda CodeSha256一致、既存owner/認証/整理同期/ゴミ箱/容量取得フラグ、Role/Handler/nodejs22/256MB/20秒を維持。

## Validation

- ProjectはActive。ただしCost Explorer GetTagsの2回の確認で図鑑値が空。請求データに反映済みとは扱わず、金額を0円と表示するreadyフラグを設定しない。
- 管理照会はlist-cost-allocation-tags/activation/status/GetTags×2の計5要求。有料金額GetCostAndUsageはまだ0要求。初期の承認枠は管理最大10/初回費用最大4ページで、残りをprogress.jsonへ保存。
- 既存本人ログインをKeychainからメモリ内だけで利用し、配備前の本人identity・catalog先頭20件・lifecycle・organization bootstrapを読取成功（公開API4要求）。反映待ちが確定したため専用待機プロセスを終了。tokenをログ/ファイルへ保存しない。
- iOS device Debug署名build/codesign合格。Bundle com.example.PresentationViewer、実行ファイルSHA256 9231e825a7af73ea8e0d9ebc9d1ad6bae875b7ede7d4ebb97a751ddca93c99d1。Miraへまだインストールしない。Vesperaの実機確認は行わない。
- ローカル前段はviewer45合格/1スキップ、iOS74＋最終関連1テスト、型検査成功。両repo diff --check合格。

## Remaining / 自動継続の承認

請求タグ値の反映後に、Active再確認→既存template差分確認→trueフラグ有効化→本人認証で初回費用/共有cache/未認証拒否/既存機能を確認→成功時だけiOS反映。現在、AWS本番の費用表示・繰返し取得・実機費用画面は未検証。

反映確認を8時間おき最大4回で同チャットへ継続するheartbeatを作成しようとしたが、自動承認レビューが「自動化自体の明示承認がない。将来のAWS有効化・有料照会・iPad更新という継続的副作用がある」と拒否。自動化は作成されていない。これを迂回するshell定期実行等は作成しない。再開の自動化について本人の承認が必要。

証跡・残作業用helper：outputs/monthly-billing-deployment/（directory700/files600）。check-propagation.pyは今後最大4回/管理全体10要求の予算を実行前に記録し、最後のActive確認1要求を予約。deploy-monthly-billing.py/verify-monthly-billing.pyも配置。helperには認証情報を含めない。iOS候補 /private/tmp/zukan-monthly-billing-device-build/Build/Products/Debug-iphoneos/PresentationViewer.app。以降の金額APIリトライや共有予約解除を無断で行わない。

## 自動継続の明示承認と設定

本人が8時間おき・最大4回、反映後のAWS有効化とiPad更新/確認を明示承認。heartbeat aws-ipad をこのチャットへACTIVEで作成。RRULEの8時間間隔/4回終了を保存値で確認し、progress.jsonにもIDと承認を記録。元のCE管理枠10要求/費用最大4ページは維持。成功/失敗/本人操作必要時は通知して停止、未反映の途中経過は静かにする。別の既存S3週次automationは変更しない。実機確認対象はMiraのみ。

## 初回を即時確認

本人指示で初回確認を手動実行。2026-10-19T05:56:30.665164+00:00時点も図鑑タグ値は空。1/4回消化、管理照会6/10要求、有料金額照会0。AWS有効化/iPad更新は行わず、残り3回を8時間おきの自動確認へ変更した。

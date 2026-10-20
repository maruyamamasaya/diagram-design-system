> 2026-10-20：タグ反映後にAWSの2フラグは有効化/UPDATE_COMPLETE。ただし実LambdaコードSHAが承認候補と異なり検証を停止。費用取得・iPad更新は未実施。詳細は[配備記録](../sessions/2026-10-19-monthly-billing-deployment.md)。

# 今月のAWS費用：図鑑と共通・未配賦

2026-10-19。本人承認後、AWSコード/IAM/固定cache keyを無効flagで配備し、Project配賦タグをActiveにした。CEのタグ値反映待ちで、金額照会と実機更新は未実施。[配備記録](../sessions/2026-10-19-monthly-billing-deployment.md)。[承認済み費用と構成案](monthly-billing-aws-proposal.md)。

## 表示と配賦

iOSの既存「S3保存容量と月額費用」へ「今月のAWS費用（請求データ）」を追加。現在容量を1か月保持する保存費目安とは別枠で、月初から取得時点までのAWS計上額UnblendedCostを表示する。期間はAWS請求月（UTC）、終了日は翌日0時の排他的日付。AWS側の反映は通常24時間以上遅れうる。取得日・対象期間・暫定額フラグを表示し、確定請求/リアルタイム金額と扱わない。

- 図鑑（配賦確認分）：固定アカウント676643701781でProject=diagram-design-systemと確認できた明細のみ。
- 共通・未配賦：同アカウントでProjectタグのない明細。図鑑の過去未配賦分や他用途も含み、全額が図鑑の負担とは扱わない。
- 他のProject値がある費用は両枠から除外。他AWSアカウントもLINKED_ACCOUNTフィルターで除外。アカウント全請求額とは一致するとは限らない。

CEは各枠をSERVICE＋USAGE_TYPEで照会し、明細を省略せず返す。iOSはAPI/リクエスト・認証・通信・実行・ログ/監視・保存/S3その他・その他/調整へ見出し整理し、展開すると元のservice/usageTypeを確認できる。通信はDataTransfer等の既知usageType/serviceから表示。未知項目はその他として残す。負のcredit/refundを保持。合計は12桁固定小数の整数演算、iOSはDecimalで照合。USDが元データ、JPYは150円/USDでの参考換算。AWSの税/調整を再加算しない。保存費目安との合算もしない。

タグの有効化/反映確認は運用の前提。未確認ならallocationPendingを返し、図鑑を0円と表示しない。有効化前の過去分やタグ非対応項目は共通・未配賦に残りうる。欠けた期間や取得失敗を「費用なし」に変換しない。

## 取得回数の抑制

本人OIDC認証/read scope限定GET /v1/monthly-billing。web/local passwordには公開しない。query指定不可。環境フラグVIEWER_BILLING_ENABLED=trueが必要。VIEWER_BILLING_ALLOCATION_READY=trueは管理者が配賦準備確認後のみ設定する。既定は無効。

専用S3固定キーlibrary/billing/monthly.jsonに全端末で共有するデータと次回取得可能日時を保存。毎回GETで状態を読み、画面の再表示/確認ボタンで有料照会を強制しない。常駐サーバー・EventBridge・定期ポーリングなし。7日経過後の次の閲覧時だけ取得するため、通常は請求反映遅れに加えて最大約7日古いデータを表示する。

有料CE照会より前に、IfNoneMatch/IfMatchで7日先までの取得枠をS3へ予約。競合した別Lambdaは共有結果を読むだけ。成功後、同じ予約ETagで完成レポートをCAS保存する。SDK/HTTPの有料CE自動リトライなし。失敗・停止・保存失敗でも予約を解除せず、7日以内の再照会を防ぐ。データなしの処理中/失敗はpendingとして次回日時を表示。同月の前回結果は取得日時付きで維持する。月替わりでも予約をリセットせず、旧月を今月として表示しない。月初は最大7日ほど今月未取得になる場合がある。

1回の取得で図鑑と共通の2照会。各最大2ページ、計最大4有料リクエスト。31日月でも取得開始は最大5回、計最大20CEリクエスト。上限超過/循環/不正値/異なる期間や通貨/通信失敗では部分集計を公開しない。手動で共有状態を削除/改変、予約の強制解除、複数キーへの分割、別ツールでの直接CE照会を行うとこの枠外になる。料金上限の保証ではない。

CE通信全体9秒、各S3通信2.5秒の中断。上流本文は2MiB以下、共有状態は256KiB以下、各枠5000明細以下。それを超える場合も部分表示しない。S3書込は専用key限定/AES256/TLS/条件付き書込。資料catalogには掲載しない。認証情報を端末や応答へ含めない。

## 入口と検証

viewer/src/lib/monthly-billing.ts（配賦・金額・予約・共有）、monthly-billing-runtime.ts（固定S3/CE署名・フラグ）、api.ts（本人認可）、viewer/tests/monthly-billing.test.ts。SigV4は既存SDKが利用する@smithy/signature-v4 5.7.4を直接依存へ追加、CE専用SDK/課金サービスは新設しない。

iOSは隣接zukanのCloudAPI.swift（専用取得・Decimal/合計/期間検査）、CloudLibraryView.swift（費用内訳）。Mockには偽の請求データを追加せず未対応を返す。本番では画面初回と「請求データを確認」で共有結果を読む。取得失敗時は同画面の前回値を保持。

ローカルテストの結果と未実施範囲は[sessions](../sessions/2026-10-19-monthly-billing.md)。本番の有料金額照会と実機画面は未実施。タグActiveとCE側の値がまだ空であることは実読取確認済み。

公式：[CE料金](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/pricing/)、[照会/グループ化](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html)、[反映頻度](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html)、[配賦タグ](https://docs.aws.amazon.com/us_en/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html)。

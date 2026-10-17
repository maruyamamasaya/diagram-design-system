# AWS向け整理同期API：TypeScriptローカル実装

2026-10-18。**ローカル実装と合成データ検証のみ**。AWS・IAM・API Gateway・Cognito設定・S3・既存データ・実端末は変更しない。AWSへのSDK要求や課金API照会は行わない。[構成/料金案](organization-sync-aws-plan.md)、[Swift同期仕様](organization-sync-local.md)、[回数制限](organization-sync-quota.md)、[無変更/失敗待機](organization-sync-efficiency.md)。

## 構成と有効化の境界

viewer/src/lib/organization/model.tsがSwift Codableと同じJSONの状態遷移を実装し、service.tsが認証済みownerとの照合/固定libraryID/容量上限/CASを担当する。S3OrganizationStoreは既存SDKのGetObject/PutObjectだけを使う保存アダプター。クライアント・保存先は明示注入であり、既定のAWSクライアント生成・認証情報探索・空状態の自動作成はない。

api.tsのorganizationルートは依存サービスを明示注入し、かつOIDCモードの場合だけ利用できる。LambdaのcreateHandler(dependencies)にも同じ注入点を設けた。**現在のexport handlerは注入なしのため同期404のまま**。配備物を作成/送信したり環境変数を変更したりしない。テストのMemoryOrganizationStoreは初期化を明示して使い、欠損した保存状態を空として復旧しない。

実AWSへ接続する工程では、承認済み設定からS3 client（SDK内部再試行はmaxAttempts:1としCAS再試行との多重化を避ける）と固定owner/issuer/libraryIDを組み立て、OrganizationServiceをcreateHandlerへ渡す必要がある。この組立・有効化は今回行わない。資料の既存読取ルートと権限は維持する。

## 認証とHTTP契約

- JWT署名/JWKS・Cognito issuer・access token種別・期限・owner subは既存oidcPrincipalで検証する。追加scopeはdiagram-library/organization.sync。readだけのtokenは同期不可、既存閲覧は従来どおりreadを要求する。
- iOS clientは既存VIEWER_OIDC_CLIENT_ID、追加Mac clientは明示列挙のVIEWER_OIDC_ADDITIONAL_CLIENT_IDS（カンマ区切り、未設定なら追加なし）。任意の同じPool clientを認めない。実設定は変更しない。
- GET /v1/organization/bootstrapは固定libraryID、プロトコル版、5回/3600秒、1バッチ50操作を返す。
- POST /v1/organization/syncはSwiftのLimitedSyncRequestと同じaction=begin/sync/finish。ライブラリは固定UUID、保存先は認証済みissuer/subからサーバーが導出する。本文のsubject/任意キー/余分なフィールドを認めない。
- 保存キーはlibrary/organization/v1/SHA256(issuer + 改行 + sub)/state.json。S3 ETagは排他用の不透明な値、整理revisionは同期版として分離する。資料/catalog/旧ゴミ箱キーへ書き込めない。
- 本文はストリーム読取でも256 KiB以下、50操作、状態16 MiB、snapshot1 MiB、応答2 MiBを超えれば停止する。メンバーは許可したURLなし管理メタデータだけ。フォルダのローカル画像パスやURL等の余分なフィールドを送らない。HTTP入力のサイズ/型検査はSwiftの汎用500操作authorityより厳しい入口制約。

Swiftの[HTTPS/PKCE/分割送信](organization-sync-https.md)をローカル実装・検証した。本番の設定組立と有効化は未実施。今回の実HTTP検証は一時loopback bridgeがローカルの署名tokenを付けて、本物のhandle/createHandlerと同じ認証経路を呼ぶ。署名鍵/JWKS/owner/保存データはテスト内だけで生成する。

## 同期の意味論と原子性

wireのUUIDはSwiftの大文字表現、日付はJSONEncoder既定の2001-01-01 UTCからの秒数、enumはSwift Codableの`{case:{_0:value}}`形式を維持する。JavaScriptのUnixミリ秒とは区別し、サーバー時計を変換する。

expectedRevisionで同項目の競合を返し、別項目を統合する。同じ値の提案は版が古くても受理する。操作IDとpayloadをreceiptへ保存し、同じ操作は同じ結果、異なるpayloadでのID流用は400。無効な操作はinvalid receipt、競合はconflict receipt。削除はtombstone、親フォルダ削除では子孫/所属/順序も同じrevisionで更新し、古い端末によるフォルダ/まとめの復活を拒否する。

利用者単位の5回/直近1時間、10分の受付、5分の追加challenge、12要求ID×各3送信はSwiftと同じ。予約UUIDの再送は回数を増やさない。追加は同じattempt専用challengeを確認後に送る契約で、恒久解除なし。サーバーが物理クリック自体を証明するものではない。台帳は永続状態に入り、Lambdaインスタンスのメモリーカウンターに依存しない。

無変更は、空操作かつknownRevision一致のときunchangedRevisionだけを返す。更新/競合/削除/古い版には全snapshotを返す。台帳更新で整理revisionを増やさない。状態/receipt/要求予算/回数台帳を同一JSONへまとめ、S3はGETで得たETagのIf-Match PUTで**一度に確定**する。SDKコマンドはExpectedBucketOwnerとAES256を指定し、List/Delete/無条件PUTを持たない。[AWS条件付き書込の仕様](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html)。

412/409なら最新状態を再読込し、同じ操作IDで最大3試行。間隔は50/100ms＋jitter。競合が続けば503＋Retry-After:30を返し、Swiftの永続待機へ渡す。PUT後の応答喪失もreceiptで再送重複を防ぐ。複数操作中のID流用は適用前に検査し、状態を部分適用しない。形式上有効な要求の操作エラーでも、その通信の要求予算は保存する。保存欠損/破損/容量超過は503で停止し、空データで上書きしない。

今回S3へ書いていないため、実際のS3競合/実Lambdaの時間・料金を検証したものではない。現行の料金モデルは変更データにGET/PUTを各2回計上するため、今回の1回確定より保守的なまま保持する。実配備前はログ/最大状態CPU/SDK再試行設定を測り直して再見積もりする。

## 検証と再現

```sh
# Node.js 22以上とローカルSwiftが必要。AWS認証不要。
npm --prefix viewer run test:organization
# viewer全体の回帰（共通照合も実行する場合はビルド済みbinaryを明示）
ORGANIZATION_SWIFT_BINARY="$PWD/packages/LibraryOrganization/.build/debug/OrganizationSyncMock" npm --prefix viewer test
npm --prefix viewer run typecheck
npm --prefix viewer run build
```

5ファイル・75ステップの共通JSON fixtureをSwift executableとTypeScriptで実行し、各応答/receipt/状態/revision/エラー/回数/時刻を比較する。生成challengeのランダムUUIDだけ比較時に記号化し、各実装のchallengeをその実装の後続要求へ渡す。別attempt流用/期限切れ/再利用も含み、challengeの有無は比較する。両実装とも各ステップの永続データをJSONで再読込する。

対象はフォルダ/所属/グループ/タグ/まとめ/順序、同値再送、別項目の統合、同項目競合、親循環拒否、親/子/所属/順序の削除、まとめ削除と復活拒否、古い版/full/無変更/削除後取得、5枠/追加同意/移動窓境界/期限/要求予算/操作ID流用。共有fixtureは有限の照合範囲であり、全Unicode/全入力の数学的同値保証ではない。HTTP入口のより厳しい入力拒否はTypeScript専用テストで確認する。

APIテストは複数サービスインスタンスから10同時受付の5許可、同項目/別項目編集、親削除と古い子編集の競合、PUT後の応答喪失、CAS再試行上限、欠損/破損/容量/認可/不正入力、Lambda base64 envelope、無効化された既定ルート、S3コマンドのキー/条件/暗号化を検証する。S3 SDKのsendは差し替えて実ネットワークを使わない。

一時loopbackではSwiftのSyncLabSessionから24 HTTP（受付9・データ9・終了6相当）を送り、JWT/scope/owner検査、初回統合/5回上限/再起動/追加1回/ACK喪失と再送/5回の小さな無変更応答を確認する。Swift側の一時データは終了時削除、サーバーは終了時close、メモリー状態は破棄する。実端末/GUIの操作は今回行わない。

最終検証：API10グループ（既存込みviewer24）・共有Swift32・75ステップ相互照合・型検査/Nextビルド合格。追加の既存生成回帰では日本語SVG実描画/保存モックは合格したが、既存プレゼン2ファイルが待機したため約3分で専用プロセスを停止し、全体回帰は未完了。同期APIの不合格とは混同しない。[記録](../sessions/2026-10-18-organization-api-local.md)。

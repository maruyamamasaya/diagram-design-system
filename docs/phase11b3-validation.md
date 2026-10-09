# Phase 11B-3：本人登録・実機接続

2026-10-10。新しいAWSサービスは追加せず、Phase 11B-2の構成を利用する。実パラメーターは[構成記録](../infra/phase11b2-deployment.json)。

## 読取確認

Cognito pool ap-northeast-1_qKFdR57RY は管理者登録限定、メールをユーザー名に利用。パスワードは14文字以上・大小英字・数字・記号。public client 56ai6vn12eq9j6bof1hpvrv5g9 はcode flow、openid/diagram-library/read、callback presentationviewer://oauth/callback、access token5分、revocation有効。iOSはPKCE S256とstate検査を実装済み。

S3のBlockPublicAcls／IgnorePublicAcls／BlockPublicPolicy／RestrictPublicBucketsは実AWS読取で全てtrue。APIの認可はJWT署名・issuer・client・access scopeの検査後、subとOwnerSubjectの一致を要求する。IAMを本人へ直接付与せず、サーバー実行ロールで署名URLを発行する。本人ユーザーだけを登録済み。OwnerSubjectを本人subへ更新済み（CloudFormation UPDATE_COMPLETE、Lambda LastUpdateStatus Successful）。

## 本人操作

1. この作業に利用するメールを本人が指定する。パスワード・認証コードはチャットへ送らない。
2. 管理者が本人だけをSUPPRESSで登録し、本人の明示承認後にCognitoの招待メールを送信。仮パスワードは本人だけがメールとログイン画面で扱う。メール確認を未実施のまま確認済みと扱わない。
3. 作成後、エージェントがユーザー属性のsubと状態のみを読み取り、CloudFormationのOwnerSubjectだけをそのsubへ更新する。他のパラメーターはUsePreviousValueで保持し、CursorSecretを読取・記録・再生成しない。
4. iPhone Vesperaを本人がロック解除。アプリのその他→接続設定で本番APIへ切替、ログイン画面で本人が入力し、初回パスワード変更を完了する。トークンはアプリのKeychainのみへ保存する。
5. 一覧／タイトル・タグ検索／詳細からPDF・PNG・PPTXをそれぞれ取得し閲覧。ダウンロード時のSHA256検査成功と保存済み表示を確認する。
6. 機内モードに加えWi-Fiも無効にし、保存済み資料3形式を開く。未取得資料は取得できないことを確認。通信を戻しログアウトを確認する。

## 結果

- 登録前は実Cognitoユーザー0件。本人だけを登録・招待し、owner限定更新完了。本人による初回パスワード変更後、AWS読取でCONFIRMED／Enabled=trueを確認。
- 実HTTPS /v1/meと/v1/diagramsは未認証401。
- iPhone Vesperaのアプリ起動成功。本人から本番Cognitoログイン成功・資料一覧表示成功の報告を受領。iOSログインはトークン交換後の/v1/me成功を必要とするため、認証・owner認可を通過したことを実装と照合。
- 本人報告でPDF/PNG/PPTXのダウンロード・表示・保存成功。実装は取得したbytesのサイズとSHA256を照合してから表示／永続保存するため、この経路で整合性検査を通過。署名URLやトークンを抽出せず確認した。
- 本人報告で機内モード＋Wi-Fi無効の状態でも保存済みPDF/PNG/PPTXを開き直して閲覧成功。Phase 11B-3の全完了条件を満たす（実機操作は本人報告、AWS状態は読取確認）。

パスワード、token、署名URLの値は取得・記録しない。実機操作結果は本人報告とAWS読取を区別する。全体テストは再実行しない。

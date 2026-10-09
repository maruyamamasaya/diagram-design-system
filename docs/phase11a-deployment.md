# Phase 11A：HTTPS公開・認証の設計（未適用）

2026-10-09。ローカル実装は [検証記録](phase11a-validation.md)。外部公開、IAM変更、認証サービス作成は今回行っていない。

## 候補と費用

|候補|認証・AWSアクセス|費用と適用条件|
|---|---|---|
|現行ローカルNext.js|ループバック限定パスワード＋CSRF／短期ロールに読取専用session policy|ホスティング費なし。公開不可|
|Vercel Hobby＋Cognito|Web OIDC code/PKCE、AWSアクセスはVercel OIDCで短期の専用読取ロール|個人・非商用の適格用途はHosting無料。上限超過時の停止と外部サービス費に注意|
|Amplify Hosting＋Cognito|Next.js SSR、専用実行ロールで非公開S3読取|従量課金。ビルド回数・SSR時間・転送量を管理する|

個人利用ならHobbyの利用条件を確認して第2案を優先検討する。AWS内で運用を統一したい場合は第3案。いずれも常時稼働EC2、ALB、NAT、WAF、独自KMSキーを追加しない。

概算は無料枠を控除せず、既存コスト方針の参考為替176円/USD、税別。Amplifyの料金例はビルド0.01 USD/分、転送0.15 USD/GB、保存0.023 USD/GB月、SSR 0.30 USD/100万回＋0.20 USD/GB時。月6分ビルド、0.1 GB転送、0.02 GB保存、SSR 1,000回×0.2秒×1 GBなら約0.087 USD（約15円）＋S3。月60分ビルド、1 GB転送、0.1 GB保存、SSR 10,000回×同条件なら約0.866 USD（約152円）となり目標超過。料金はリージョン・実測・税・為替で再評価する。

Cognitoの直接／ソーシャルログインは対象となる料金区分の無料MAU枠を確認する。SMS、メール、外部IdP、上位機能は別費用になり得る。最初は利用者1名、自己登録停止、SMS不要の方式を選ぶ。100円は運用目標であり予算通知は支出停止を保証しない。

公式根拠：[Vercel Hobby](https://vercel.com/docs/plans/hobby)、[AWS OIDC連携](https://vercel.com/docs/oidc/aws)、[Amplify料金](https://aws.amazon.com/amplify/pricing/)、[Cognito料金](https://aws.amazon.com/cognito/pricing/)。

## 公開前の必須作業

1. 固定HTTPS originと完全一致のredirect URIを決め、Cognito等のOIDC Authorization Code＋PKCE S256、state、nonceを実装する。WebはBFFのHttpOnly/Secure/SameSite cookie＋CSRFを使う。ローカルパスワード交換APIを公開しない。
2. JWKS署名、許可アルゴリズム、issuer、期限、token_use、access tokenのclient_idとscopeを検証する。ID tokenのaudとaccess tokenのclient_idを混同しない。issuer＋subjectのowner allowlistによる認可を毎回実施する。
3. 現行のメモリ内session・失効・レート制限を公開環境に適した方式へ変更し、複数インスタンス／再起動を検証する。秘密値はサーバー設定のみ、トークンと署名URLはログ禁止。
4. uploaderと分離した専用読取IAMロールを作り、runtime federationのaud/sub・project・環境を限定する。認証済みユーザーのOIDCとAWS実行主体のOIDCは別の責務として扱う。
5. Web・iOSは共通 `/v1/diagrams` APIを使う。iOSは別public clientのPKCEとKeychainを使う方針。今回iOSリポジトリは変更しない。
6. 公開前に未認証・他subject・期限切れ・CSRF・任意キー・callback改ざん・失効を検証し、具体的構成／料金／アクセス制御についてユーザー承認を得る。

JWT／PKCEの根拠：[Cognito JWT検証](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)、[Authorization endpoint](https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html)。

## 承認対象となるAWS変更

Cognito User Pool・Web client・将来のiOS client、専用読取IAMロールと必要なfederation trust、選択したHosting設定。Amplifyの場合はSSR実行権限とログ保持期間も提示する。S3の公開アクセスブロック・暗号化・既存3バケットは変更しない。現行のimg／PDF iframe／attachment取得にはCORS変更不要。JSからS3をfetchする機能を追加する場合だけ限定CORSを別途検討する。

署名URLは300秒のBearer相当で、発行後はログアウトしてもS3側で即時失効しない。PPTXはPNGで内容をプレビューし、編集はダウンロード後の対応アプリで行う。PDF表示はブラウザ内蔵ビューアーに依存し別タブ取得を併設する。

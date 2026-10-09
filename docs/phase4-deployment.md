# Phase 4：公開候補と100円コスト設計

2026-10-09時点。今回の公開・AWS追加は行わない。認証と認可を省略して費用を下げない。

## 候補
|構成|固定費・従量費|判断|
|ローカルNext.js＋既存非公開S3|Webホスティング追加費なし。S3容量・操作・転送のみ|今回実装。別PCからの利用には未対応|
|Vercel Hobby＋OIDC認証＋短期AWS権限|Hobbyは無料、利用制限あり。個人・非商用限定|純粋な個人利用なら候補。会社業務用途は適合性を確認。現実装をそのまま公開できない|
|Amplify Hosting＋Cognito|基本月額最低額なし。ビルド、CDN保存・転送、SSR従量|無料枠を前提にしない。頻繁なビルドでは100円を超える|
|静的フロント＋オンデマンドLambda/API＋Cognito|サービス別従量、無料枠は共有・条件付き|公開時にNext.js構成の分離・地域料金の再見積もりが必要|

[Vercel Hobby条件](https://vercel.com/docs/plans/hobby)。AWS権限は[OIDC連携](https://vercel.com/docs/oidc/aws)等の短期権限を使用し、長期キーを環境変数へ埋め込まない。

認証はローカルパスワードに追加費用なし。公開候補Cognito Lite/Essentialsの直接・ソーシャル認証は10,000 MAU無料枠があるが、利用資格・組織共有・メール/SMS費用を確認する。公開版は招待した単一ユーザーをallowlistで認可し、OIDC authorization code + PKCEを使用。WebはBFFのSecure cookie、iOSはPKCE/Keychainと共通API Bearer。公開OIDC連携は今回未実装。[Cognito料金](https://aws.amazon.com/cognito/pricing/)

## 再現可能な試算
既存cost-policyの100図・PNG閲覧1,000回・SVGダウンロード100回・160円/USD・税係数1.10を継承。転送無料枠の残量がある場合のS3約6.40円に、catalog再取得100回×100版のGET10,000回＋LIST100回を保守的に加算： (10000/1000×0.00037 + 100/1000×0.0047)×160×1.10 = 0.734円。合計約7.13円/月。無料転送枠なしでは約37円。頻繁なcatalog更新・版蓄積・大容量SVG取得は増加要因。

Amplify無料枠なしの例：月60分ビルド、配信1GB、保存0.1GB、SSR10,000回、1GBメモリ×0.2秒/回。

- ビルド：60×0.01 = 0.60 USD
- 配信：1×0.15 = 0.15 USD、保存：0.1×0.023 = 0.0023 USD
- SSR回数：10000/1000000×0.30 = 0.003 USD
- SSR時間：10000×0.2/3600×1×0.20 = 0.111111 USD
- Web計0.866411 USD×176 = 約152.49円、S3約7.13円を加えて約159.62円/月。

同条件でビルド6分なら約64.58円/月。ただしSSR実測、配信量、認証・ログ等により変動し、上限保証ではない。無料枠の適用可否は未確認。[Amplify料金](https://aws.amazon.com/amplify/pricing/)

100円超過原因は主にビルド回数とSVG転送。代替は公開更新頻度削減、PNG既定表示、catalogキャッシュ、純粋な個人用途なら無料ホストの制限内運用。公開前に実測して再見積もりする。

EC2/NAT/ALB/WAF/独自KMS/PrivateLink/VPC Endpointは追加しない。Lambdaに不要なVPC接続・Provisioned Concurrencyを付けない。CloudWatch Logsは公開構築時14日保持を明示設定。既存予算は変更せず、0.50 USD・50/80/100%通知案は別承認。URL・認証情報をログに残さない。

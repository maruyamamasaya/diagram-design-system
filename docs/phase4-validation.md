# Phase 4：ローカルWebビューアー検証

検証日：2026-10-09。Next.js + TypeScriptをviewer/へ分離。既存生成・アップロードCLIの実装は変更していない。

## 実装と変更ファイル
viewer/src/app/：一覧・詳細・API、viewer/src/components/：16:9ズームキャンバス、viewer/src/lib/：認証・認可・S3読取・署名URL。viewer/config/tags.json：既存v1メタデータを変更せず付けるサーバー側タグ。viewer/tests/：API試験、viewer/scripts/：初期化・ブラウザ検証。README、AGENTS、viewer-api、cost-policy、.gitignoreを更新。

白背景・黒とグレー、細い境界線、丸みのあるカード、広い余白で統一。一覧はPNG、詳細もPNGを既定とし、SVGは明示操作でimgとして表示する。HTMLへのSVG挿入はしない。

## 結果
- 既存Phase 2・3テスト：11/11合格。
- ビューアーAPIテスト：5/5合格。未認証、別origin、CSRF、期限切れ・別subject、任意キー、偽cursor、失効、レート制限を検査。
- TypeScript型検査と本番ビルド：合格。
- Chrome実ブラウザ：mock / s3それぞれ7検証群合格、コンソールエラーなし。検索・絞込・ズーム・全画面・PNG/SVGダウンロードとSHA256照合・SVG表示・ログアウト拒否・モバイル縦横表示とピンチを確認。
- S3は既存専用ロールへ読み取り専用のSTSセッションポリシーを追加して使用。実S3からメタデータ取得と署名付きGETに成功。AWSリソースの作成・変更・削除・アップロードは実施していない。

証跡：outputs/phase4-validation/browser-mock.json、browser-s3.json、desktop-list.png、desktop-detail.png、iphone-portrait.png、iphone-landscape.png。画像・取得物はGit対象外。

## 認証
ランダムなローカルパスワードをscryptで検証。WebはHttpOnly / SameSite=Strictの8時間セッションとCSRFトークン、共通APIは15分Bearerとサーバー側セッション生存確認。ログイン5回/分、API120回/分。単一ownerを毎回認可。署名URLは300秒。S3署名URLはログアウト後も期限までは有効。

本認証はループバック限定。HTTPのローカル開発時のみSecure cookieを使用しない。外部公開環境では起動を拒否する。公開時はHTTPS・OIDC/PKCE・Secure cookie・複数インスタンス対応セッションとレート制御を別途実装する。

## 残課題
実iPhone/Safariおよび別PCからの閲覧は未検証。モバイル試験はChromeの390×844/844×390エミュレーション。ホスティング・Cognito・公開用OIDC・iOSアプリは未実装。v1のSVG/PNGが対象であり、設計中のv2パッケージ、PDF/PPTX/WebP対応・移行は未実装。タグは設定ファイルで管理し再起動で反映。catalogは60秒キャッシュ、500完了版までの小規模構成。大きなSVGは約13MBあるため大量閲覧時はPNGを優先する。

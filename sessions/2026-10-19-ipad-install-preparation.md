# iPad実機インストールの準備

- Request：iPadへのインストールと実機確認。端末に開発者ツール未導入の可能性あり。
- Investigation：devicectl/xctraceの接続一覧に実iPadなし。USB接続・ロック解除・信頼確認を本人へ依頼。
- Changes：アプリソース変更なし。既存Team・Bundle IDで署名付きgeneric iOS buildを作成。
- Files Changed：この作業記録のみ。
- Validation：/tmp/zukan-ipad-signed-build.logのBUILD SUCCEEDED、codesign verify合格、UIDeviceFamilyは1/2。
- Result：インストール用アプリ準備完了。対象iPadは接続待ちで、インストール／起動／実機操作は未実施。
- Remaining Issues：接続後に対象端末・Developer Mode・プロビジョニングを照合し必要に応じて端末指定で再署名する。開発者モードの切替・再起動と信頼操作は本人が端末上で実施。

## 実iPad接続後

本人の信頼操作後、Mira（iPad Pro 12.9インチ第4世代、iPadOS26.6.1）を検出。devicectl manage pair成功、有線paired/tunnel接続を確認。Developer Modeはdisabledで、本人へ設定の有効化・再起動・再確認・ロック解除を依頼。インストールと起動はまだ未実施。

## インストール・起動成功

本人が開発者モードを有効化。enabled/DDI有効/有線pairedを確認し、Mira指定の署名build成功、codesign検証合格、devicectl install成功・同Bundle IDの起動成功。本人が実機本棚表示を確認。初回は既定の同梱サンプルで、本番API利用の切替と本人ログインを案内した。本番資料閲覧・回転・保存/オフライン・整理同期は確認待ち。証跡は/tmp/zukan-mira-{build.log,install.json,launch.json,app.json}。process一覧のCONTAINSフィルターはURL型に使えず失敗しており、継続動作の自動検証とは扱わない。

本人確認の続報：本番APIへ切替・同一アカウントでログイン後、実際の資料一覧が表示されたとの回答。資料を開く／ページ送り、縦横回転、端末保存とWi-Fi無効時再表示の確認を依頼した。

# Phase 11B-1：iOSモック統合の現在地

2026-10-09。別リポジトリPresentation-Viewerに共通APIモデル・モック資料一覧／検索／詳細・形式別取得・SHA256照合・キャッシュ／永続保存・保存済みオフライン読取を追加した。既存フォルダと既存表示コンポーネントは維持する。図解生成側の実装・S3保存・Web APIは今回変更しない。

Mac/XcodeのSimulator buildとXCTest19件（既存13＋新規6）が合格。iOS 17.4で一覧、RAG PDF保存／表示、PNG表示、PPTX Quick Look表示を確認。PPTXには日本語の折り返し差がありPDFを案内する。SVG画面・実機の機内モード／再起動・公開HTTPS／OIDC／Keychain・実S3接続は未検証または未実装。

詳細正本はPresentation-Viewerの `docs/cloud-library.md` と `docs/phase11b1-validation.md`。API仕様は本リポジトリの [viewer-api](viewer-api.md)。公開用認証は [Phase 11A公開設計](phase11a-deployment.md)に従う。次は残るiOS画面／実機確認とOIDC・HTTPS連携の実装。今回AWS変更・外部公開・iPhoneへのインストールはしない。

追記：同日、ユーザー指定の既存Apple IDでiPhone「Vespera」へ同Bundle IDの更新インストール・起動が成功。実機向け署名ビルド合格。実機画面／オフライン操作と本番S3接続は未確認。上記の「実機インストールはしない」は当初モック実装時の範囲を示す。

2026-10-10：iOS図解ライブラリをサムネイルカード・PDF直接閲覧・閲覧中保存へ刷新。既存19＋UX2＝21テスト合格、既存iPhoneへの更新と起動成功。正本はPresentation-Viewerのdocs/ux-refresh-validation.md。実機の操作感は確認待ち。

2026-10-10追加：図解ライブラリを初期画面、ローカルを第2タブに変更。iOSのSVG表示を廃止し、PDF/PNG/PPTX直接選択・全画面プレゼンと小さなサイド操作を実装。22テストと実機更新／起動成功。起動一覧は目視済み、サイド操作の手動確認は未確認。iOS側docs/presentation-focus-validation.mdを正本とする。

2026-10-10追加：左右独立のページボタンと広いタッチ領域、プレゼン開始で横／終了で縦へ戻す方向ポリシー、クラウド・ローカルPNGページ送りをiOS側に追加。23テスト・署名build・接続iPhoneへの更新と起動成功。実機の回転と連続ページ送りの手動確認は未実施。詳細はPresentation-Viewer/docs/presentation-focus-validation.md。

2026-10-10再検証：Xcode 26.6、iOS 17.4で23テスト合格。上部検索UIの一覧を目視し、接続iPhone更新・起動成功。SVG除外はユーザー確認で維持。UI操作ツールのタイムアウトにより今回の手動操作／実機画面は未検証。iOS正本はdocs/phase11b-refresh-validation.md。公開API追加案は[設計](phase11b-public-api-plan.md)（未適用）。

Phase 11B-2：公開OIDC API/Lambda、iOS PKCE/Keychain・設定切替・利用者別保存をローカル実装。API9グループ・iOS27テスト合格。実S3署名GETはサーバー読取経路で確認したが、公開API／iOS実S3は承認待ち。[最新証跡](phase11b2-validation.md)。

# S3専用・共通サイドバー版の反映

2026-10-19。本人がMac/iOSへの反映を指示し、実機での確認は本人が後から行うと指定。

- 前段のMac release/iOS署名候補をcodesign検証。実行ファイルが最終ソースより後にビルドされていることも確認。制限環境でiOS署名検査がCSSMERR_TP_NOT_TRUSTEDになったが、通常のmacOS信頼ストアを利用する承認付き実行では合格。
- 旧Macアプリに未保存の編集画面がないことを確認して終了し、`/Applications/Zukan Bookshelf.app`へ反映。実行ファイルSHA256は配布候補と一致：`8722892be88426ce62d8a59c418b9df0d7915d0d268da8b8c197a4eb3d1bd458`。署名検査成功。更新後は起動していない。
- iPhone Vespera / iPad Miraの既存bundle `com.example.PresentationViewer`へ更新インストール成功。保存資料・設定・ローカル原本を削除していない。
- ログは `outputs/s3-unified-iphone-install.log`、`outputs/s3-unified-ipad-install.log`。アプリ起動、ログイン、S3本番突合、手操作確認は本人へ引継ぎ。AWS変更なし。

内容は[共通サイドバー](../docs/unified-bookshelf-sidebar.md)、[S3専用本棚](../docs/s3-only-bookshelf.md)。Mac初回は必要に応じて「本棚を管理」→「S3へログイン・更新」を利用する。

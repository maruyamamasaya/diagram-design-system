# 2040年産業資料：大容量閲覧

- Request: S3保存済みの大容量資料をアプリでも閲覧できるようにする。
- Investigation: viewer/AGENTS、API/コスト/運用・本番記録を確認。manifest.tsの20MB/50MB拒否が原因で、カタログ全走査にも影響する。既存Nativeアプリrepoの指定パスは現在存在せず未読。今回は共通APIの受理処理を修正し、ネイティブアプリの変更は行わない。
- Changes: 保存側のサイズ承認判定を静的importして共用。承認済みファイル集合の完全性（42成果物＋2manifest）も確認。新しい依存なし。既存ID/版・認証・owner認可・非公開・短期URLを維持。
- Files Changed: viewer/src/lib/manifest.ts、viewer/tests/large-presentation.test.ts、viewer/scripts/check-large-presentation.ts、共有limits.cjsの承認オブジェクト数返却、関連正本文書。
- Validation: viewer14件合格、型検査とNext本番ビルド合格、保存関連15件合格。ローカル共通APIの実S3一覧/詳細200、40PNG+PDF/PPTXの署名GET42件とサイズ/SHA256一致。秘密値・署名URLはログに出力しない。Nextビルド・Lambda bundleを準備。git diff --check合格。
- Result: outputs/industry-2040-presentation/build/app-fix/lambda.zip（667,698 bytes、sha256 a29c7698b73a5f92a92c1625d702563fa930aa30cb337c50a2b4388131edcffa）。本番は読取のみ。既存スタックUPDATE_COMPLETE、Lambda nodejs22.x/256MB/20秒/Roleを確認。CodeKeyだけの更新案。
- Remaining Issues: viewer/AGENTSに「公開・IAM変更・有料リソース・予算変更は具体的な料金を示した別承認が必要」とあるため、本番反映の承認待ち。コード更新以外のAWS構成・IAM・owner・環境変数は変更しない。新規固定費なし。0.668MBコード保管の参考費は既存東京S3単価0.025 USD/GB-monthなら0.0000167 USD/月（160円/USD換算で約0.0027円、税別）。実行/通信は既存従量料金、上限保証なし。公式S3/Lambda料金を確認。iPhone実機・本番ログインは未確認。

追記：本人の今回限りの明示承認後、本番反映完了。詳細は[配備記録](2026-10-15-industry-2040-large-viewer-deploy.md)。

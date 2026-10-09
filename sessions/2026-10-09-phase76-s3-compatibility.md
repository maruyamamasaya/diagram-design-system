# Phase 7.6 S3互換性

- Request：PDF/PPTXプレゼンの保存互換性、読取認証、承認済みRAG1件の実送信確認。
- Investigation：MacにAWS CLI/認証/承認設定なし。SDKはCredentialsProviderError。既存CLIは単一4ファイル限定、viewerも旧catalogのみ。
- Changes：専用プレゼン分岐・不変manifest・許可リストを追加。旧catalogの末尾metadata.jsonと新upload-manifest.jsonを分離。安全設定・条件付きPUT・GET照合・保持・再開を維持。読取専用確認スクリプトを追加。
- Files Changed：src/upload/presentation、workflow、s3-storage、upload-cli、scripts/validate-presentation-s3、tests/presentation-upload、保存仕様・CURRENT・CODEMAP・TESTING・OPERATIONS・Phase76記録。生成CLI・viewer変更なし。
- Validation：保存11/11、Phase2実描画3/3。RAG dry-run34個/約105.53 MiB。実認証・接続は未確認、AWS書込なし。
- Result：ローカル互換性対応済み。実AWS確認は認証環境と対象・保存先承認待ち。
- Remaining Issues：実アップロード/全GET照合、viewer新形式連携。既存3バケット・専用設定・AWSリソース変更なし。

追記：ユーザー指示で原資料・元metadata等の送信案を撤回。成果物18＋最小manifest2のみへ変更。1ファイル20 MB以上／合計50 MB以上（10進・閾値含む）をdry-run/実保存で停止。境界・通信前停止を含む12/12合格。RAGは110,246,422 bytesでblocked、AWS書込なし。旧計画は診断として残す。

最終追記：S3はPDF/PPTX/PNG＋最小manifestのみ、RAG計12個/約2.44 MBでdry-run合格。ユーザー指定で3資料のSVG26個を削除、PDF/PPTX/PNGハッシュ不変。SVG不在時の保存を含む13/13合格。生成時metadataは履歴を保持しlocal-retentionに意図的削除を記録。実送信なし。

Mac実接続追記：ユーザーのパスキー認証後、既存専用ロールを短期STSで引受。専用S3安全設定・catalog・既存PNG GET/SHA256一致を確認。ローカルプロファイルのみ追加しAWSリソース不変。RAG12個の実送信承認待ち。

完了追記：ユーザー「いいよ！」で対象・保存先承認。RAG PDF1/PPTX1/PNG8/最小manifest2を専用S3へ保存しcomplete。独立読取で12個/2,440,838 bytesをGETしてSHA256・サイズ・Content-Type・SSE-S3一致。Phase7.6完了、Phase8へ移行可能。原資料・SVG送信なし、AWSリソース設定不変。

# RAG完成版の総括図

- Request：S3のRAG完成版を総括した図解・挿絵とサービスアイコンを制作。
- Source：PythonとAzure RAG基盤の理解、ID 004cd811-e998-434c-a268-1a0b2a5cdb79、版15、56頁。S3から取得済みPDF/PPTXはmanifest SHA256一致。
- Changes：独立一枚図のsvg経路。文書登録・質問応答の二段と共通索引、Python担当、認可・評価・開発運用。Blob任意、再評価任意、文書登録と学習の区別を保持。Azure V24公式アイコン3種、利用条件を2026-10-14確認。
- Deliverable：outputs/0c760f9e-01e1-4510-9319-6c972509b80f/versions/000002。PNG3200×1800、PDF960×540pt、編集用SVG、原文抽出・構成・対応表・検証・ハッシュを保存。
- Validation：期待文字/グリフ/キャンバス境界、PNG正常読取、PDF1頁・埋込フォント、最終PDF再描画の全ラベル/アイコン/矢印/余白を目視。初稿の長いラベルを修正。初期PNGの画像読込待ち不足をPDF再描画で補正。Level1/2。全ファイルSHA256再照合。
- Limits：総括のため計算式・コード・個別学習項目の詳細は元資料参照。学習用構成、実案件未検証。PPTX対象外。生成CLIのPDF寸法をローカル後処理で標準960×540ptに調整。再生成手順はoutputs/rag-summary-build/build.py、job.json、finalize.pyと本記録。システム/原プレゼン/S3は変更なし。

## S3保存
- 本人の「S3にアップロードまでお願い」で送信承認。既存approved設定・専用uploaderロールを使用。
- 一枚図専用許可リストへ適合するよう補足対応記録を制作フォルダーへ分離し、ローカルmetadataを再確定。dry-run合格後にアップロード。
- 同ID・版2のPNG450,667 bytes/PDF1,037,754 bytesを非公開SSE-S3・条件付きPUTで保存。全2件GET/SHA256一致、manifestとcatalog掲載を完了、upload-status=complete。
- viewer/実機の新規一覧表示は未検証。原プレゼンとAWS設定は変更なし。

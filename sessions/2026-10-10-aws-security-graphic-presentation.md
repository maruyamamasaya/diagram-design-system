# AWS・サイバー・AIセキュリティ：グラフィック資料

- Request：添付の調査・学習テーマからプレゼン作成。MD本文・プロンプト作成は対象外。グラフィック指定、完成資料のS3送信は合計50MB以内で明示許可。
- Investigation：AWS公式、NIST、IPA、JPCERT/CC、MITRE、OWASP、公開調査、InjecAgent研究を参照。確認日2026-10-10と公開日・更新日不明を区別。他クラウド事例とAWSへの設計上の応用を区別。
- Changes：outputs/aws-security-graphicに意味情報のみの構成とパッケージ専用登録配置を作成。本文73＋文献22＝95ページ、64出典。指定8構成図・9比較を収録。既存システムの実装・ルールは変更しない。
- Files Changed：outputs/aws-security-graphicの原資料、構成、固定配置、PDF/PPTX/PNG、検証・S3証跡。本作業記録。既存のユーザー変更は保持。
- Validation：全表示文字をPDF/PPTXへ照合、文字境界・重なり、PNG3200×1800・モノクロ、PDF960×540pt、PPTX16:9。全95ページSVG/PNG・PDF・再読込みPPTXを一覧目視。図31/59の矢印と比較38/40を修正。PDFの英字合字ToUnicodeをglyph一致確認後に修復し、描画ストリームが不変であることと文字一致を検証。
- Result：ID 30fa695c-ea8c-48d4-8e8c-1a6c6c90962b / version1。既存承認済み非公開S3へ99オブジェクト、25,626,511 bytes、最大4,642,569 bytesを保存。原資料・SVG・構成・フォント・検証資料は送信せず。条件付きPUT、SSE-S3、GET/SHA256/MIME/サイズを全対象確認、独立GET再確認。実S3を既存ライブラリ読取処理から取得し、95ページ・97成果物のhash一致を確認。
- Remaining Issues：PowerPoint本体、公開OIDC API・端末UIは今回未検証。PPTXはNoto Sans JP非埋込。価格実額、全Region対応、個別環境の防御性能・RTO/RPOの実測保証は対象外。

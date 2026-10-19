# 茶室史一枚図：挿絵改訂
## Request
構成を維持し、画像生成スキルで挿絵を分かりやすくする。
## Investigation
既存原資料を継承。imagegen SKILLを読み内蔵image_genで5場面ストリップを生成。
## Changes
寺院、書院、小座敷、草庵、立礼の画像を切り出して埋込み。本文・見出し・構成を維持。特定建築の復元ではない。
## Files Changed
outputs/tea-room-history-hybrid-work/（原画像、部品、SVG、原資料、プロンプト、組立スクリプト）。
outputs/74b6eff3-db80-499f-8d32-89348330e47e/versions/000004/（最終PNG/PDFとパッケージ）。本記録。
## Validation
Level 1/2。期待ラベル・グリフ・文字境界・デコードはCLI検査。第3版PNGとPDF再描画を目視し、画像の相違、文字保持、余白、欠落なしを確認。第4版は同描画ソースのままレビュー記録と原資料を確定。5回の見直しはsource.md。
## Result
画像生成挿絵を使用したhybrid版。ローカル保存、S3送信なし。前版保持。
## Remaining Issues
生成挿絵は説明用模式図。PDFの挿絵はラスター、文字はSVG由来。PDF寸法は既存CLIの約1200×675ptを継承。

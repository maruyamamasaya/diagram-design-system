# AWSグラフィック版：30枚への統合と制作方針

## Request
白背景・モノクロは土台として扱い、必要な公式アイコンを使う。配色を絞り、薄いスライドを統合して約30枚を基本にする。前の依頼の文献非表示・グラフィック版・50MB以内のS3保存許可を継承。

## Investigation
旧版95枚は本文73枚（章扉等7枚、実質66テーマ）と文献22枚。細かな分割と無彩色強制の解釈が情報密度とサービス識別を弱めていた。公式AWS Architecture Iconsページでプレゼン利用を確認し、2026-07-31版から原色PNGを採用。

## Changes
- 同じIDの改訂2として全66テーマを30枚へ統合。章扉と文献ページを非表示。技術的な条件・留保を残し、根拠はローカルとPPTXノートに保持。
- 制作パッケージ専用の固定2帯・3帯・レビュー配置を登録。本文は概ね11〜13pt、注記10.5pt、最小10pt。後からの自動縮小はなし。
- 公式アイコン38配置。元画像のハッシュとPPTX内画像を照合。白・黒・グレーを土台にアイコンだけ原色。
- 色の正本と入口・関連プロンプトを整合。枚数・密度の所有元はrules/layout.md。既存レンダラーの数値・分割・色トークンは変更していない。

## Files Changed
成果物：outputs/aws-security-compact/。規則：AGENTS.md、rules/design.md、layout.md、presentation.md、export.md。運用：prompts/presentation.md、generate.md、revise.md、docs/presentation-graphic-mode.md、README.md、CURRENT.md。その他の既存変更は保持。

## Validation
原文の全66テーマ対応と重要注記を照合。全30ページの実測で文字境界・重なり合格。PDF/PPTX全表示文字欠落0。PDFのToUnicode補正前後の描画ストリーム同一。PNG3840×2160、PDF960×540pt、PPTX16:9。PPTX文字・図形1169、画像38。最終PDFをPoppler、PPTXをArtifactToolで全30枚再描画し、一覧と2/12/26/30を詳細目視。npm testは37/37合格、文書リンク・空白検査合格。

## Result
ローカルPDF/PPTX/PNG ZIP完成。S3計画：34オブジェクト、18,097,480 bytes、最大5,249,063 bytes。実S3保存と独立再GETで全34オブジェクトのSHA256/MIME/SSE-S3を照合。既存ビューアーのS3読み取りは改訂2・30ページ・32成果物として認識し、全manifestハッシュが一致。詳細は同パッケージs3/upload-status.jsonとlibrary-read-verification.jsonを参照。

## Remaining Issues
PowerPoint本体・投影・端末UIは未確認。PPTX書体は非埋込、線は図形移動へ自動追従しない。専用契約の認定は本資料だけであり、標準CLIのカラー対応機能追加ではない。

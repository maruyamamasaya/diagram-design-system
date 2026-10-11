# 独立一枚図：制作・保存・閲覧

2026-10-10。プレゼン登録エンジンと別のAgent Creation経路。入口は[prompts/illustration](../prompts/illustration.md)。svg / hybrid / imageを制作時に指定・相談し、エージェントが文章を理解しSVGまたはPNGを制作。create:illustration CLIは完成描画ソースの変換・パッケージ化を担当し、自然言語解析や画像生成サービスを自動実行しない。

## ローカル契約

illustration-job-1.0はID・版・title・mode・source・artwork・labels・prompt・assets・reviewを必須とする。source/artwork/assetsはジョブフォルダー内の通常ファイルのみ。SVGはDOM XML解析、禁止要素・イベント・外部参照拒否、キャンバス、期待ラベル、OFLグリフと文字境界を検査。画像経路はPNGデコードと手動文字確認。画像だけの文字照合は自動検証済みとしない。

illustration-package-1.0は原文・再実行用ジョブ・元SVG・中間SVG・PNG・PDF・thumbnail・validationと部品を保存し、metadata.artifactsでSHA256とサイズを記録する。原文と描画ソースをローカル保持。同ID/版の上書き拒否、失敗時は一時フォルダーを除去し完成版を公開しない。修正は新しい版。通常出力はPNGとPDFで、PPTX対象外。PNGはSVG経路で設計寸法の2倍、画像経路は元画像寸法。PDFはSVG経路では文字/図形、imageでは元画像を保持。

## 共通保存・API

upload CLIはillustration-package-1.0を識別し、専用ロード検査から既存の条件付き保存処理へ接続。全ローカルファイルのハッシュ、識別情報、文字レビューを確認。送信許可リストはdiagram.png／diagram.pdfのみ。最小manifestはillustration-s3-1.0、uploadPolicy=png-pdf-v1。catalog・版キーは既存library/diagramsとlibrary/catalogを使用する。原資料・中間SVG・部品・レビュー本文は送信しない。

既存保存先承認と資料送信承認、サイズ上限、SSE-S3、短期認証、条件付きPUT、GETハッシュ照合、保持上限、最後のcatalog公開、失敗再実行を維持。新規AWSリソース・権限変更・予算変更なし。APIは新manifestをtype=illustration/pageCount=1へ正規化しPNG/PDFを提供。既存プレゼンと旧一枚図を変更しない。

## iOS

既存クラウド項目を「プレゼン資料」に変更し、「図解ライブラリ」を追加。type=presentationと旧未分類資料はプレゼン側、新illustrationと旧roadmap/architecture/flowchart/comparisonは図解側。ページ数だけで分類しないため一枚プレゼンを誤分類しない。オンライン・検索結果・保存済みのすべてで同じ分類。既存PDF/画像ビューアーの拡大・移動、SHA256保存、オフライン閲覧を再利用する。

検証結果・実API更新・実機の境界は[sessions](../sessions/2026-10-10-illustration-workflow.md)に記録。

新規図解の未指定サイズは[rules/layout](../rules/layout.md)の横長標準。説明不足は[rules/content](../rules/content.md)に従ってエージェントが補足し、原資料と根拠を区別する。CLIは完成した描画ソースを変換するため、既存成果物の寸法や本文を自動変更しない。

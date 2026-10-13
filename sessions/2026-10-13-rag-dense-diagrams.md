# RAG資料の図解補足と統合

- Request：自然言語中心の既存資料へ密度の高い図解を追加。Embedding内部・対照学習・検索比較、SharePoint業務処理と6技術、Blob保存対象/直接処理比較を欠落・重複を確認して反映。
- Investigation：共通6規則、プレゼン/一枚図の専用経路、関連テンプレートと出力仕様を読取。Microsoft公式仕様、Attention/Sentence-BERT/SimCSEの一次論文を確認。実案件コード・構成は未提供。
- Changes：資料専用の固定レイアウト14種をoutputsに登録し、SVG/PNG/PDFと編集可能なPPTXを生成。39ページ本文へ14図を付録として統合、目次を補足。システム・標準レジストリ・AWS変更なし。
- Files Changed：outputs/rag-python-build/*、outputs/rag-diagrams-build/*、outputs/rag-diagrams/*、outputs/rag-natural/004cd811-e998-434c-a268-1a0b2a5cdb79/versions/000010–000012。最終版000012、53ページ。
- Validation：資料専用スキーマ、グリフ、実測文字境界/重なり、元37教育ページの内容保持、入力対応/矢印関係、53ページのPDF/PPTX文字とSHA256、ネイティブ構造を確認。PDF53/PPTX53再表示画像の全一覧目視、図14個別PNGと図PDF14の一覧を目視。
- Result：53ページPDF/PPTX、単独図14ページPDF、3200×1800 PNG14枚ZIPをローカル納品。100ページへの水増しはせず、本文と関係図の説明目的を分離。
- Remaining Issues：実PowerPoint編集/他端末表示未実施。PPTX書体非埋込み、線の自動追従なし。Artifact Tool再表示は53枚生成後に診断なしexit1、画像全件を正常読取/目視して確認。変換finalizerと合成は正常終了。初期QAはpypdfのページscale後の抽出と並行再描画中の件数検査で失敗し、同寸法の最終PDFページを抽出して再検証成功。未完の旧版は納品しない。

# お食い初め 抱っこと歯固めの説明図

Request: 抱っこ・歯固めにやり方がわかる挿絵。2枚目可。
Investigation: 共通規則と独立一枚図経路。佐野市抱き方一次資料と既存歯固め出典を確認。松戸市PDFは取得失敗し不使用。
Changes: 頭・首とおしりを支えた抱っこ、箸先と石の接触、口へ触れない所作の3画像を組み込みimagegenで生成。文字はSVGで維持。1枚目は版3でページ番号と案内、2枚目は別UUID一枚図。pdfuniteでローカル2ページPDF。
Files Changed: outputs/okuizome-guide-v3/、outputs/okuizome-howto-work/、outputs/okuizome-page1-v3-work/、対応するID別パッケージ。実装変更なし。
Validation: CLIラベル・グリフ・境界・デコード合格。原文・安全・動作・構成を見直し、最終PNGと結合PDF全2枚再描画を目視。PDF2ページ、Cica埋込み確認。
Result: 3200×1800 PNG各1枚と2ページPDF。既存版保持。
Remaining Issues: 2ページbundleはローカル管理、既存単頁パッケージを参照。S3操作なし。

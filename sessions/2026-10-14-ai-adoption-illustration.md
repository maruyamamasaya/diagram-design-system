# AI活用率の更新・一枚図

- Request：提供資料の公開数値を更新し、図解1枚へ整理。
- Investigation：Microsoft Q2 2026公式9/21記事、IPA DX動向2026本文図表3-6と対象条件、OpenAI Enterprise Signals 8/12更新、個人Signals 8/6記事を確認（10/14）。日本24.7%、UAE73.3%へ更新。IPAは企業アンケート・導入/試験/検討中の企業分母と判明。
- Changes：svgによる独立一枚図。人口利用の比較、日本企業の組込み、先進企業のtokens深度を3区画で配置。世界doing比率を補足。古い非仕事比率や対象月不明のWeb比率は一枚要約の対象外、原資料整理記録に理由を保持。
- Files：outputs/e0c54f8d-3c1b-492b-8af7-079a48ef4f38/versions/000001。制作/再生成はoutputs/ai-adoption-20261014-build（build.py、job.json、finalize.py、verify.py）。実装・AWS変更なし。
- Validation：Level1/2。既存CLI期待文字・OFLグリフ・キャンバス境界・正常デコード合格。PNG3200×1800を目視。PDFを960×540ptへローカル調整後1頁再描画目視、全出典・数値・条件・日本語・余白・意図しない重なりなし。フォントType3埋込み確認。metadata全SHA256一致。
- Result：PNG/PDFと再生成用SVG/原資料・確認URL・検証記録をローカル納品。フォント情報はvalidation正本。
- Remaining：国別仕事比率やAI全サービス完全観測を推定していない。詳細項目は一枚に要約。S3送信・別端末は未実施、PPTXはこの経路対象外。

## S3保存
- 本人の「S3に保存しておいて」で今回資料の送信承認。既存approved設定・専用uploader短期認証を使用。dry-run合格後、非公開S3へPNG529,490 bytes/PDF669,058 bytesを条件付きPUT・SSE-S3で保存。
- 全2件をGETしSHA256/サイズ一致。最小manifestとcatalog掲載完了、upload-status=complete。ID e0c54f8d-3c1b-492b-8af7-079a48ef4f38、版1。ローカル成果物保持。AWS設定変更なし。viewer/実機表示は未確認。

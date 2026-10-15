# 2040年産業別図解の説明プレゼン

- Request: 既存7図版を画像のまま保持し、2026年の課題、実現の仕組み、AIと人の分担、仕事の変化、2040年までのロードマップを1資料にまとめる。
- Investigation: 前回図版・元PPTX読取範囲を継承。2026年の経産省・国交省・厚労省・農水省・エネ庁の一次資料等を確認。詳細URLと確認範囲は各ページノートとsource.json。403の範囲・未読箇所をbuild/source-reading.mdへ記録。
- Changes: outputs/industry-2040-presentation内で40ページ作成。12種の資料専用登録テンプレート、意味入力と描画処理を分離。7図は無加工、本文・表はネイティブ。実装・設定は変更なし。
- Files Changed: outputsの成果物・生成元・検証記録、本記録。
- Validation: 原図7点の埋込SHA256一致、40ページPPTX/PDF文字対応、17ページのネイティブ表、40ページノート、構造・境界検査。PPTX再インポート後全40ページを個別目視、修正ページ再確認。PDF全ページ描画と文字検査、2ページ目視。7回の内容/配置改善を記録。
- Result: delivery/に最終PPTX・PDFと全ページPNG。package-manifest.jsonに生成元/依存/成果物ハッシュ。
- Remaining Issues: PPTXはNoto Sans JP非埋込。ネイティブPowerPoint未確認。PPTX20,067,274 bytes、PDF29,640,691 bytesでS3の1ファイル20,000,000 bytesストッパーを超過し保存保留。AWS通信なし。既存図版のS3保存には変更なし。独自ローカル契約であり標準presentation-packageへの互換は主張しない。

追記：本人の資料限定サイズ変更承認後、S3保存/全GET一致が完了。詳細は[保存記録](2026-10-15-industry-2040-s3.md)。

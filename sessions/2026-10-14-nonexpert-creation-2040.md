# 非専門家の制作範囲：2040年の展望

- Request：一人ひとりのできることを増やす議論から、「専門家でなくても作れる」方向を2040年までの図解にする。
- Investigation：Microsoft Power Apps自然言語制作、Adobe Firefly生成機能、OpenAI Enterprise Signalsツール接続、OECD Skills in the AI age、Autodesk生成設計制約の一次情報を確認。URL/日付と確認範囲は成果物source.md。
- Changes：独立svg一枚図。現在/2027〜2032/2033〜2040の3段階、9具体例、仕組み、会話の5条件と人の役割。後段は条件付き仮説で実現時期・普及率を保証しない。既に存在する後段技術の将来初登場を主張しない。
- Files：outputs/33385208-c38a-4cb6-8726-9f04f750ad8d/versions/000001。再生成制作フォルダーoutputs/nonexpert-2040-build（build.py/job.json/finalize.py/verify.py）。
- Validation：Level1/2、期待文字/OFL日本語グリフ/文字境界/PNGデコード合格。PNG3200×1800全体目視、PDF960×540pt・1頁へローカル後処理して再描画目視合格。日本語、数値・年代、条件、矢印、5観点、文字階層、切れ・重なりなし。PDF Type3フォント埋込み、metadata全ハッシュ一致。
- Result：PNG/PDF、編集・再生成用SVG、出典/原資料設計と検証記録をローカル保持。実装変更なし。
- Remaining：将来像は議論用の仮説。資格/専門責任の代替を想定しない。PPTXは一枚図経路対象外。S3は今回未依頼・未送信。別端末表示未確認。最下部注記の余白は標準64より小さいが20pxで可読性/境界確認。

## 挿絵追加・版2
- 本人の挿絵追加要望を受け、3段階へ独自SVG線画を追加。作り手→試作アプリ、作り手→データ/アプリ/検査、作り手→サービス→利用者の説明例。外部素材なし。本文・5条件・シナリオ注記を保持し再配置。
- 同IDのversions/000002へPNG/PDF生成。期待文字/グリフ/境界/PNGデコード合格。PNG全体と最終PDF再描画を目視し、文字と線画の切れ・重なりなし。PDF960×540pt・1頁、Type3埋込み。全ハッシュ照合合格。
- 再生成：outputs/nonexpert-2040-v2-buildのbuild.py/job.json/finalize.py/verify.py。版1保持。実装とS3は変更なし。

## 版2のS3保存
- 本人の「いったんこの内容でS3に上げておいて」で挿絵入り版2の送信承認。既存approved設定・専用uploader短期認証を使用。dry-run合格後、PNG/PDFのみと最小manifestを非公開S3へ条件付きPUT・SSE-S3で保存。
- 全2成果物GET/SHA256一致、catalog掲載、upload-status=completeを確認。ローカル保持。AWS設定変更なし。実機の新規表示は未確認。

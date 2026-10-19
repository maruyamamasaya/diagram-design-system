# 官公庁のしくみ 一枚図
- Request: チャットの解説を分かりやすい一枚図へ。
- Investigation: CURRENT、共通6規則、独立一枚図の入口/仕様、前ターンの官邸・法令資料を使用。
- Changes: 国/地方を並列配置し、選挙・指名・指揮・連携を表示。政治家/公務員を区別、典型的な政策実施の流れと用語定義を下段に統合。
- Files Changed: outputs/government-creation、outputs/86ff7be1-82ef-46b3-bd8a-38a6f8ac05e7/versions/000002。
- Validation: 内容、構成、関係、PNG目視、PDF再描画の5回見直し。CLIのグリフ/期待ラベル/境界/デコード合格。フォント埋込み確認。版1は確認前試作、版2は確認記録を反映。
- Result: PNG3200×1800/PDF1ページ、ローカル納品。SVG主体、Noto Sans JPはGoogle Fonts公式配布、OFLメタデータ確認。AWS操作なし。
- Remaining Issues: 既存CLIのPDFは1200×675.12ptで標準960×540ptとは異なる。PPTX対象外。省庁/司法等を網羅する組織図ではなく行政の概念説明。

## 種類追加の改訂
- Request: 「なんとかしょう」等の種類を同じ1枚へ追加。
- Investigation: 政府広報一覧/行政機構図/デジタル庁、公取委/国税庁/気象庁の公式情報で区分と所属を確認。
- Changes: 国/地方の仕組みを上段へ整理し、中段に11省と主な分野、府/庁/委員会の代表例、下段に地方役所と仕事の流れを統合。庁の例外と公取委の職務独立性を明記。
- Validation: 版3の一覧で列間の近接を確認、版4で法務/財務の説明を簡潔化。版4のPDFを再描画して全文字/収まり/線を目視。内容、構成、区分、PNG、PDFの5段階。最終版5は同じ描画に確認記録を付与。
- Result: outputs/86ff7be1-82ef-46b3-bd8a-38a6f8ac05e7/versions/000005。PNG/PDF。元版保持、AWS操作なし。
- Remaining Issues: 網羅的機構図ではなく主な担当の紹介。PDF寸法とPPTX対象外は前版同様。

## 本人承認後のS3保存
- Authorization: 「これをS3にアップして」。直前の改訂版5のPNG/PDF送信承認。
- Investigation: 保存仕様・metadata/configスキーマ・AWS構成/コスト方針・upload規則を確認。既存承認設定を変更せず使用。
- Validation: dry-run成功。既存CLIで安全preflight、条件付きPUT、全GET/SHA256照合が完了しupload-status=complete。
- Result: 版5のPNG/PDFと最小manifestを専用非公開S3へ保存。原資料/SVG/フォントはローカル保持。AWS構成・IAM・予算の変更なし。
- Remaining Issues: 今回の端末での一覧/閲覧操作は未確認。

# 事事無礙：深掘り一枚図
Request：詳しい一枚図（四法界・インドラの網・誤解）を追加。画像部品＋SVG継承。
Investigation：共通6規則/一枚図仕様再読。澄観『華厳法界玄鏡』巻下のCBETA転載、新纂浄土宗大辞典「相即相入」、SEP §1.3/6を照合。CBETA Onlineは本文取得できず、未読を記録。
Changes：Agent Creation/hybrid。既存の内蔵image_gen挿絵の網だけをSVGで切り出し。四法界・相即相入・三つの誤解を1600×900に整理。原文と補足調査をsource.mdで区別。実装変更なし。
Files Changed：outputs/jiji-muge/creation、outputs/a1f8c805-02b1-429a-a580-d26d07046d27/versions/000001、本記録。
Validation：Level1/2。OFL/グリフ/ラベル/境界/PNGデコード合格。PNG一覧・PDF1枚再描画目視合格。PDF全ラベル抽出一致・フォント埋込み確認。review passed、metadata全ハッシュ更新。
Result：PNG3200×1800、PDF1枚。PDF既存CLI寸法1200×675.12pt。全文出典・入力対応・関係・制作手順を同梱。
Remaining Issues：実端末/印刷未検証。前比較図のS3送信は自動承認レビューが具体的送信承認不足として拒否、本人への承認質問が未回答。新図のS3も未送信。

## S3保存完了
2026-10-12：本人がdiagram-design-system-676643701781-apne1への両図PNG/PDF送信を明示承認。dry-run合格、専用ロールによる実upload complete。非公開安全preflight・条件付き保存・PNG/PDF GET/SHA256一致・catalog掲載完了。送信はPNG/PDFと最小manifestのみ。原資料/部品/描画ソースはローカル保持。AWS設定変更なし。実端末表示未確認。

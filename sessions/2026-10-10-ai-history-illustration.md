# AIの歴史の一枚図

Request：1900年ごろ〜2040年のAI史。追加指定：グラフィカルな挿絵、今後の図解は横長を希望。
Investigation：Dartmouth、IBM、1936/2012/2017原著、DeepMind、OpenAI。1900は前史、1956は研究分野誕生、2030〜2040は展望を明示。
Changes：hybrid、内蔵imagegenの概念挿絵とSVG文字を組合せ。横長16:9へ再配置。
Files Changed：outputs/ai-history/creation、outputs/ee205a94-47c1-4c00-baf7-ad1fadeec1c6/versions/000005、本記録。実装変更なし。
Validation：全グリフ・期待ラベル・境界・デコード合格。PNG/PDF再描画目視、PDF全ラベル照合合格。フォント埋込確認。
Result：PNG3840×2160／PDF1枚、ローカル完成。
Remaining Issues：代表例抜粋。AGI時期不明。別端末・印刷未検証。AWS操作なし。

## 定量データ追加
Request：推移が分かるグラフとデータを追加。
Investigation：Epoch AIの公開CSV、ILSVRC公式2012〜2015、McKinsey 2023〜2025一次調査。
Changes：同ID版8、1920×1080の横長。454モデル学習計算量を散布図・2期間対数回帰、ImageNet誤り4点、利用割合3点、歴史1900〜2040の帯。Matplotlib 3.10.9、既存imagegen挿絵再利用。
Validation：グリフ・境界・全SVGラベルPDF照合、PNG/PDF目視、グラフ数値目視と算術再照合合格。年1.586/4.338倍、誤り78.279%減、利用33pp増。
Result：版000008のPNG/PDF完成。全データ・抽出条件・計算式・出典は原資料、raw CSVと分析スクリプトはoutputs/ai-history/data-creation。
Remaining Issues：計算量は性能指標ではなく推定・選択標本。調査は自己申告・年別標本。グラフはラスター、文字はSVG。将来数値・AGI時期は未確定。外部端末・印刷未検証。AWS操作なし。

## ライブラリ登録
Request：本人「一旦これで登録しておいて」で版8の送信を承認。
Validation：承認済みconfigでdry-run後、専用uploaderロールにより実AWS保存complete。PNG/PDFと最小manifest2コピーの条件付き保存・GET/SHA256一致、catalog掲載。
Result：ee205a94-47c1-4c00-baf7-ad1fadeec1c6、版8を図解ライブラリへ登録。原資料・CSV・SVG・フォントはローカル保持。
Remaining Issues：実機ライブラリ表示は未確認。AWSリソース・権限・予算の変更なし。

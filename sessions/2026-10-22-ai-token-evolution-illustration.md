# AIトークン量の一枚図

## Request
2022年以降の変化、将来、1tokenと100万tokenの量感をわかりやすく一枚にする。

## Investigation
共通6ルール、CURRENT、独立一枚図制作仕様・プロンプト・共通アイコン台帳を読取。OpenAI/Anthropic/Googleの公式資料とEMNLP論文で代表コンテキスト量を照合。公式Cookbookの日本語例も使用。詳細出典は成果物のsource.md。

## Changes / Files Changed
実装変更なし。SVG主体、1600×900、一枚の年表と単位・量感・将来を制作。PNG3200×1800、PDF、再生成ジョブ、原資料、検証とハッシュをoutputs/150a4d56-ad8f-4653-a7b0-31cd1801ebd8/versions/000001へ保存。制作入力・プレビューはoutputs/ai-token-evolution-20261022。

## Validation
Level1/2。CLIのグリフ/期待ラベル/文字境界/PNG正常読取合格。PNGとPDFのPoppler再描画を目視確認、日本語・年・数値・換算・余白に問題なし。PDF1頁、フォント埋込を確認。5回の内容・構図・具体例の改善をsource.mdに記録。Node16とブラウザー未導入の既定経路は失敗したため既存Node22とローカルChromeで描画。システムの変更・依存追加なし。

## Result
全必須事項を収録。代表モデルの年表であって業界最大値推移ではないこと、英語/日本語の違い、日本語10冊は仮定であること、将来は見通しであることを明記。SVG/PDFは既存CLI経路を使用。

## Remaining Issues
端末別印刷は未実施。PDFネイティブ寸法1200×675.12pt（Chromium丸め）を許容、標準960×540ptとの差を記録。S3送信は依頼なしで未実施。

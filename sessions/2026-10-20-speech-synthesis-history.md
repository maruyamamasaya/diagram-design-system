# 生成音声の歴史とQwen3-TTS

## Request
会話内容を資料化。生成音声の歴史から説明し、本人がグラフィック版を選択。

## Investigation / Changes
1791年発声機械、1939年Voder、1978年Speak & Spell、録音接続/HMM、WaveNet/Tacotron 2、話者埋込み/VALL-EからQwen3-TTSへ整理。短い参照・ICL・追加学習、既存録音の整備、Macの能力と未検証、商用サービス比較、公開の事業理由を30ページに構成。既存写真2点のライセンス・由来・ハッシュを保存。制作のみで実装変更なし。

## Files Changed
成果物：outputs/speech-synthesis-history/。制作原本：outputs/speech-history-work/。正式パッケージ：outputs/speech-history-final-v2/b8e65cb0-4fba-4c9c-9ee4-60d62c85b8d3/workflow/000002/attempts/1/b8e65cb0-4fba-4c9c-9ee4-60d62c85b8d3/versions/000002/。

## Validation / Result
登録graphic/v2・Agent Creation Mode、標準Level1+2。PNG/PDF/PPTX各30ページ、スキーマ・グリフ・境界・重なり検査を通過。PDF/PPTXの表示文字欠落0、PDF960×540pt・日本語埋込み。PPTXはネイティブ表9・文字/図形619・写真2。Artifact Toolで最終PPTXを再読込して全30ページ再描画、PDFはPopplerで全30ページ再描画。各一覧と代表詳細を目視。原資料照合・5回以上の具体的改善はreview/improvements.md。SVGは標準フローで除去。公開/S3送信なし。

## Remaining Issues
PowerPoint本体・別端末・実投影は今回未検証。PPTX書体非埋込み（Noto Sans JP/Mono必要）。録音量・区間長は試作案で公式要件ではなく、Mac追加学習は未検証と本文に表示。SonicForge変更・音声再生成・学習なし。

# 線画版を保持し、画像ページを追加

## Request
本人の補足：「画像も欲しい」「これはこのままでページを追加」。線画15頁を維持し、既存の人物イラストを補足として追加する意図。

## Changes
同一IDのversion7。version6の15ページは再描画・再レイアウトせず保持。version5の人物場面4点を「補足」として16〜19頁に追加し、全19頁。追加頁のみ番号・見出しを更新。既存compose.pyとfinalizerでPDF/PPTXを合成。PNG4頁ZIPも作成。基盤・AWS変更なし。

## Validation
先頭15頁のPDF描画ストリーム、PPTXスライドXML、PNGのSHA256がversion6と一致。全19頁のPDF/PPTXを再描画・一覧目視。追加4頁の内容・番号・生成画像注記を確認。検証はvalidation.json、対応はexport-validation/composition.json。

## Result / Remaining Issues
線画15頁＋イラスト4頁を納品。実PowerPointの編集は未実施。PPTX書体は非埋込み。既存版を保持。

# ハルシネーション解説プレゼン

## Request
会話の内容を、AIアルゴリズムからハルシネーションの原因、対策の時系列、評価、残る課題と研究まで、具体例・図解でプレゼン化。

## Investigation
CURRENT・共通6ルール・プレゼン子AGENTS・登録仕様・スキーマ・一括制作/出力契約・Presentationsスキルを確認。公式資料・原論文に基づき、2021〜2025年の主な節目を選択。最新製品の網羅とは区別した。

## Changes / Files Changed
登録済み共通グラフィックと通常v2で34論理スライド/34ページを制作。実装・設定・AWSは変更なし。
制作原本：outputs/hallucination-learning-20261021/。
標準パッケージ：outputs/38943724-7e47-47b6-81d6-216b8a165c16/workflow/000003/attempts/1/38943724-7e47-47b6-81d6-216b8a165c16/versions/000003/。
納品コピー：outputs/hallucination-learning-20261021/deliverables/。

## Validation
7回の具体的な見直しをcreation-record.mdへ記録。QKVと説明用重みの関係、評価の分母と条件、RLHF対推論学習、不確実性の手がかり、推論の限界表現を改善。結論の自動分割を解消。
初期一時フォントがPPTX対応名と不一致で版1は停止。公式Noto Sans JPを取得。版2は結論修正のため自身の生成を停止。版3を最終版とした。
スキーマ・参照・グリフ・境界・重なり・PNG検査、PDF/PPTX構造・再インポートfinalizer合格。PDF34ページ/960×540pt、PPTX34枚・ネイティブ表11・図形687・出典ノート34。PDFはPoppler、PPTXはArtifact Toolで全ページ再描画。全ページ一覧とAttention・評価表・長文評価・結論等の詳細を目視。数値例を再計算。コピー納品物のSHA256一致。
内容/目視reviewをpackageHashに紐づけ、workflow review=passed。内部SVGは一括制作契約に沿って削除。

## Result
PDF・編集可能PPTX・全PNG ZIP・原資料/構成/出典ZIPをローカル生成。S3送信なし。

## Remaining Issues
PPTXフォント非埋込み。Noto Sans JP/Monoが必要。線は独立編集で移動追従しない。実PowerPoint個別編集・別端末・投影は未検証。画像生成や史料転載なし。失敗/中断版は診断用で納品対象外。

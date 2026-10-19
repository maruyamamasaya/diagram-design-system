# AI利用率の前回比と比較可能性

- Request: 前回から何ポイント増減したかを追記し、対象・設問変更は単純比較不可と明示。
- Investigation: 確認済み38観測値と調査条件を再利用。NRC2024/6とPew2026/2の設問、Pew2025の回答方法、MIC2025/2026の年齢、Microsoft2026Q1の期間長変更を区別。
- Changes: 比較可能な18差分をポイントで算出（負の差も表示）。12点は※付きで数値差を非表示。初回8点は差分なし。Microsoftの見出しもQ1→Q2に条件を統一。図1は括弧内に差分、図3はpt。概要・出典・欠測は維持。
- Files Changed: outputs/ai-usage-research/creation-v12 と同資料ID versions/000012。原本・旧版・システム・AWS・viewerは未変更。
- Validation: 3ネイティブグラフ・2表・8枚、finalizer整合性/寸法/書体/Artifact Tool再インポート。全38ラベルをPDFと照合、18差分の算式と12抑制を検査。元値・座標・埋込ワークブックは保持。最終8ページ再描画・一覧目視、変更図を詳細確認。試行で3行ラベルの衝突を検出し、括弧内表示と左右配置へ修正。
- Result: 000012の編集可能PPTX・フォント埋込PDFを納品。
- Remaining Issues: PowerPoint本体の手動編集未検証。PPTXはNoto Sans JPが必要。元値を編集する場合は固定ラベルも更新が必要。

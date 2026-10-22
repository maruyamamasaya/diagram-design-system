# 具体物による説明と、品質・処理効率の制作方針

## Request
今後の資料にも、時系列を保った具体的な説明、実画面・成果物の提示を反映する。ページ単位と全体で、冗長さ・極端な薄さ・反復・正本の二重管理を確認する。必要な高負荷の調査・設計・改善を行い、無駄なトークン消費を減らす。

## Investigation
AGENTS/CURRENT、content/layout/quality、3プロンプト、選択方針、4テンプレート、README、既存制作例の責務を確認。既存の意味保持・密度・Level別検証を維持し、新機能の実装を伴わない制作運用とした。

## Changes
具体物の選定と史実/公式デモ/再現例の区別をrules/contentへ、時系列の維持をrules/layoutへ追加。ページ単位・全体・正本の見直し、改善回数、品質と効率の判断をrules/qualityへ集約。3プロンプトの重複した改善回数の説明を参照へ置換。AGENTS/CURRENTは正本リンクを入口へ追加。既存の未コミット変更を維持。

## Validation
node scripts/verify.cjs docsの最終確認で296文書のリンク先欠落0、git diff --check合格。追加anchorは見出しと手動照合。4テンプレートは意味入力・固有検査を所有し、一般制作方針を複製しないため変更不要。READMEは既存の共通規則リンクを維持。レンダラー/保存契約/旧成果物の変更なし。

## Files Changed
AGENTS.md、CURRENT.md、rules/content.md、rules/layout.md、rules/quality.md、prompts/generate.md、prompts/presentation.md、prompts/revise.md、本記録。各ファイルの既存変更と、他の制作作業の記録は保持した。

## Result / Remaining Issues
今後の制作の正本へ反映済み。既存資料の自動修正や、検証・差分生成機能の追加は行っていない。今回の年代図鑑は別工程で改訂を継続。

# 図解の比率統一
Request：毎回16:9、設計1600×900、PNG3200×1800、PDF同率。スマホ向けだけでは比率を変えない。
Investigation：layout/exportの正本、制作プロンプト、src/rules.cjs、4テンプレート・README・修正プロンプトへの影響を確認。既存数値・既存改訂の比率継承と整合。
Changes：rules/layout.mdへ端末指定だけで比率を変えないことを明記。prompts/generate.mdとillustration.mdに参照付き指示を追加。寸法正本は重複定義しない。
Files Changed：上記3文書、本記録。
Validation：verify docs合格、60文書リンク欠落0、diff check合格。標準トークンは変更せず、実装・過去成果物も変更しない。
Result：今後の制作プロンプトへ反映。
Remaining Issues：画像生成ツールの寸法制約は制作時に確認。過去成果物の一括変換は対象外。

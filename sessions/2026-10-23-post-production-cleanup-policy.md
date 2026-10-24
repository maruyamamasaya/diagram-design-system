# 制作完了時の中間ファイル整理を標準運用にする

- Request：完成版と再生成に必要なものを残し、今後も制作完了後に不要SVG・中間ファイルを整理する運用を明文化。SVGの制作時・成果物での用途を説明。途中の容量質問には削減済み累計約13.7GBと回答。
- Investigation：CURRENT、保存・出力・品質ルール、local-output-cleanup、presentation-export、illustration-workflow、一括workflowのSVG削除契約を確認。engine.cjsのSVG描画からPNG生成、export.cjsのSVG読込・PDF印刷・sceneからPPTX変換、workflow/run.cjsの変換後SVG削除と照合。4テンプレート・2プロンプト・READMEの生成形式と既存例への影響を確認し、生成契約と完成後の保持対象を区別した。
- Changes：整理手順へ音楽史を含む制作・改訂完了時の標準運用と継続的なローカル整理指示を追加。SVG納品指定・素材・一枚図ソース・旧単一図解契約・再生成入力・必須参照は保持。候補や確認画像の証跡、旧版、不変manifest、AWSの既存条件を維持。AGENTSの終了工程、CURRENT、保存/出力/品質ルール、形式変換文書から正本へ接続。CLI自動削除機能の追加とは区別。
- Files Changed：AGENTS.md、CURRENT.md、docs/local-output-cleanup.md、docs/presentation-export.md、rules/storage.md、rules/export.md、rules/quality.md、本記録。
- Validation：npm run verify -- docsのリンク・diff検査に合格。実装・設定・テスト・過去の生成契約と照合。コードや成果物を変更しておらず、描画・形式変換・AWSの再実行は対象外。
- Result：完成と必要な検証の後、再生成入力と完成版を確認して不要中間物を整理することを今後の制作終了工程に設定。SVGは制作中の共通描画・変換に使用し、通常のPDF/PPTX閲覧・編集には外置き内部SVGが不要。削除後の直接export再実行にはSVG再描画が必要と明記。
- Remaining Issues：全CLIへの自動クリーンアップ実装は追加していない。個別契約が現存を要求するファイル、未完成・失敗・用途不明の出力は保持し、理由を報告する。

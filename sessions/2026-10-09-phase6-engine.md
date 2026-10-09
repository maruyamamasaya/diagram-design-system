# 2026-10-09 Phase 6生成エンジン

- Request：登録テンプレート6種、複数SVG/PNG、Linux8ページ、追跡とローカル保存を実装。
- Investigation：Phase 5契約と既存フォント/描画/保存、生成モードを確認。既存AWS/viewer/CLIは維持。
- Changes：実フォント測定、描画、余白/重なり検査、表・項目分割、版衝突拒否、原資料と図解ハッシュ、専用metadata。
- Files Changed：src/presentation、schemas/presentation*、templates/slides、登録表、Linux運用例、README/AGENTSとPhase 6設計・検証。詳細はdocs/phase6-validation.md。
- Validation：ルート18/18とviewer5/5・型検査が合格。一般化したコマンド書式と追加ハッシュ失敗処理は専用試験で確認。SVGの実再描画と8枚目視。自動内容検証とAIレビューを分離。
- Result：outputs/66666666-6666-4666-8666-666666666666/versions/000002に最終8枚と原資料・検証・metadataを保存。失敗版保持、AWS操作なし。
- Remaining Issues：PDF/PPTX/WebP、軽量化、差分更新、大規模解析、プレゼンS3/閲覧APIは未実装。単一項目の超過はAIによる構成修正が必要。

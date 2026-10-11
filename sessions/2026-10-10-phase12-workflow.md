# Phase 12：制作・保存オーケストレーション

- Request：Development Modeで制作から承認済みS3保存・共通API確認まで最小構成で接続。
- Investigation：CURRENT/CODEMAP/ARCHITECTURE、生成・形式変換・保存・API・費用仕様、子AGENTS、既存テストを確認。登録生成・uploadDirectory・catalog APIを再利用できる。
- Changes：create:presentation CLI、入力/原資料の束縛、全形式とSHA256確認、サムネイルHTML、内容/目視証跡、公開資料/保存先承認、試行隔離と再利用、HTTPS API一覧/詳細・成果物照合。
- Files Changed：src/workflow、safeReadの公開、package.json、tests/workflow.test.cjs、docs/phase12-workflow.md、入口文書と制作プロンプト。
- Validation：ワークフロー3件合格。保存→API失敗→再実行のモックで書込5回のまま・生成1回を確認。機密/変更承認/破損拒否。新CLIで既存Linux資料の表紙1枚をSVG/PNG/PDF/PPTX実生成、サムネイル目視・原文の表題/副題照合、reviewを付けた再実行でattempt=1の再利用成功。出力はoutputs/phase12-validation。全Linux資料の制作完了を示す試験ではない。
- Result：ローカルの一括生成と承認付き保存/API連携を実装。iOS・AWSリソース/ポリシー変更なし。
- Remaining Issues：新資料の送信許可と有効なCognito tokenがないため、今回の実S3送信・公開API・Web/iOS実機新規資料確認は未実施。原資料構成はCodex担当、CLIの自然言語解析は追加しない。強制終了の残留lockは手動確認が必要。

ユーザーの追加指定によりPhase 12のSVGは内部変換用に限定し、PDF/PPTX完了後に削除。生成時ハッシュは互換metadataに保持し、workflow stateにremoved-after-exportを記録。実パッケージのSVG削除・同じreviewでの再実行成功、SVGなしの承認/保存/API再実行モック3件合格を確認。既存単独CLIは変更しない。

最終検証：既存環境env.shのNode 22.14.0でnpm run verify Full合格（ルート33件・viewer 9件・typecheck・production build・文書リンク29件・diff check）。最新ワークフロー3件も個別再検証済み。初回サンドボックス内Chrome起動失敗、同梱Nodeでの描画待ちを中断後、既存Node 22環境で再実行して解消。実パッケージはSVG 0件・review passed・attempt 1のまま再利用確認。

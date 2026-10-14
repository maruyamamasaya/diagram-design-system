# プログラミング資料とページ設計の共通化

## Request
Pythonを軸に、基礎・言語・設計・DB・オブジェクト指向・現場の開発運用を扱う資料を制作。高密度、毎ページの構成の工夫、同一構図の機械的な反復を避ける方針を共通化してから制作する。

## Investigation
入口/CURRENT/CODEMAP、全共通ルール、プレゼン子AGENTS、専用プロンプト、登録表・標準スキーマ、グラフィック版運用、出力・検証仕様、4種の意味テンプレートを確認。Python/PostgreSQL/MDN/Git/言語公式資料を調査。既存v2の固定配置へ全ページを当てはめず、既存のパッケージ専用登録経路を選択した。

## Changes
方針の正本は[rules/layout](../rules/layout.md#内容に応じたページ設計)。内容から関係と読み順を設計し、高密度は定義・仕組み・具体例・条件の統合で実現する。品質ルールと3プロンプト、README、CURRENT、グラフィック版運用から参照。旧テンプレートの寸法・スキーマ・エンジンは変更していない。

32ページの初稿を専用固定レイアウトで制作。意味入力に座標を持たせず、各ページの構成意図・入力キー・矢印を登録。備品貸出の説明例で基礎から実務を接続し、PDF/PPTX/全PNG・出典・原稿・ローカル検証記録を作成。

## Files Changed
rules/layout.md、rules/quality.md、prompts/presentation.md、prompts/generate.md、prompts/revise.md、docs/presentation-graphic-mode.md、README.md、CURRENT.md、本記録。成果物はGit管理対象外。

## Validation
- ルート回帰43/43合格。別の関連検査7/7も合格。git diff --check合格。
- 専用入力スキーマ、全8章の対応、出典解決、表の矩形性、32種類の固定配置、グリフ・文字幅・境界・文字同士の重なりを確認。
- Python抜粋の構文と料金関数・インスタンス独立性・二重貸出例外・継承・保存先差替え・ループ同等性を確認。SQL JOINはローカルSQLiteで結果照合。PostgreSQLでの競合実行は未実施。
- PNG3200×1800、PDF32ページ960×540pt、PPTX32ページを確認。全表示文字のPDF/PPTX照合で欠落0。
- 最終PDF全ページを再描画し一覧目視。PPTXはArtifact Toolで再インポート・全32ページを再描画し各ページを目視。PowerPoint本体では未検証。
- 表の行間・内部余白、コードの不適切な折返し、英単語と句読点の改行を修正。PDFのfl合字は埋込み書体の同一グリフを照合してToUnicodeを補正、全32ページの描画が変わらないことを確認。
- PPTXの表警告1件は19ページ右側本文を全幅フッターと誤認したもの。表と実フッターの境界・再描画を確認し、交差なしと記録。
- 4テンプレート・2図解プロンプト・専用プロンプト・README・既存例への影響を確認。配置数値や既存CLIの契約は維持。
- 文書チェックには既存のsessions/2026-10-12-offline-copies.mdから別リポジトリのoffline-copies-validation.mdへのリンク切れ1件がある。今回変更したリンク先は個別確認。無関係な記録は変更していない。

## Result
資料ID cdb88519-bcb4-45dd-8337-fba9474387cd、版1。最終パッケージはoutputs/cdb88519-bcb4-45dd-8337-fba9474387cd/versions/000001/。原稿と専用登録、成果物、検証、依存SHA256を同梱。制作中の証跡はoutputs/programming-foundations-20261014/。認定は本資料のサンプルに限定する。AWS/S3送信なし。

## Remaining Issues
PowerPoint本体表示・実機編集・別端末・投影は未検証。PPTXはNoto Sans JP/Mono非埋込み、独立線はノード移動に追従しない。資料は設計例と抜粋コードであり、本番アプリの完全実装ではない。既存の外部文書リンク切れは未解決。

## S3保存（同日・追加承認後）
ユーザーの「S3に保存して良いよ。」を今回の完成資料への送信承認として記録。承認済みconfig/s3.local.jsonの専用ロール・既存非公開S3を使用。専用パッケージを既存標準スキーマへ偽装せず、個別handoffでローカル全成果物・依存SHA256・検証証跡を照合した。

PDF1、PPTX1、PNG32、最小manifest2の計36オブジェクト、15,259,145 bytes。最大ファイル4,659,910 bytesで既存サイズ上限内。原資料・構成JSON・検証記録・フォント・ZIPは送信対象外。資料IDと版1を保持。

読み取りpreflightで東京リージョン、全公開アクセスブロック、BucketOwnerEnforced、SSE-S3、非公開、既存catalogの不在と保持上限を確認。条件付きPUT・全36 GETでSHA256/容量/MIME/暗号化一致、catalog最後掲載、state=complete。共通viewerのmanifest正規化で32ページ・PNG/PDF/PPTXの受理を確認。本番API・実機の一覧表示は今回未検証。AWS構成・権限・予算・既存資料は変更していない。

証跡：outputs/programming-foundations-20261014/s3/のhandoff.cjs、approval-binding.json、s3-artifacts-manifest.json、preflight.json、upload-status.json。ローカル最終パッケージは変更せず保持。

# 図解の標準方針とハルシネーション資料のS3保存

## Request
今後のプレゼンへ内容に合った図で仕組み・関係を直接伝える方針を標準化。完成した資料のS3アップロードも本人が許可。

## Investigation
共通入口・CURRENT・CODEMAP・レイアウト/品質正本・制作プロンプト・4テンプレート・README・実例を照合。登録描画器は固定配置を所有し、任意の意味図の自動生成機能ではない。S3保存仕様、metadata/config schema、費用方針、既存専用ローダー、本番読取互換性ゲートを確認。

## Changes
rules/layout.mdを標準方針の正本にし、docs/presentation-layout-policy.mdへ関係別の図の選択例を追加。品質確認と生成/修正/プレゼンのプロンプト、AGENTS・CURRENT・README・グラフィック運用を参照で接続。箱/矢印/表の一律禁止や図の個数基準にせず、対象・関係・具体例・成立条件から設計する。未指定モードは内容から選択する。4テンプレートは実際の順序・分岐・境界・共通軸を示す用途では矛盾せず、登録・スキーマ・エンジンは変更なし。

## Files Changed
AGENTS.md、CURRENT.md、README.md、rules/layout.md・quality.md、docs/presentation-layout-policy.md・presentation-graphic-mode.md、prompts/generate.md・revise.md・presentation.md。本記録。S3用の限定ローダーと計画・ハッシュは完成資料第6版のbuild/とupload-*へ保存し、共通保存コード・AWS設定は変更なし。

## Validation
文書検査：283文書のローカルリンク欠落0、git diff --check合格。追加アンカー15箇所と正本参照を確認。ルート回帰は51件合格、並列実行の描画3ファイルが子プロセスなし・CPU待機のまま継続したため停止。分離なし逐次の再実行で共通グラフィック6構図、Linux8ページ、表分割、ハッシュ拒否等を含む8件が合格した。v2描画2件はChrome終了後も待機が継続したため停止し未完了として記録。全回帰合格とは報告しない。エンジン・数値トークン・登録スキーマの変更はなく、文書検査と正本照合は完了。

## S3 Plan
ID 38943724-7e47-47b6-81d6-216b8a165c16、版6、34ページ。承認済みconfigを変更せず、PDF/PPTX/34PNGと最小manifest2コピー、38オブジェクト・13,251,533 bytes。元資料・構成・検証・ZIP・フォントはローカルのみ。dry-run合格。本番reader fingerprint d01dcca9fbdf96402536e886b75595dde54b7f60389766271154e1d34bcbd375一致、読取専用preflightで非公開・AES256等を確認。費用は既存承認単価による増分試算をupload-cost-estimate.jsonへ記録。

## Result / Remaining Issues
方針反映は完了。初回は自動承認レビューが具体的な送信先承認不足として拒否し、送信なし。本人が既存非公開バケットdiagram-design-system-676643701781-apne1（東京/library配下）への送信を明示承認した後、同じ限定ローダーで保存を実施。upload-status state=complete、成果物36件をGETでサイズ/SHA256/Content-Type/AES256照合し、manifestとcatalogの保存検証まで完了（全38オブジェクト）。本番reader fingerprint一致、非公開preflight、公開ロック、条件付きPUT、保持上限を維持。AWS構成・権限・予算は変更なし。アプリでの本人による実表示は今回未確認。

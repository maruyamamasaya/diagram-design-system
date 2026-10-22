# AI年代図鑑：実画面と開発成果を中心に改訂

## Request
新しい制作ルールでAIの年代図鑑を作り直す。時系列を主軸に、実画面・成果物を大きく示し、Codexで開発できたシステムを具体化する。既存の本人申告・トークンの別軸・他社エージェント・未来予測も保持する。

## Investigation
旧42ページ、公式の公開日・提供条件、ローカルのMac/iPad本棚・資料制作・取得修復・整理同期・表紙軽量化の記録を再利用して照合。Copilot、Jules、Claude Code、Sora、computer use、Codex cloudの掲載画面と、現在のCodex公式デモの成果物を追加調査。現在の画面を初公開画面としない。

## Changes / Files Changed
outputs/ai-chronicle-20261022/revision2に意味入力・固定登録・描画・検証・出典・素材台帳を保持。34ページへ統合し、年月順の出来事、本人の実例、コード量・体感・トークン、予測、出典を構成。PNGの全ページ、PDF、編集可能要素を持つPPTX、出典・ノートのZIPを制作。制作ルール・レンダラー本体・AWS・ビューアーの実装は変更していない。

## Validation
初学者向けの具体性、年月と条件、画面の由来、資料単位の重複・薄さを確認。5回の具体的な改善は制作原本のrevision-log.mdに記録。全34ページの個別目視と全体一覧、PDF/PPTX各34ページの再読込・再描画、9枚の比較一覧を確認。PDF/PPTX全文の欠落0、PNG3200×1800、PDF960×540pt、PPTX16:9、924ネイティブ図形、16画像配置、出典付きノート34ページを検査。全ページに本人指数を表示し、過去の仮置き・現在の本人申告・未来の数値なしを区別。CSVの実行結果・集計・増加率、目次、参照ID、素材ハッシュを照合した。

## Result
ID d4b46f2d-2f07-4626-9cb6-3a4b9d0b5694の旧1を保持。初回作業出力2で見つけたグラフ軸の接近を修正し、最終はversions/000003。33ページのSVG/PNGをハッシュ一致で再利用し、変更した29ページだけ再描画した。納品はoutputs/ai-chronicle-20261022/deliverables-v2/のPDF・PPTX・ページPNG ZIP・出典ノートZIP。最終のvalidation.jsonとdelivery-manifest.jsonへ状態・ハッシュを記録。

## Remaining Issues
PPTX書体は非埋込みでNoto Sans JP/Monoが必要。PowerPoint本体での表示・編集操作は未検証で、Artifact Tool再インポート・再描画と区別する。グラフ・表は図形と文字で、データ内蔵chart/tableではない。体感生産性とコード量は本人申告、実機速度比較は過去記録でも未実施。未来は予測。標準schema/S3互換や新しいシステム機能は主張しない。

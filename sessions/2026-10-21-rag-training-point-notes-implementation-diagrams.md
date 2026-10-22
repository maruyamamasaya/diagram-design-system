# RAG資料：補足の個別判定と実装編の再図解

## Request
緑の補足を一律復元せず、図にない重要なポイントだけ残す。二重説明を省き、判断基準を基本ルールへ残す。新規追加した実装編は公式資料を調べながら分かる図へ作り直す。原研修資料・旧版を保持する。

## Investigation
v13の127ページと63件の既存補足を照合。Microsoft LearnでSearchのRole、Vector Field/Profile、OpenAI v1認証、文書ごとの登録結果、Security Filter/preFilter、TokenのGroup overageを確認。架空の説明例と実サービスの仕様、本番向け設計案と付属CLIの実装範囲を区別した。

## Changes
既存補足45件を条件・実装判断として短く残し、18件を削除または図・副題へ統合。復元したPOINTと重複する旧副題9件を削除。BM25の計算前提はPOINTへ統合。第8章104–126の23ページを、具体的な設定値・文書・ACL・応答・出典の対応図へ再構成。Token予算は量の配分図、準備は独立した接続先の依存図、権限付き検索は検索→LLMの順にした。処理ブロックのコードはノート・実装ガイド・labへ保持。

補足の判断は[rules/content](../rules/content.md#補足を残す削る判断)を正本とし、layout/quality/レイアウト方針/reviseから参照する。今回の資料は緑の補足を戻す明示条件を優先。ランタイム・AWS/Azure構成は変更していない。

## Files Changed
- rules/content.md、rules/layout.md、rules/quality.md
- docs/presentation-layout-policy.md、prompts/revise.md（今回の追記のみ。他の作業中変更を保持）
- outputs/rag-training-reinforced-20261021-v14/：PPTX/PDF、127枚PNG、実装キット、出典94件、意味入力・固定描画器・採否と検証記録

## Validation
5回の設計・照合・描画レビューを記録。127ページの文字一致、8章と44しおり、文献94件、選択POINT68ページ、原資料ハッシュを確認。両描画経路の一覧と実装23ページを目視。最後の29ページの前提追記は再描画し、他126ページと素材のバイト同一を照合。finalizerの重大指摘0件、29ページの線とtextboxに関する警告3件は実グリフを隠していないことを確認。PDF書体埋込み、PNG寸法3200×1800、公式/汎用アイコン33件のハッシュ、関連文書34リンクを確認。labのローカルテスト6件合格。四つのテンプレート・関連プロンプト・READMEへの影響を確認し、テンプレート改修は不要。

## Result
v14をローカル納品。原資料・v13以前のファイルは変更なし。補足の採否はreview/point-decisions.json、公式確認はreview/research-v14.json、目視はreview/visual-review.json、形式と内容はvalidation.jsonへ分離した。

## Remaining Issues
SDKインストール、実Azure接続、実モデル回答の品質、本番認証・同期・復旧の実装/受入は未検証。実PowerPoint・別端末編集は未検証でPPTXは書体非埋込み。既存ネイティブPPTXの部分差替経路のため全デッキSVGは生成していない。

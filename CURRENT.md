# 現在地

更新日：2026-10-09。Project：AI図解デザインシステム。Phase 6のローカルSVG/PNG生成とLinux8ページ検証を完了。アプリ機能追加より資料生成支援が主目的。並行更新があるため、作業開始時に登録表・関連テスト・最新証跡を再照合する。

## 実装済み
- 単一の直列Roadmap JSON → SVG/PNG、実測・グリフ・重なり検査、ローカル保存：`src/cli.cjs`、`src/engine.cjs`。
- 独立S3アップロード、条件付き保存・ハッシュ照合・再実行：`src/upload/`。過去の実AWS証跡は[Phase 3](docs/phase3-validation.md)。現在のAWS状態を保証するものではない。
- ローカル専用Next.jsビューアー、認証・単一owner認可・S3読取：[Phase 4](docs/phase4-validation.md)。
- プレゼン6種のスキーマ・登録表・内容検査：`src/presentation/validate.cjs`。描画・PNG・サムネイル・パッケージ保存コードも`src/presentation/engine.cjs`、CLIも存在する。

## 進行中と既知の問題
- プレゼン描画コードと専用描画テストが存在し、登録表は`implemented` / `rendererImplemented=true` / `sample_reviewed`へ更新された。Full再実行で描画を含むルート18件、viewer API5件、型検査・buildが合格。登録状態だけで全入力への描画品質合格を判断しない。Phase 5記録は設計追加時の履歴で、描画の合格証跡ではない。
- 作業開始時から生成ルール・Phase 5などに未コミット変更がある。`git status --short`で現在の差分を確認し、他作業の変更を消さない。
- 登録表の視覚証跡は[Phase 6検証](docs/phase6-validation.md)。Linux8ページと全6種のサンプルを実PNGで確認した。全入力の品質保証ではない。出力先境界など試験で覆わない安全性を単一図解CLIから推測しない。

## 未実装と未検証
- 単一図解CLIのFlowchart/Architecture/Comparison、PDF・編集可能PPTX、パッケージ2.0の実行・移行。
- プレゼンPDF/PPTX/WebP、S3・ビューアーの複数スライド対応、公開認証・iOS実装。
- 自動自然言語解析は未実装。MarkdownをAIが8ページJSONへ構成し、CLI生成・参照照合・全6種目視を確認済み。大規模解析と全入力の視覚保証は未対応。

## 技術的負債と次の作業
フォント全埋込み、禁則処理、プレゼンの視覚証跡と文書の鮮度が改善候補。次は軽量SVG、日本語PDF・編集可能PPTX、差分更新を実装する。既存コードの存在だけで状態を昇格しない。

入口は[AGENTS](AGENTS.md)、構造は[ARCHITECTURE](ARCHITECTURE.md)、探索は[CODEMAP](CODEMAP.md)、検証は[TESTING](TESTING.md)、運用は[OPERATIONS](OPERATIONS.md)。詳細履歴は[sessions](sessions/README.md)。


## Phase 6.5
登録v2を追加し、v1を維持。[配置仕様](docs/presentation-layout-v2.md)と[比較証跡](docs/phase65-validation.md)を参照する。Linuxの内容・根拠は変更しない。AWS・viewer変更なし。

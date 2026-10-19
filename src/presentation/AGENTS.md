# プレゼン経路の作業規則

ルートの[AGENTS](../../AGENTS.md)に追加する。単一図解CLIと別契約・描画・保存を持つ強い責務境界として分離する。

## 現行：登録テンプレートによるプレゼン設計
プレゼン生成では本節が自由構成の既存モード記述より優先する。AIは原資料の理解・論理構成・スライド分割・登録テンプレート選択・構造化データを担当し、描画は登録テンプレートによる決定的レンダラーを標準とする。単一図解の既存経路を維持する。事前に[プレゼンルール](../../rules/presentation.md)、[設計](../../docs/presentation-design.md)、[登録表](../../config/slide-templates.json)、[スキーマ](../../schemas/presentation.schema.json)と選択したtemplates/slidesを読む。[専用プロンプト](../../prompts/presentation.md)を使用する。無登録のレイアウトを作らず、不足はテンプレート追加・品質確認から行う。認定状況はCURRENTを参照する。既存図解レンダラーの能力とスライド組込能力を混同しない。制作・レイアウト改修だけでS3/ビューアー/既存CLIを変更しない。通常版/グラフィック版の選択と専用登録の設計仕様は[レイアウト方針](../../docs/presentation-layout-policy.md)。

PDF/PPTX、一括制作、差分更新の現在の実装と登録状態は[CURRENT](../../CURRENT.md)。6種SVG/PNG・Linux8ページの描画とサンプル視覚確認を完了。詳細と未検証は[Phase 6検証](../../docs/phase6-validation.md)。全入力の品質保証ではない。変更前にvalidate.cjs、engine.cjs、登録表、tests/presentation.test.cjsを照合する。検証は[TESTING](../../TESTING.md)。


Phase 7：v2標準、明示v1互換。export.cjsが共通SVGからPDF/PPTXへ派生し、各パッケージの生成処理と分離する。[出力仕様](../../docs/presentation-export.md)を読む。追加変換試験はnpm run test:exports。

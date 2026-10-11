# Presentationsスキルの採用方針

調査対象：Codexの[Presentations SKILL.md](C:/Users/m-maruyama/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations/SKILL.md)、同ディレクトリのstyle_guidelines.md、references/template_following.md。今回のDevelopment Modeでは制作ノウハウを移植する。既存の決定的レンダラーを使うというユーザー指定を優先する。

|原則・手法|判断|既存との比較・反映先|
|---|---|---|
|UIパネルの反復より平面の構成|採用|v1は箇条書き・表までカード化。v2はラベル＋説明、共通軸、横罫線へ。layout/dense.cjs|
|書体の階層、実フォントでの折返し|採用|既存の実測・グリフ検査を継承、32/44/56の役割を追加。design/profile|
|資料の条件・根拠を保つ|採用|同じLinux構造content、参照元ハッシュを比較。内容を増やさない|
|全ページの目視・並べた比較|採用|自動合格とAI目視を分離。phase65-validation|
|タイトルは主題を直接示す|採用|既存の主題を保持、架空の結論や煽り表現を追加しない|
|提供テンプレートの寸法維持|部分採用|既存v1を保存。明示的な改善依頼に合わせv2を登録|
|収まらなければ文章を削る|不採用|今回の指示は重要条件保持・分割。縮小や削除で回避しない|
|スキル既定のptサイズ|部分採用|本基盤は1600×900のSVG単位。既存最小24/20と実測を優先|
|画像・装飾素材の追加|表現モードに応じて採用|通常モードは図表中心。明示されたグラフィック版では説明に必要なモノクロイラストを採用。装飾による情報水増しを避ける。[運用](presentation-graphic-mode.md)|
|artifact-tool/PPTX著作フロー|不採用|エンジンの改修であり独立デッキ制作ではない。既存SVG/PNGを維持、PDF/PPTXは次工程|

数値・制約は[登録レイアウト](presentation-layout-v2.md)、検証証跡は[比較結果](phase65-validation.md)。新しい外部サービス・依存ライブラリは追加しない。

# グラフィック共通レイアウト

slideType=graphic、templateIdを明示する。入力はpresentation.schema.jsonのgraphic_*、配置はgraphic.cjsとconfig/graphic-profile.jsonが所有する。通常v2と同じ文字階層を継承し、入力へ座標を追加しない。

|登録IDの末尾|意味・固定配置|上限|
|---|---|---|
|structure.v1|境界/要素を横並びにして接続・条件と背景を下へ対応づける|2〜3要素、隣接する左→右の接続のみ|
|process.v1|段階ごとに主体・操作・結果、下段に例外|2〜3段階|
|cause.v1|共通の起点から条件別に分かれ、結果・介入・残る問題を対応|2分岐|
|comparison.v1|共通軸の2案と判断・成立条件|2〜4軸|
|evidence.v1|大きい図版と読みどころ、本文・背景を隣接|画像1点|
|evidence-pair.v1|2画像と各読みどころ、共通比較と留保|画像2点|

完全なIDは`slide.graphic.<末尾>`。図版はPNG/JPEGを縦横比維持・containで埋込む。過去資料からの再利用も生成画像もassets台帳が必要。画像はラスター、文字・図形・線はPPTXで独立編集する。標準Diagramの全般的Architecture/Flowchart対応とは別。

容量・パス・ハッシュ・生成記録と検証条件は[共通描画器](../../docs/graphic-renderer.md)。収まらなければエラーを返し、文字の縮小やフィールド削除、グラフィックページの自動分割は行わない。意味のまとまりを保ったページ分割は制作者が設計する。

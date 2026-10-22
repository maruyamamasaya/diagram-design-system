# RAG研修 v13：緑の補足撤去と実装編

依頼：重複する緑の補足を削り図表の余白へ。資料から実システムを作れるかを評価し、不足を補足。

制作範囲：outputs/rag-training-reinforced-20261021-v13/。原研修・v12を保持。実装システム/AWSは変更せず、Azureリソース作成・書込み・生成APIも実行していない。

評価：従来は概念・部品の説明が中心で初期構築に必要な設定/契約/実行順が不足。実装編24ページとガイド・架空データ用CLIを追加し計127ページ。環境準備、RBAC、Index定義、接続、登録、部分失敗、権限検索、Context、生成/引用、API結線、実行手順、受入試験、障害切分け、配置を連結。本番のJWT/Group/ACL同期・PDF/OCR・Token計数・監視/復旧は案件ごとの実装として区別。

緑の帯63か所を除去し、描画領域の縦方向の間隔を拡張。文字/アイコンは縦横比とサイズを保持。角度が意味を持つcosine図だけ等方拡張。不可欠な計算前提や権限条件は図中見出し付近へ。全文はノートと旧版で保持。

構成：既存専用登録32種にcode/toc/mainTocを追加、意味入力には任意座標なし。図形/文字/接続線はネイティブ、公式Azure/Entra・Lucide素材の由来/ハッシュを継承。文献案内一枚、詳細92件は同梱一覧とノート。8章の主/章別目次と44 PDF bookmark。

検証：最終PPTXのfinalizer構造/幾何/再読込、PDF/PPTX全127ページの文字/ページ番号/章節目次、全ページ再レンダリングと一覧目視。図の詳細・コード頁の折返しも確認。緑のフッター帯が全ページにないことを検査。ローカル6契約テスト合格（ACL式、Metadata/ID/版、部分失敗、引用、Embedding応答）。これは実Azure接続/精度の検証ではない。

制約：PyPIの名前解決/通信制限でSDKインストール確認未了。候補requirementsは未固定、実機で接続確認後にlockを作成する。実Azure・モデル品質・実PowerPoint/別端末編集は未検証。PDFは書体埋込み、PPTXは非埋込み。

成果物：delivery/training.pptx、training.pdf、implementation-kit.zip、implementation-guide.html、references.html、pages.zip。sourceとvalidation/reviewに入力・根拠・証跡を保存。

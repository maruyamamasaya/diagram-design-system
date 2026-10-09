# Phase 6：実装と検証

2026-10-09。Development Modeで登録テンプレート方式の生成エンジンを追加。AWS操作・Web機能変更・新規依存導入は行っていない。

## 変更ファイル
- src/presentation/engine.cjs：6種の描画、実文字測定、境界・余白・重なり検査、実SVG再描画、PNG・サムネイル、分割、ローカルパッケージ保存。
- src/presentation/cli.cjs、package.json：generate:presentationを追加。既存generate/upload/validate:s3の契約は維持。
- src/presentation/validate.cjs、schemas/presentation.schema.json：1.0維持と1.1追跡情報、sourceId参照検査。
- schemas/presentation-metadata.schema.json：専用メタデータ契約。既存図解metadata/S3構造は変更なし。
- config/slide-templates.json、templates/slides/、rules/presentation.md：実装状態とサンプル視覚証跡、実測行高への調整。
- tests/presentation-engine.test.cjs、tests/presentation.test.cjs：8ページE2E、分割と原文保持、上書き拒否、正規化ハッシュ、登録状態。
- examples/linux-operations/：検証用Markdown、AIが構成した8ページJSON、直列Roadmap入力。
- docs/presentation-engine.md、README、AGENTS、prompts/presentation：Creation Modeからの生成手順と制約。

## 最終結果
ルートテスト18/18合格（既存11、Phase 5の4、Phase 6の3）。Phase 4ビューアーAPI5/5、型検査合格。環境のPlaywrightブラウザは未配置のため、既存DIAGRAM_BROWSER設定でインストール済みChromeを指定。ChromeがSVGを実デコードしてPNGへ再描画した。

6スライド型の8ページが成功。SVG1600×900、PNG3200×1800、PNGサムネイル800×450。日本語グリフ、文字境界、共通余白、図形/文字の重なり、PNG無彩色・不透明を検査。表の長いセルを実測して行高拡張し、ページ超過を分割する試験で全セルの原文が維持された。分割後の元slideId・固有pageId/part・繰返し列見出しを保持。既存ID/版ディレクトリへの再生成はEEXISTで拒否。

実フォント測定で日本語グリフ高さ・英字の左張り出し・ページ番号の余白不足を検出し修正。フッターは外周64内に収まるy=800へ変更。固定行高では不足する表・カードを実高さと内余白で拡張。検証中の失敗版を削除せず保持し、最終版を000002へ保存した。

## 最終成果物
outputs/66666666-6666-4666-8666-666666666666/versions/000002/

source/input.md・presentation.json・diagrams/<diagramId>.json、slides/001〜008/slide.svg・slide.png、thumbnails/001〜008.png、metadata.json、validation.json。overview.pngは目視レビュー用の8ページ一覧で、標準成果物外。全てGit対象外。

1 Linux運用概要（Title）、2 基本コマンド（Bullet）、3 資源監視（Table）、4 ネットワーク確認（Bullet）、5 障害調査順序（Diagram/Roadmap）、6 コマンド比較（Two Column Comparison）、7 注意点（Bullet）、8 まとめ（Summary）。5は検証用に定義した推奨順序で、未実装の条件分岐Flowchartではない。

## 内容・視覚レビュー
AIが検証用Markdownの8節と生成構成を照合。コマンド名、ICMP制限、採取時刻/単位、環境差、機密ログ、変更後確認を維持。比較・調査順序は検証用提案と区別。8ページ一覧と各型の実PNGを確認し日本語・読取順・余白・文字切れを点検した。全入力・全フォントでの視覚品質保証ではない。Linux環境でコマンドを実行する試験は未実施。

自動validation.jsonのcontentAccuracy/visualReviewはnot_reviewedを維持。上記はAIによる別工程の確認であり自動事実検査の合格と混同しない。review.jsonへ今回の確認範囲を記録する。

技術内容の一部は[procps-ng freeマニュアル](https://man7.org/linux/man-pages/man1/free.1.html)、[topマニュアル](https://man7.org/linux/man-pages/man1/top.1.html)、[iproute2 ipマニュアル](https://man7.org/linux/man-pages/man8/ip.8.html)で確認。GNU dfページは取得タイムアウトで、今回の外部確認済みとはしない。

## 未実装・次フェーズ
PDF、編集可能PPTX、軽量Web SVG、WebP、差分更新、大規模資料解析、プレゼンS3/API/iOS閲覧は未実装。Diagramは直列Roadmapのみ。単一項目や図が登録行数・領域を超える場合は構成修正を要求し、自動意味要約をしない。既存Roadmapの全入力をスライドに取り込める保証はない。

SVGは全フォント埋込で約13MB/枚。軽量化・日本語フォントサブセットと形式間編集性は次工程。将来、共通配置をPDF/PPTXへ変換し、スライド単位の依存ハッシュと差分更新、原資料インデックス、保存/閲覧アダプターを追加する。AWSリソースを変更せず、現在のWebはローカル専用のまま。

### 最終追加検査
全回帰18件の合格後、コマンド表記を固定Linux名リストから一般的な英数字コマンド形式へ変更。関連する表分割試験と、新規の原資料/図解ハッシュ不一致・失敗時保持の試験が2/2合格。現在のルート試験定義は19件。未認定テンプレートの描画前拒否も別プローブで合格。プレゼン契約4/4を再確認。文書検証15文書、リンク先欠落0、git diff --check合格。

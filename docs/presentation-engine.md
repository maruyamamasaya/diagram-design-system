# プレゼン生成エンジンと保存契約

## 責務
AIが資料読取・意味理解・主張順・テンプレート選択・JSONを担当。src/presentation/validate.cjsは構造/参照、engine.cjsのrenderSlideは入力された一ページを登録配置から描画し、generatePresentationは図解読取・分割・パッケージ保存を統括する。renderSlideはファイル保存をせず、context/font/rules/diagramを注入できる。今後保存オーケストレーターをS3等へ差替えても描画処理を維持できる。大規模資料解析やLLM呼出しは実装していない。

CLIは--input JSON、--source Markdown（sourceId=input）、--output、--font、--browser。Node APIのsourceFilesはsourceId→パスの辞書で複数資料を扱える。数十枚への固定制限はなく、スキーマ現行上限は入力100論理スライド。ページは逐次描画しブラウザページを都度解放する。将来上限拡張はスキーマ変更と試験を行う。原資料識別・段落参照を引き渡し、全文を一AIコンテキストへ投入する前提を持たない。

## 描画・分割
共通rules.cjs/font.cjs/browser.cjs/engine.cjsのXML escapeを再利用し、追加依存はない。日本語OFLフォントと既存Noto Sans Monoを埋込む。実canvas幅で改行しSVG getBBoxの実グリフ高さ・ascent・左側張り出しを測る。カード内余白も検査し、本文の実高さからカードと表の行を拡張する。実描画後に境界・文字同士・図形同士・文字と図形の包含を検査。PNGをデコードし3200×1800、無彩色・不透明を検査。サムネイルは800×450 PNG。

表・Bullet/Summary・二列比較は全体高さ超過を検出し、項目/行/軸を二分して再試行する。比較は左右同じ軸を同時に分割。表は各ページで列見出しを繰返す。SummaryのnextActionは最後の分割へ残す。単一行・単一項目・図解が上限超過なら明示エラー。短縮・自動要約・フォント縮小で条件を落とさない。分割は決定的で、各ページは同じ論理slideId、partと固有pageIdを持つ。

Diagramはハッシュ検証したリポジトリ内のRoadmap JSONを読取り、既存model.cjsで検査し、スライド専用カード領域へ配置する。ファイル実パスの境界も検査する。直列の順序・接続・ラベルを保持し、図解のoutcome等、現在のスライド領域で扱えない内容は省略せず停止する。全Roadmap入力が組込めるという保証ではない。Flowchart/Architecture/Comparisonは明示エラー。障害調査の検証例は条件分岐ではなく推奨順序。

## 互換性と追跡
presentation.schema.jsonは既存1.0を維持し、互換拡張1.1/1.2に対応。presentationId/versionを再利用し、metadataでpresentationVersionへ投影。slideVersionは省略時1。sourceReferencesはsourceId/sourceVersion/locator（例lines:3-4）。原資料を渡した場合sourceVersionは実バイト列SHA256と一致が必須。元データの1.0を自動移行しない。

presentation-metadata.schema.jsonは専用presentation-package-1.0。ID・版・pageId/part・templateId・生成時刻・contentHash・sourceReferences・成果物サイズ/SHA256・原資料のSHA256・フォント・ルール/テンプレート/エンジン依存ハッシュを記録する。contentHashはキー順を正規化し配列順を保持する。部分再生成は[Phase 10B](phase10b-partial-update.md)の専用経路。原資料差分と更新計画は[Phase 10A](phase10a-update-plan.md)で扱い、contentHashは変更しない。依存ハッシュは資料単位で粗く、今後スライド単位の依存集合を追加できる。

outputs/<presentationId>/versions/<版>/source/にpresentation.jsonとinput.md、source/diagramsに参照Roadmap、slides/<連番>/slide.svg・slide.png、thumbnails/<連番>.png、metadata.json・validation.jsonを保存する。既存ディレクトリはEEXISTで拒否する。失敗した版に途中ファイルを残し検証失敗を記録。現在は不足分再開ではなく次版または別出力で再実行。metadataのgeneratedは描画成功で、内容/目視の全検証完了ではない。

既存図解metadata 1.0/2.0やS3許可リストを変更していない。プレゼンのAWS保存とviewer/iOS API連携は別実装。アップロードを行わずAWSアクセスも不要。全SVGへフォントを埋込むため約13MB/枚と大きい。軽量Web SVG/サブセット化は次フェーズ。

## 品質と制約
自動検査で意味の完全性・実運用の正しさは確認しない。自動JSONのcontentAccuracy/visualReviewはnot_reviewed。AI/人間の原資料対応と画像確認は別の証跡に記録する。PDF/PPTXは共通SVGから対応済みで、形式別状態をmetadataへ記録する。[出力仕様](presentation-export.md)。webSvg/WebP・構造化大規模解析は未実装。差分更新は専用経路に限定する。未実装形式の空ファイルを出力しない。

Phase 10Bの部分再生成は[専用経路](phase10b-partial-update.md)。generatePresentationへ更新対象のみを渡し、pageNumberStart（既定1）で開始番号を指定。旧ページの再利用と新版保存/形式再構成はsrc/updateが担当し、既存生成CLIは維持する。

通常v2の表は役割別の固定列幅を選択でき、省略時は旧等幅を保持する。[配置契約](presentation-layout-v2.md)。通常/グラフィック版の選択と専用登録は[レイアウト方針](presentation-layout-policy.md)。

共通グラフィックはschema1.3/slideType=graphic。6構図とPNG/JPEG素材をgraphic.cjs/graphic-assets.cjsへ分離し、既存のgeneratePresentationと共通形式変換を使う。[契約と制約](graphic-renderer.md)。assetRootはCLI入力ファイルのフォルダ、Node APIは明示指定可能。素材自動検索・自動生成は行わない。

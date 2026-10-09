# Phase 5：プレゼン設計基盤

本書はPhase 5設計時点の責務・契約と将来案を保持する。以下の未実装記述は当時の差分であり、現行の描画コード・登録状態・検証状況は[CURRENT](../CURRENT.md)と最新の描画工程の証跡を確認する。

## 責務と処理
1 入力読取：読取範囲・原資料の参照/ハッシュを記録。
2 意味整理：事実/推測/不明、必須情報と条件を整理。
3 構成：目的・読者・主張順・各ページへの入力対応を設計。
4 選択：rules/presentation.mdと登録表から選ぶ。
5 構造化：presentation.schema.jsonと意味検査でsource.jsonを確定。
6 描画：将来の決定的スライドレンダラーが登録テンプレートから共通シーングラフを生成。
7 検証：内容、境界、全ページ視覚、形式別検査。
8 出力/保存：共通シーングラフを各形式へ変換し、ローカルパッケージへ保存。S3は別承認・別アダプター。

AIは主に1〜5を担当。6〜8の実装は今回追加していない。構造検証モジュールは描画エンジンではない。

## スキーマと互換性
schemaVersion=1.0は契約版、versionは資料の改訂整数。presentationIdはUUID v4、slideIdは永続UUID v4で順序はslides配列。内容修正は同じpresentationIdの次版、slideIdは同じ論理ページなら維持。分割・新設ページには新ID。templateIdは版付き固定ID。referencesは原資料を指す宣言であり自動取得・実行しない。notesは話者用であり画面表示必須情報の代替にしない。

additionalProperties=false、slideType/templateId/contentをoneOfで束縛。6種類の内容スキーマはdefinitionsに分離。別ファイルへ重複転記しない。maxLengthはUnicodeコードポイント数で、実フォント幅とは別。unknown schemaVersionを拒否。破壊的な項目・制限変更は新schemaVersion、テンプレート配置変更は新templateIdで旧版を保持。明示的な移行ツールで旧版→新版を新資料版へ保存し、原本・ID対応・変更理由を残して構造/意味/視覚を再検証する。自動移行ツールは未実装。

## 既存図解との統合
DiagramはdiagramId/version/sourcePath/sha256を固定し、Roadmap/Flowchart/Architecture/Comparisonの意味仕様を参照する。sourcePathはリポジトリ/許可済みパッケージ内の相対パス、参照バイト列のSHA256と型を実装時に照合する。現在の意味検査はパス形式のみで、実ファイルやハッシュ照合は未実装。外部URLや任意SVGを描画入力にしない。

Roadmapのみ既存単一SVG/PNG生成エンジンあり。ただしスライド領域への組込アダプターは未実装。Flowchart/Architecture/Comparisonは意味テンプレートのみで決定的レンダラーなし。diagramTypeを宣言できることは描画対応を意味しない。フォントが20未満になる図の縮小を禁止し、再配置・分割する。現行エンジンの完成SVGを単に貼るだけでは編集可能PPTXにできない。

## 将来の形式と保存（すべて設計）
outputs/presentations/<presentationId>/versions/<6桁版>/source.json、slides/slide-001.svg・slide-001.png、document.pdf、presentation.pptx、thumbnail.webp、metadata.json、validation.jsonを予定。順序とslideIdの対応をmetadataに保持。全形式を共通入力・配置から生成し、ページ数・内容・IDを照合。未対応はunsupported、未生成や空ファイルを成功にしない。metadataは資料全体と各ページのサイズ/SHA256/検証状態を管理する将来専用スキーマを設計する。既存diagram metadata 1.0/2.0へ資料を偽装しない。

SVGは編集可能text/図形を保持、PNGは3200×1800。PDFは共通ベクター配置から日本語フォント埋込・サブセット化して960×540ptの多ページ文書へ変換。PPTXは同じシーングラフからネイティブテキスト・図形・コネクター・表を生成し13⅓×7½inchへ等方変換。SVG一枚貼付を編集可能としない。日本語改行とフォント差、PowerPointの線端・表セル・テキストbboxを実表示と個別編集で検証する。候補ライブラリの版・ライセンス・互換性は実装時に一次資料で確認して選ぶ。現段階でPDF/PPTX生成ライブラリは導入していない。

S3アップロード・catalog・Web/iOSのpresentation対応は未実装。既存CLI/キー/許可リスト/メタデータ/ビューアーを変更しない。新資料を現行uploadへ渡さない。Webはローカル限定。AWSの追加・変更・削除はしない。

## 次フェーズ
まずTitle/Bulletの決定的シーングラフ・SVG/PNG描画と境界/実レンダリング試験を実装。次に6テンプレートとRoadmapアダプター、短文/上限/長い日本語/英数字混在/分割の品質確認を追加。テンプレート版・フォント・トークン・レンダラー版を固定して登録表へ証跡を紐付ける。その後PDF・編集可能PPTX・プレゼンmetadata・部分再生成を実装。S3/API/iOSの拡張は別フェーズと承認で行う。

# RAG研修資料 v12：関連図と文章説明の視覚化

依頼：分かりにくい関連図の差し替え、文章説明を図へ置換。ページ増加可。原版・旧版を保持。

対象：outputs/rag-training-reinforced-20261021-v12/ の制作パッケージのみ。実装・AWS変更なし。

89ページを監査し49ページを再構成、14ページを追加、計103ページ。登録/質問応答・権限・公開運用の流れを分離。Queue、Chunk/Overlap、HNSW、再評価、Token配分、Top-K、Prompt、Cache、並行処理、Retry、Circuit Breakerを視覚化。比較・証拠の対応は短い表として整理。Python28テーマは変更せず保持。図形・文字・線を編集可能に維持。

共通6構図で表し切れないシーケンス・数式グラフ・状態遷移等はパッケージ専用固定登録32モードで生成。意味入力は任意座標なし。Azure/Entra公式素材とLucideを出典/ハッシュ付きで使用。旧説明全文はローカル原文とPPTXノートに保持し、重要条件は本文へ。

検証：PPTX finalizerの構造・幾何・第一者再読込合格。PDF/PPTX全103ページを再描画、文字一致・主目次/章/節・ページ番号・38ブックマークを照合。206画像のデコード、図の63ページの文字領域境界、全ページ一覧と複雑図の詳細目視。斜線の向き・分岐接続・HNSW線と折返しを修正して再検証。Python例はv11と同一ハッシュ。原版ハッシュ一致。出典87件の掲載位置更新、33素材のSVG/PNGハッシュ確認。

成果物：delivery/training.pptx、training.pdf、pages.zip、code-and-references.zip。証跡：validation.json、review/page-audit.json、review/visual-layout.json、review/*-contact-*.jpg。

制約：PPTXは書体非埋込み。別端末の実PowerPoint編集、実Azure接続、案件固有の構成は未検証。S3送信なし。

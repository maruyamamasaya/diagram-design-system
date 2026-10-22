# ポイント枠の上下中央揃えの標準化とRAG資料S3保存

## Request
ポイント枠の文字を上下中央へ揃えることを今後の基本ルールへ残し、完成した資料をS3へアップロードする本人指示。

## Investigation / Changes
視覚トークンの正本rules/design.mdの「主要ポイントの強調」へ、本文・ラベルの上下中央、複数行のブロック全体の中央、実字面・行間・内余白の再描画確認を追記。rules/quality.md、docs/presentation-layout-policy.md、CURRENT.mdから参照。四テンプレート・プロンプト・READMEは既存の共通ルール参照で適用でき、描画基盤は変更しない。既存の作業中変更を保持。

S3はv15（ID 97ac89d1-644c-48b2-8c20-f31b297b28d6、版15）のPDF/PPTX/127PNGだけを、既存の非公開バケットdiagram-design-system-676643701781-apne1（東京/library）へ保存。ローカル独自metadataを標準契約へ偽装せず、build/upload.cjsの限定ローダーから既存保存処理を使用。原資料・コード・ZIP・フォント・制作ルールは送信しない。AWS構成・IAM・予算変更なし。

## Validation
文書の所有元・関連リンクを確認。ハッシュ固定とdry-runは131オブジェクト、38,396,732 bytes、上限内。費用試算をupload-cost-estimate.jsonへ記録。Node16でfetch未対応、通常sandboxで読取契約取得不能により書込前停止。既存同梱Node24とネットワーク許可で再実行。実保存結果はupload-status.jsonを正とし、以下へ完了状態を追記する。

## Result / Remaining Issues
実保存はstate=complete。成果物129件をGETでサイズ/SHA256/Content-Type/AES256照合し、最小manifestとcatalogの保存・検証まで完了（計131オブジェクト）。本番reader fingerprint一致、非公開preflight、公開ロック、条件付きPUT、保持上限を維持。catalogはlibrary/catalog/97ac89d1-644c-48b2-8c20-f31b297b28d6/versions/000015/upload-manifest.json。実アプリでの本人の表示操作は未確認。ローカル原本・過去版を保持。

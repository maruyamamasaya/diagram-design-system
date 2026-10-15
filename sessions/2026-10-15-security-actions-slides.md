# 今できる対策の設定手順スライド

10項目を1枚ずつ計10枚。優先順位、工数、難易度、担当、具体手順、完了確認、成立条件を保持。公式Google Workspace・Microsoft・NetApp・IPA・CISA資料を調査し、製品未確定のNAS/VPNは例と条件を区別。前回了承済みのサンプル画面とモノクロの制作方針を継承。専用固定レイアウト登録で制作し、7回の改善内容をパッケージに記録した。

PNG3200×1800、PDF10ページ、ネイティブ文字・図形のPPTXを生成。文字実測・境界・重なり検査合格、PDF/PPTX全文字欠落0。全PNG個別目視、最終PDF/PPTX再描画一覧を確認。PowerPoint本体の編集は未検証、PPTXフォント非埋込み。実際の設定変更・S3送信なし。outputs/security-actions/versions/000001/に成果物と証跡。

追加：ユーザーの「これもS3に上げておいて」の承認により、同じID・版のPDF/PPTX/PNG10個と最小manifest2個を専用非公開S3へ保存。成果物8,346,702 bytes。既存S3Storageのpreflight・サイズ/保持上限・条件付きPUTを使用しcatalogを最後に掲載。全14オブジェクトの再取得SHA256・容量・Content-Type・AES256一致。AWS設定変更・削除なし。upload-status.jsonとs3-read-verification.jsonに証跡。

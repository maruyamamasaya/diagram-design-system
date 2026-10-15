# セキュリティ資料のS3保存

ユーザーの明示依頼により最新版33枚（version 000004）を承認済み専用S3へ保存。短期認証を更新後、既存S3Storageの非公開設定検査・容量/保持上限・条件付きPUTを使用した。PDF、PPTX、ページPNG33個（合計19,580,170 bytes）と最小manifest2個を保存し、catalogを最後に掲載。全37オブジェクトを再取得しSHA256・容量・Content-Type・AES256暗号化を照合して合格。専用制作パッケージは個別引渡しで検証し、標準生成スキーマ適合とは扱わない。

資料ID: e6f0f7e9-94a6-48ba-8fe6-1158afbb7e9b。保存先: diagram-design-system-676643701781-apne1 / library。既存資料・AWS設定の変更や削除なし。証跡はoutputs/cybersecurity-staffing/versions/000004/s3-read-verification.json、upload-status.json。

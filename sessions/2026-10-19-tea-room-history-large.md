# 茶室史：挿絵拡大
## Request
時代ごとの茶室の違いが見えるよう挿絵を大きくする。
## Investigation
既存hybrid原本と5画像部品を再利用。新たな画像生成は不要。
## Changes
挿絵高さ160→250、縦横約1.56倍、面積約2.44倍。縦横比を保持。上段と本文周辺の余白を再配分。5列と下段構成、全本文、文字サイズを保持。
## Files Changed
outputs/tea-room-history-large-work/、outputs/74b6eff3-db80-499f-8d32-89348330e47e/versions/000006/、本記録。
## Validation
Level 1/2。全text要素の文字列が前版と一致。CLIでラベル・グリフ・境界・デコード検査合格。第5版PNGとPDF再描画を目視、文字と画像の欠け・重なりなし。第6版は同じ描画で記録のみ確定。5回の見直しを原資料に追記。
## Result
拡大版PNG/PDF完成、前版保持、ローカル保存。
## Remaining Issues
説明用模式図。挿絵はラスター、PDF寸法は既存CLI仕様。S3送信なし。

## S3本棚保存（本人の明示依頼後）
拡大版第6版のPNG/PDFを承認済みconfig/s3.local.jsonで保存。dry-run planned→本保存complete。非公開/SSE-S3/条件付きPUT/GETハッシュ照合を既存CLIで実施、catalog完了マーカー保存済み。元資料・SVG・プロンプトは送信対象外。AWS構成変更なし。Mac/iOSの実画面更新は未確認。

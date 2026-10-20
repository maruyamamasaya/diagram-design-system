# 茶の歴史：制作方法の記録とS3保存

- Request：本人が20枚の史料増補版を「いいね！こういうの！」と採用。「やり方を覚えて」「S3にアップして」と指示。
- Investigation：保存仕様、metadata/config、安全条件、通常容量上限、グラフィック専用引渡しを確認。既存S3への読取preflightで東京・BPA全true・BucketOwnerEnforced・AES256を確認。
- Changes：選好の正本 `docs/presentation-layout-policy.md`へ追記。過分割を避け関連説明を統合、歴史図面・断面・写真を広く探して大きく配置、共通軸の比較、歴史的背景・出典・年代・利用条件を添える方法を記録。20枚・21素材という数値は全資料への固定規格にしない。
- Files Changed：上記文書、`outputs/japanese-tea-history-v2/build/`の個別S3引渡しと検証証跡、`s3-delivery/`、README／manifest。本体・AWS構成の変更なし。
- Validation：元PDF/PPTXは約30MB／28MBで通常容量上限を超過。原本を保持し、埋込画像のみ最大1600px・JPEG88で軽量化。PDF抽出テキスト完全一致、PPTXの非メディアZIP部品は全バイト一致。最終PDF/PPTX各20枚を再描画・一覧目視し、PDF5/8/10頁を個別確認。PNG20枚は3200×1800・可逆のまま。全体44,919,064 bytes、最大11,438,866 bytesで通常上限内。固定許可リスト・依存ハッシュ検査後、既存S3Storageで条件付きPUT、直後のGETによるサイズ／SHA256／Content-Type／AES256照合。catalogを最後に保存しcomplete。
- Result：ID `4d0783b7-8117-4ce3-b76f-f9b2e85fde73`、版2、PNG20・PDF1・PPTX1・最小manifest2＝24オブジェクトを非公開S3本棚へ保存。全22成果物および両manifestのGET照合完了。証跡 `build/s3-result.json` と `upload-status.json`。既存ロール・承認済み設定を利用し、容量例外を追加しなかった。
- Remaining Issues：Mac/iOS本棚の実機表示は未確認。PowerPoint本体実行・書体依存等は制作時の制約を継承。旧版の削除は実施していない。

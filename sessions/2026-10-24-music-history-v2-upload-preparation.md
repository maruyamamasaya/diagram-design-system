# 音楽史v2のS3・本棚公開準備

- Request：更新版もS3へ保存し本棚で閲覧。
- Investigation：既存承認はv1の93ではなく87対象ハッシュに限定。v2は89 PNG・PDF・PPTX・最小manifest2個の93対象、140,640,071 bytes。通常20MB/50MBのplanは通信前に停止。本番公開reader fingerprintはv1対応のまま。
- Changes：v2限定uploadアダプター・正確な保存manifest・容量承認案・共通SwiftとiOSページ制約の差分案・事前費用シミュレーションをoutputs内に準備。実装正本の容量台帳・AWSは変更していない。
- Validation：v2既存manifest依存を全ハッシュ照合。公式東京料金を当日再確認。追加保存約0.62円/月、作業約11.16円の想定（提示12円以内）。無料転送枠なし多用は月100円超のためキャッシュ利用を提示。
- Result：具体案はv2/build/aws-update-proposal.md。資料限定容量と既存API/アプリ反映を一括で承認依頼。
- Remaining Issues：本人承認待ち。S3書込・Lambda退避/変更・アプリ配布・本人API取得検証は未実施。

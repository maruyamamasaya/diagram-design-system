# S3全体の容量・料金調査
Request：アカウント全体のS3容量と予想料金。
Investigation：承認済み短期signinでListBuckets/GetBucketLocation、CloudWatch日次BucketSizeBytes/NumberOfObjects、Cost Explorer 1回（2026-10-01〜12排他、S3限定）を読取。AWS公式東京Price List 2026-09-28版を取得。
Changes：AWS変更なし。outputs/s3-cost-2026-10-12に容量/料金/単価/計算根拠を保存。
Validation：全4バケット東京、日次集計2026-10-11 UTC、全確認StorageTypeはStandardStorage、容量166,057,612 bytes。CEページングなし、Estimated=true。費用0.0001620397USD、保存/主要リクエストの計上0、適用割引等の原因は未確認。現在容量を1か月維持する標準保存料金0.00386633USD、東京標準リクエスト単価で10月1〜11利用量を31日へ外挿すると保存＋リクエスト0.190977USD。小量のglobal Requestsも東京換算、転送将来増加は外挿に含めない。
Result：1USD=160円・税10%の仮定で保存0.68円/月、標準単価で操作込約34円/月。請求実績単純外挿は0.08円/月だが確定請求・無料枠持続を保証しない。
Remaining Issues：容量は日次のため最新アップロード未反映の可能性、CE未確定。為替は相場取得でなく試算仮定。無料枠/割引の具体条件、将来転送増、KMS/API/Lambda料金は対象外。CE照会0.01USDはS3費用外。

# 縁起：調査と一枚図

Request：日常の「縁起がいい／悪い」と仏教の縁起を詳しく調べ、一枚絵にする。本人選択はイラスト＋図解。
Investigation：本願寺派・日蓮宗の公式解説、精選版日本国語大辞典・日本大百科全書を本文読取。語史の由来用法と教理を区別。十二縁起・大乗の空は調査ノート補足。
Changes：Agent Creation / hybrid、内蔵imagegenで植物挿絵、SVGで日本語比較と関係を構成。1600×1000、PNG3200×2000、PDF1枚。意味比較・語史・苦の生起と消滅を示す。
Files Changed：outputs/engi-study/creation、outputs/48a8cec1-75e5-4c2e-99b3-ad145f556a34/versions/000001、本記録。実装変更なし。
Validation：OFL/全グリフ/期待ラベル/境界/PNGデコード成功。PNG目視、PDFのPoppler再描画目視成功。PDF全ラベル抽出一致、フォント埋込確認、全成果物のSHA256一致。詳細はcreation/final-review.json。
Result：ローカルPNG/PDF完成。原資料・画像プロンプト・ジョブ・依存フォント情報とハッシュを保持。
Remaining Issues：宗派別教理詳細は図外の原資料に保持。外部端末・印刷は未検証。AWS操作なし。

## S3保存（本人承認後）
ユーザー「どうぞ！」でPNG/PDFの既存承認済みS3送信を明示承認。dry-run後、専用uploaderプロファイルで実行しcomplete。非公開S3の安全設定preflightと条件付き保存、PNG1,236,311 bytes／PDF1,822,142 bytesのGET・SHA256一致、最小manifestとcatalog完成を確認。計約3.06 MB。証跡は完成版upload-status.jsonとs3-artifacts-manifest.json。原資料・SVG・画像プロンプト・フォントは送信対象外。AWS設定変更なし。iPhoneからの今回資料の閲覧は未確認。

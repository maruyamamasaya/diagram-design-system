# 音楽史を除く大容量中間SVG・旧版の追加整理

- Request：残る大容量ファイルと旧版を確認し、音楽史以外で不要なものを削減。完成版と再生成に必要なものは保持。
- Investigation：CURRENT、保存ルール、local-output-cleanup、プレゼン契約、TESTINGを確認。metadata/package-manifestごとにPDF/PPTX/PNG、意味入力、描画コード、フォントと宣言ハッシュを照合。テスト出力は機械検査合格の記録とPNG・入力を保持する条件で別分類。原稿・素材SVGを対象にしない。
- Changes：51パッケージ（完成プレゼン21、検証出力30）の内部SVG635件を削除。旧版のPDF/PPTX/PNG、原資料、構成、登録、scenes、描画/変換コード、素材/台帳、フォント、manifest、検証記録は保持。音楽史は資料IDと8フォルダで除外。共有実装・AWSの変更なし。
- Files Changed：outputs/cleanup-record/2026-10-23-nonmusic-extended/のplan.jsonに列挙されたSVGのみ削除。同フォルダに監査・実行コード、保持ファイル、削除一覧と結果を記録。削除前用audit.py/apply.pyを再実行しない。
- Validation：metadataで宣言されたファイルのSHA256/サイズ、対象SVGの対応PNG、保持フォント6件の実読み込み、.lock不在とlsofによる稼働確認、削除直前のファイル一覧・SHA256再照合を実施。音楽史を含むoutputs全体の保持37,598ファイルは削除前後で全ハッシュ一致。シンボリックリンク4件もリンク先文字列を保持。
- Result：8,654,979,671 bytes（約8.65GB、8.06GiB）を追加削減。空き容量観測差は8,601,600,000 bytesで、論理削除量と区別。前回925,142,240 bytesとは別集計。
- Remaining Issues：全資料の完全再生成、新しい目視確認は未実施。完成版のない出力、再生成依存の対応が不明な出力は保留。既存PNG・一覧画像・検証証跡を保持。旧metadataのSVGハッシュは生成時証跡として不変のまま保持し、今回の削除記録を別置。後続の本人指示で音楽史も別の監査・実行へ追加。

# iOS図解優先と全画面プレゼン

- Request：SVG表示廃止、図解トップ、資料を大きく見せる、形式を簡単に選ぶ、前後／終了は小さくサイドへ。
- Changes：iOSタブ順、SVG表示除外、現在形式メニュー、全画面PDF constraints、サイド操作。
- Validation：22 XCTest合格、起動画面目視、実機署名build／更新／起動成功。新サイド操作の手動確認はUI操作のタイムアウトにより未確認。
- Result：更新済み。AWS・生成処理変更なし。iOS正本はdocs/presentation-focus-validation.md。

- Follow-up：左右独立60×56ptボタン、終了右上、プレゼン横／通常縦の自動回転、クラウドPNGページ送り、同一フォルダのローカルPNG送りを追加。23 XCTest／project検査／署名build合格、iPhone更新・起動成功。自動回転とPNG連続操作の実機手動確認は未実施。iOS側の検証正本に詳細を追記。

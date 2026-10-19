# iOS一覧の自動追加とキャッシュ先行表示

## Request
プレゼン資料等の「さらに読み込む」を廃止し、スクロールで段階表示。端末キャッシュは5GB上限。ログインや通信を待たず端末資料を表示し、更新を可能にする。

## Investigation / Changes
実装先は別repo `/Users/maruyamasusumuya/Development/zukan`。共通CloudLibraryView/Storeで末尾自動追加・失敗時再試行・一覧更新状態分離、CloudFilesで一覧先行復元と全利用者領域共通5GB一時キャッシュ整理、CloudOIDC/Appで前回の端末領域参照を追加。明示ログアウトで参照を削除。クラウド認証は維持。

## Files Changed
このrepoは本記録のみ。iOSの変更と検証の正本は別repo `docs/incremental-library.md` と `CURRENT.md`。

## Validation / Result / Remaining Issues
Simulatorの最終結果は上記仕様書に記録。AWS・公開API変更なし。実機への更新インストールと実通信・操作確認は未実施。

## 実機反映
本人の「デプロイまで」依頼後、既存Team/Bundle IDで署名Debug build・codesign検証合格。Vesperaへ更新インストール・更新版起動成功。保存資料の削除なし。実機操作は本人確認待ち。別repo outputs/incremental-library/device-{build,install,launch}.logに証跡を保存。

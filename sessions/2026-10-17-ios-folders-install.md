# iOSフォルダ整理版の実機更新

## Request
既存資料/タグ/まとめを残してiPhoneへ更新版を導入。

## Investigation / Changes
接続iPhone Vesperaと既存Zukanを確認。既存Team U29GY347DY・Bundle ID com.example.PresentationViewerのまま実機Debug buildとcodesign検証を実施し、devicectl install appで上書き更新。アンインストール/資料削除/データ変換なし。更新後terminate-existing付きで起動。

## Files Changed
zukan/CURRENT.md・docs/library-folders.mdに配布証跡を追記。本記録。

## Validation / Result
2026-10-17 22:03 JST、実機build・署名検証・インストール・更新版起動成功。/tmp/zukan-folders-device-{build,install,launch}.log。先行の最終Simulator59テスト合格を維持。

## Remaining Issues
実機内の既存データの目視とフォルダ操作は本人確認待ち。同期なし。

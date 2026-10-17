# iOS同期画面の実操作検証

## Request
専用ツールのSimulator接続を復旧し、初回統合・再送・競合解決まで確認。既存データ/AWSは変更しない。

## Investigation
アプリ一覧ではSimulatorが認識される一方、名前/bundle ID/パスによる接続はtimeoutReached。simctlは正常に応答し、起動デバイスなし。Simulatorの短時間スタック採取では主スレッドのイベント待ちが中心で、明確なデッドロックは特定できず。SimulatorプロセスだけTERMで終了し、専用ツールgetAppで再起動するとAX/画像取得が即復旧。CoreSimulatorサービス・権限・保存データは変更しなかった。内部根因は未特定で、アプリ側の接続状態が疑われる。

## Changes / Files Changed
実装修正なし。docs/organization-sync-ui.md、CURRENT.md、iOS docs/local-sync-ui.mdへ実検証結果を反映。本記録を追加。

## Validation
新規の使い捨てiPhone 17e/iOS26.5「Zukan Sync UI Validation」に既存検証ビルドを入れ、サンプルモードだけを使用。UI操作はすべて専用ツール。Python/Swiftの127.0.0.1模擬サーバーにだけ別端末操作を送った。

- 検証本棚のフォルダと同一ID/異名のサーバーフォルダを作り、初回両案表示と未選択時の確定不可を確認。端末案選択→確定→送信待ち1件。
- URLを127.0.0.1:1へ変更して送信→通信待ち/送信待ち1件保持。模擬サーバーURLへ戻して再送→同期済み/0件/版2。
- 端末のフォルダ解除と別端末renameを競合させ、両案表示/競合1件→サーバー採用→競合0件。
- 再度解除/別端末renameを競合させ、端末を採用して再送→待ち1件/競合0件→同期済み/待ち0/競合0/版5。サーバーのtombstoneも読取照合。
- 検証コピー解除→未接続。元organization.jsonが検証開始前とバイト一致、checkpoint削除を確認。

証跡：mac-app/.build/validation/ios-sync-ui/{conflict.png,final-state.txt,data-check.txt}（Git対象外）。synced.pngはスクロール位置が途中の補助画像で、最終状態の数値証跡はfinal-state.txtを参照。

## Result / Remaining Issues
依頼の実操作確認は成功。不具合修正は不要。実機/本番同期は検証対象外。専用ツール接続障害の内部根因は断定していないが、復旧方法を確認した。

一時サーバーを正常終了し一時領域削除を確認。今回作成したSimulatorだけshutdown/delete。再起動時に自動起動された既存iPhone17も停止済み（最終shutdown要求時には既にShutdown）。既存Simulatorを消去していない。一時比較JSON/スタックサンプルは削除。既存資料・AWS・本番APIへアクセスなし。

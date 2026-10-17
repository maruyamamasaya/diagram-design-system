# Mac/iOSの同期画面とローカル接続

## Request
両アプリへ同期処理/状態/競合解決画面を接続し、模擬サーバーで検証。既存資料/整理情報・AWS/本番は保持。最後に片付け、本人の追加依頼でコミット/プッシュ。

## Investigation / Changes
共有Foundationコアを維持し別ターゲットLibraryOrganizationUIへSyncLabSession/Viewを追加。両StoreからURLのないOrganizationDocumentへ投影、UUIDは大小文字を統一し不透明IDを保持。元の本棚を上書きしない検証コピーに限定。通常画面の編集の自動送信/受信書戻しは未接続。初回統合の確認、送信待ち/最終同期/競合両案/採用/再試行/チェックポイント復元/破損保護/検証解除を実装。検証画面内のフォルダ/所属/タグ/まとめ編集を接続。iOS保存先は利用者別領域を維持。

模擬CLIをOrganizationDocument対応にしsmoke-uiと一時serveモードを追加。SIGINT/SIGTERMでサーバーを閉じ一時データ削除。旧文書の移動前iOS絶対リンク1件を現在のGitHub正本へ修正。不要なテストのpreconcurrency注釈を除去。

## Files Changed
packages/LibraryOrganization（UIターゲット/portable member/checkpoint検証/HTTPハーネス）、Mac Store/View/PackageとSyncAdapterTests、隣接zukanのStore/Files/View/projectと取込テスト。共通/両repoの操作・仕様・入口文書。

## Validation
- 共有19（既存16＋UI3）/Mac24（既存23＋取込1）/iOS60（既存59＋取込1）全件合格。iOS新規テストのサンプルがSVG専用だったため、既存まとめ条件に合うPNG/PDFへ修正して再実行。
- 実loopback HTTP smoke-ui：初回確認/ACK喪失/再送/同資料の移動競合/競合再起動保持/解決/オフライン保持/再試行/親削除/元状態保持/解除成功。同期本体smokeもrevision4で成功。
- Mac release build成功、実outputs65冊/152版/注意0。
- CUAでdist検証ビルドを実画面確認：同期の検証→初回確認→3件送信待ち→応答喪失で通信待ち→再試行で版3同期済み。模擬peerのフォルダ変更で競合1件/双方内容を表示し、サーバー採用で0件。画面から検証コピー解除、閉じる、検証ビルド終了、Applications既存アプリに戻す。
- 元のMac library.jsonは検証前とバイト単位で一致。検証checkpointなし。確認用模擬サーバーを停止し一時ディレクトリを自動削除。
- iOSはSimulator build/XCTest合格。CUAは一度スクリーンショット取得できたが、その後timeoutReachedのため新画面の実タップは未確認。
- スクリーンショット/検証ログはmac-app/.build/validation/sync-ui（Git対象外）。文書リンク/差分確認を実施。

## Result / Remaining Issues
ローカル検証用として両アプリから接続可能。実端末へのLAN公開・AWS/API・本番データ・Applications置換・iPhone配布は行わない。本番の認証/自動同期/本棚への書戻しとiOS新画面の実タップ確認は次段階。[操作](../docs/organization-sync-ui.md)。

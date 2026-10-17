# Mac/iOS認証付きHTTPSと分割送信

## Request
認証付きHTTPSとAPI上限対応の分割を実装し、ローカル模擬サーバー/テストデータで初回統合・双方向・失敗再送を確認。AWSと既存データは変更しない。

## Investigation
共通の旧loopback transport、500操作バッチ、iOS既存CloudOIDC/Keychain、Mac/iOSテスト本棚、TypeScript bootstrap/50操作/256KiB制限を確認。APIの本番ルートは未有効化のまま保つ。

## Changes / Files Changed
共通AuthenticatedSyncConnection/Transport、型消去予約transport、実JSONサイズのbatch/10バッチ予算、SyncLabSessionのbootstrap/アカウント固定/待機/状態表示。UI側にMac用PKCE/Keychain/ブラウザー認証、Mac callback scheme。iOSは既存認証のscope付きlogin/forceRefresh互換wrapper/接続providerを再利用。両StoreとiOS Viewは明示テスト接続だけ注入し既定は未接続。TLS専用一時模擬serverとSwift検証CLI、共有/Mac/iOSテスト、関連文書を追加。

## Validation
共通39/Mac27/iOS66、API既存込み24と型検査。Macローカル配布build。PKCE既知値/不正callback、HTTPやredirect拒否、1回の401更新/403/別account拒否、件数/UTF-8 escape/1項目超過/分割予算/途中ACK後の同一ID再送を検査。実TLSは通常信頼が一時certを拒否→test実行バイナリ内だけleaf限定＋ホスト検証で接続。125フォルダ初回統合の2バッチ目でACKを落とし、部分保存/待機/再起動/同じIDの再送/双方向フォルダ・タグを確認。7変更バッチ、最大約8.1KB/8192-byte上限・37/50操作、revision/receipt127、401/更新各1回、受付5回。秘密値をログ出力せず、OS信頼設定は変更しない。iOSはURLProtocolで既存OIDC経由のbootstrapと分割も実行。実機/本番/新規ログイン画面操作は未実施。

## Result
認証付きHTTPS・bootstrap・分割を共通化し、両アプリの隔離テスト本棚へ接続可能。AWS設定/本番ルート/既存本棚/Applications/実機は未変更。実CognitoのMac client/callback/scopeと本番構成の組立・画面からの有効化は次工程。

## Cleanup / Remaining Issues
一時TLSサーバー/証明書/秘密鍵/JWT/Swiftテストデータは終了時削除。ログはmac-app/.build/validation/https-sync/。Mac/iOS両リポジトリへ今回分のみコミット/プッシュする。AWS変更前は最大状態CPUと分割時の通信を含む再見積もり・設定差分・承認を行う。管理バックアップはJSONだけ、資料本体の複製なし。

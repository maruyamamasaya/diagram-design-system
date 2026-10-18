# Mac/iOSの認証付きHTTPSと分割送信

最新状態：2026-10-18にAWS側の実Cognito/実HTTPS少量検証と有効化を完了。[配備の現在値](organization-sync-deployment.md)。以下のローカル検証時点の記録とは区別する。

2026-10-18。AWS/本番API/既存の本棚/実機iPhone/Applications版は未変更。実接続先を保存したり既存ログインを再実行したりしない。[API仕様](organization-sync-api-local.md)、[回数制限](organization-sync-quota.md)、[失敗待機](organization-sync-efficiency.md)。

## 接続と認証

共通AuthenticatedSyncConnectionは明示設定されたHTTPSのoriginだけへBearerを送る。HTTP/資格情報付きURL/パス/クエリ/fragmentを拒否し、URLはbootstrapから取り込まない。要求ごとにリダイレクトを拒否する。既定はOSの通常TLS検証・cookieなし・URLキャッシュなしのephemeral session。テスト用URLSessionの差替点はあるが、製品に証明書検証を無効化する設定を設けない。

GET /v1/organization/bootstrapから固定libraryID/版/5回・3600秒/最大50操作・最大262144 bytesを確認する。入力UUID欄をHTTPSへ流用せず、サーバーのUUIDを使う。操作はPOST /v1/organization/syncのbegin/sync/finish。接続先・issuer・subjectをcheckpointへ結び付け、異なるアカウント/接続先で既存キューを再開しない。認証token/refresh tokenはcheckpointや管理バックアップへ保存しない。

token提供元を毎要求確認し、issuer/subjectが違えば送信前に停止。401は同じ要求ID/bodyでsilent refreshを1回だけ試し、再401/403ならログイン確認へ戻す。5xx/ネットワーク失敗/汎用429は従来の永続待機へ渡し、即時連続再送しない。認証tokenの更新で操作IDを作り直さない。

Mac用には共有UI側のOrganizationOIDCを追加。ASWebAuthenticationSessionによる明示的なCode+PKCE S256、ランダムstate/verifier、完全一致callback、Keychain、silent refreshを実装する。subjectは未検証JWTから読まず、既存の認可済み /v1/meで確認する。Mac callbackはzukanbookshelf://oauth/callback、ビルド用Info.plistへschemeを追加。Cognito側client/callback/scopeは未作成/未変更なので実ログインは未検証。OrganizationOIDC.logoutは端末内Keychainからの解除で、サーバー失効や既発行JWTの即時無効化を保証しない。

iOSは既存CloudOIDC/Keychainを再利用。organizationSyncConnectionが同じ利用者のtokenを提供し、必要な再ログインではlogin(organizationSync:true)でread＋organization.syncを要求できる。既存の通常login/accessToken呼出は互換ラッパーで維持する。既定のログインscopeや本番接続設定は変えない。

両Storeに明示的なsyncConnection注入を追加し、Macの明示テスト本棚、iOSのSimulatorサンプル用テスト本棚だけへ渡す。通常起動は従来の検証コピーのまま。iOS Viewからも同じ接続を注入できる。HTTPS接続を作る/ログインする公開入口はあるが、実CognitoへのログインボタンやAWS設定の自動有効化は今回接続しない。実用有効化は承認された構成を組み立てる次工程。

## 分割と再送

OrganizationSyncTransportのbatch/maximumBatchesPerSyncにより、認証付きtransportは最大50操作と要求全体のJSON UTF-8サイズの両方でprefixを選ぶ。UUID/action/フィールド/escapeを含む実際のLimitedSyncRequestをエンコードして判定する。bootstrapの小さい上限にも従う。従来のloopback transportは既定の500操作を維持し、自動fallbackはしない。

親フォルダを先にする既存の順序を維持。1項目だけで上限を超えれば送らず、そのID/送信待ちを残して画面に理由を表示する。応答確認済みのバッチだけbaselineへ反映してキューから除去する。途中失敗では未確認の操作ID/payloadを保持し、checkpointを保存してから次の明示再試行で続ける。応答喪失でサーバーだけ確定した分はreceiptで重複適用しない。

1回の操作では最大10データバッチまで送信し、残りは送信待ちにして終了する。初回fetch＋確認後の送信に同じ受付を使う余裕を残す。再送でサーバーの12要求ID予算/受付10分を使い切った場合も残りを維持し、回数ルールに従って次の手動同期へ残す。新しい受付を自動で取り直して5回制限を迂回しない。

## 検証と再現

```sh
# Node.js 22以上、Swift、macOS標準openssl。AWS認証不要。
npm --prefix viewer run test:organization:https
CLANG_MODULE_CACHE_PATH="$PWD/mac-app/.build/clang-cache" \
 swift test --disable-sandbox --package-path packages/LibraryOrganization --cache-path "$PWD/mac-app/.build/cache"
```

TLS検証はNodeの一時HTTPSサーバーとMemory store、ローカル署名JWTで実行。Swift側のテスト実行バイナリだけに、一時leaf証明書の完全一致＋SSLホスト名検証をするdelegateを置く。証明書は127.0.0.1のSANを持ち、OS/ユーザーKeychainの信頼設定は変えない。最初に通常TLSがこの証明書を拒否することも確認する。証明書/秘密鍵/tokenは一時フォルダに置き終了時削除し、値をログへ出さない。

APIのbootstrapにテスト専用8192-byte上限を提示し、125フォルダの初回統合を分割。2バッチ目の保存後に応答を落とし、部分進捗/送信待ち/待機中通信抑制/再起動後の再送/二重適用なしを確認。iOS相当側のフォルダ追加→Mac取得→Macのタグ編集→iOS相当の取得まで往復する。結果は7変更バッチ、最大約8.1KB/8192 bytes・37/50操作、revisionとreceiptは127、期限切れtokenによる401とrefreshは各1回、全端末の受付合計5回。

これはMac上で動く共通Swiftセッション2個の実TLS検証であり、実iPhoneからのTLS接続ではない。iOS Simulator XCTestでは既存CloudOIDCからのBearer/bootstrapとバイト分割をURLProtocol模擬で実行する。Mac/iOSのStoreテストで接続が明示テスト本棚以外へ付かないことを確認し、旧データの保持を検証する。新しいログイン画面の実操作・実Cognito・実AWS・実機更新は未実施。

共通テストはPKCE既知ベクトル/不正callback、件数と日本語/escapeを含むバイト分割、単一大項目、部分ACK後の同じ操作IDでの復元、1同期のバッチ予算、401更新1回/403/別subjectへの切替拒否/別account checkpointの保存保持、endpoint/redirect/不正bootstrapを対象とする。証跡はmac-app/.build/validation/https-sync/。

## 次工程

AWSへサービスを組み立てて有効化する前に、最新料金と最大状態の実測、CognitoのMac client/callback/scope、API/IAM/固定管理キー/初期状態/feature flag/ロールバックの差分を提示して承認を得る。資料本体は従来S3から読み、管理バックアップは端末内JSONだけ。初回の分割通信が増える場合の費用も配備前に再計算し、既存の月額見積もりを上限保証にしない。

接続画面・Lambda組立・未適用templateは[本番接続準備](organization-sync-readiness.md)へ進んだ。既定無効、実AWS/実Cognito/実機は引き続き未検証。

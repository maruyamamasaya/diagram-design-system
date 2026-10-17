# 整理同期の無変更応答と通信失敗待機

2026-10-18。回数制限付きのテスト本棚と127.0.0.1模擬サーバーだけへ適用。AWS・既存本棚・実機iPhone・Applications版は変更しない。[回数制限](organization-sync-quota.md)、[AWS案と見積もり](organization-sync-aws-plan.md)。

## 無変更応答

端末の保存済みbaselineのrevisionを、送信待ちが空の場合だけknownRevisionとして送る。サーバーのlibraryIDとrevisionが一致すれば、応答はunchangedRevisionだけとし、snapshotを送らない。台帳だけの更新で整理revisionを増やさない。要求予算の保存は行い、authority/receiptの追加保存は省く。

端末は同じlibraryID・同じrevision・送信操作ゼロ・full replyとの混在なしを確認して、保存済みbaselineを使い続ける。編集のACKを省略版で代用しない。端末が状態を持たないfetchや版が異なる場合、書込・競合・削除の応答は従来の全状態とreceiptを返す。別端末の削除も新revisionで届く。初期の空baseline revision 0と空サーバーが一致する場合だけ初回にも省略版を使える。

OrganizationSyncTransportにbaseline付きsubmitを追加。既存transportは既定実装で従来のsubmitへ委譲し、旧経路を壊さない。新しい任意JSON項目なので旧クライアントの要求には全応答、旧サーバーの全応答も受け取れる。S3側が巻き戻された状態を同じ版として許す設計ではなく、配備/復元時も単調なrevisionを維持する条件は従来どおり。

## 失敗時は待つ

LimitedLoopbackTransportは1呼出1送信。通信失敗、HTTP5xx、回数制限のJSON以外のHTTP429で即時再送しない。SyncLabSessionがsync-throttle.jsonへ連続失敗数/次回可能時刻を原子的保存する。待機は30/60/120/240/480/900秒（以後900秒）＋0〜5秒jitter。Retry-Afterは秒とHTTP日付に対応し、指定時刻と端末の待機時刻の遅い方を採用する。

時刻までは手動同期・追加同意を押してもHTTPなし。アプリ再起動・同期解除・管理バックアップ復元でも同じ接続先/libraryIDの待機を保持。別接続先の待機とは分離する。待機後も自動タイマー再送せず、次の利用者による同期で試す。画面の時刻更新は通信しない。連続失敗を成功でリセットし、終了通信だけ失敗した場合も次の同期に待機を適用する。

受付UUIDと操作ID/payload・送信待ちは保存したまま。再試行では同じ受付が有効なら再利用する。HTTP要求IDは次の明示的な呼出で新規だが、操作IDはそのままなので保存済みreceiptが二重適用を防ぐ。期限/要求予算切れは回数ルールに従って新しい受付を得る。回数台帳の最大12要求ID・各3送信のサーバー検査は維持し、旧クライアント等の通信も無制限に許可しない。

既存の無制限検証コピー用Loopback transportは従来のまま別経路。普段の本棚/本番への自動fallbackはない。認証失敗/不正な入力/破損状態の応答を「成功」として扱わない。永続化に失敗した場合は同期を停止し、台帳を初期化して再開しない。

## 検証と再現

```sh
CLANG_MODULE_CACHE_PATH="$PWD/mac-app/.build/clang-cache" \
 swift test --disable-sandbox --package-path packages/LibraryOrganization --cache-path "$PWD/mac-app/.build/cache"
python3 scripts/organization-sync-http-check.py packages/LibraryOrganization/.build/debug/OrganizationSyncMock smoke-efficiency
python3 scripts/organization-sync-http-check.py packages/LibraryOrganization/.build/debug/OrganizationSyncMock smoke-limit
python3 scripts/organization-sync-http-check.py packages/LibraryOrganization/.build/debug/OrganizationSyncMock smoke-limit-concurrent
```

共通SyncEfficiencyTestsは指数待機/上限/jitter/Retry-After/JSON保存と成功復帰、無変更応答のlibrary/版/未送信操作検査・混在拒否・旧full replyを確認。HTTPは300フォルダ＋1タグの使い捨てデータで、503/Retry-After90秒→待機→保存後ACK喪失→再起動→再送→完了、待機中編集と追加同意での待機迂回拒否、別端末の初回全件/無変更/削除取得を検証する。時間は失敗待機用の注入時計だけを進め、サーバーの利用者台帳時刻は変更しない。

実測：無変更本文は最大25 bytes、比較する全snapshot本文は最小50,901 bytes（99.95%以上削減、HTTPヘッダー/TLSは別）。受付3・データ9・終了3の計15 HTTPと一致し、待機中連打/再起動に余分な要求なし。失敗を注入したHTTP要求も計数に含める。これは合成データの応答サイズであり、本番のサイズ/CPU時間ではない。今回ネイティブ画面操作は行わず、共通UIセッションの実HTTPと両アプリのテスト/ビルドで確認する。

HTTPの一時サーバー/状態とクライアントデータは終了時に自動削除。検証ログはmac-app/.build/validation/sync-efficiency/へ保持。AWS実測、認証付き配備、実機操作は未実施。

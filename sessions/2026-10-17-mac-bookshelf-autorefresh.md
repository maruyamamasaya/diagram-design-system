# Mac本棚の自動更新

- Request：新規制作後、更新ボタンなしで本棚へ反映。
- Investigation：Storeの再読込・security scope保持、Coreスキャンとmetadata完成条件、既存Swift Package/ビルド手順を確認。
- Changes：Mac専用BookshelfWatchingターゲットのFSEvents再帰監視。イベントを1秒デバウンスし連続書込は最長5秒で読込。初回スキャン前の監視開始、同一保存先の監視継続、保存先変更/解除、監視失敗の30秒代替、スキャン中の再実行、再アクティブ化の読込。共有Core/iOS/AWSは変更なし。
- Files Changed：mac-app/Package.swift、Sources/BookshelfWatching/FolderWatcher.swift、Bookshelf/Store.swift、Tests/BookshelfWatchingTests、mac-app/README.md、CURRENT/CODEMAP/ARCHITECTURE/TESTING、本記録。
- Validation：releaseビルド・署名検証合格。制限環境内ではFSEventStreamStartが拒否され、監視2テストは失敗。OS接続を許可した再実行で既存5＋監視2＝7テスト合格。/tmp/bookshelf-autorefresh-tests.log。実フォルダの新規階層/新版/監視解除/保存先切替を検証。
- UI Validation：/Applicationsのアプリを更新し起動。登録outputsに検証専用パッケージを新規作成し65→66冊、新版作成で同カードv1→v2、検証専用フォルダ除去で66→65冊。いずれもボタン/再起動/画面再アクティブ化なしの反映を確認。検証コピーは除去、元資料/本棚設定/アイコン/Dock固定は維持。
- Result：配置済みアプリで自動更新が有効。アプリ終了中は監視せず次回起動で取得。ハッシュ/制作完了品質の検証を増やす変更はない。iCloud/ネットワークボリュームの通知遅延・監視失敗代替の長期動作は未検証。

# iOS登録資料容量

- Request：登録資料最新版の容量・件数・更新日時をiOSに表示。S3全体はCLIで別確認。
- Investigation：既存認証APIの全一覧ページと詳細sizeBytesで対応可能。公開APIは毎秒1リクエスト。
- Changes / Files Changed：別repo Presentation-ViewerのCloudAPI.swift、CloudLibraryView.swift、CloudLibraryTests.swiftと関連仕様・現在地・検証記録。こちらのAPI/AWS/生成・保存実装は変更なし。
- Validation：iOS Simulator29 XCTest合格、構造検査・差分検査合格、サンプル2件2.4 MBの容量画面目視。署名なし試行のKeychain失敗は通常Simulator署名で解消。
- Result：その他→登録資料の容量、初回集計と更新、旧版・管理ファイル除外、部分合計拒否。
- Remaining Issues：実S3集計・iPhone更新未実施。集計は資料数に比例するAPI通信、catalogキャッシュ最大60秒と同時更新の制約あり。正本は別repo docs/cloud-library.md / docs/capacity-validation.md。

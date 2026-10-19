# ローカルMacのビルドキャッシュ整理

- 依頼：先行の中間成果物整理後、ビルドキャッシュ・一時ファイルの削除について本人承認。
- 対象：プロジェクトのmac-app/.build、packages/LibraryOrganization/.build、viewer/.next、Xcode DerivedDataの子ディレクトリ、/private/tmp内でビルド構造を確認したBuild/ModuleCache/Index、限定したSwiftビルド・モジュールキャッシュ。
- 結果：500ディレクトリ、227,045ファイル、16,871,177,156 bytes（約16.87 GB）を削除。ファイルの割当サイズ合計は17,434,849,280 bytes。実ディスク空き容量の増加はAPFS共有・スナップショット等の影響を受けるため未計測。
- 検証：削除直前に実行中のコンパイラ・ビルド処理がないことを確認。削除後に全対象の消失を再確認。
- 保持：原資料、納品物、ソース、利用者データ、Xcode Archives、DeviceSupport、CoreSimulator、検証画像・ログ、用途不明の一時フォルダー。保持する主要開発ディレクトリの存在を確認。AWS操作なし。
- 記録：outputs/cleanup-record/2026-10-19-build-caches.json。キャッシュ再生成・再ビルドは今回未実施。次回ビルドはキャッシュを作り直すため通常より時間がかかる。

# スマホ本棚と共通ゴミ箱の実装準備

依頼：選択済みの常設フォルダ案をまずiPhoneへ実装し、Macと共通のゴミ箱・全版/S3/端末内コピーを対象とする完全削除へ進める。

## 変更

- zukanの作業コピーに上部の薄い本棚バー、常設フォルダ一覧、現在地/件数、直接検索、種別切替/分類/タグ/管理、複数選択の移動/復元/削除確認を実装。閲覧経路・端末単独の非表示設定は維持。
- iOSの既存HTTPS要求を全インスタンスで1.1秒以上に調整。保存領域の削除通知をキャッシュと分離し、通知永続化→アプリ所有コピー削除→遅延応答の再保存拒否。追加XCTestを作成。
- 共通Swiftへ資料状態/削除計画/端末index/認証クライアントを追加。Macに共通ゴミ箱入口/選択復元/完全削除確認/通常一覧からの除外を追加。登録した制作原本は自動削除しない。
- APIはrevision/CASによる移動/復元、確認digest、削除中の再送、対象prefix限定、SSE-S3/owner固定、バージョニング拒否、残存確認、永続deleted記録を追加。既定は無効。
- 詳細の正本：[共通ゴミ箱](../docs/shared-library-trash.md)。CURRENT/CODEMAP/ARCHITECTURE/TESTINGと先行ゴミ箱仕様へ参照を追加。

## 検証

- viewer：全32件中31合格・1スキップ。認可、未知body、既定無効、CAS競合、計画変更、通信中断/再送、他prefix拒否、S3条件付き保存/暗号化/owner、バージョニング拒否、削除後残存による完了拒否を含む。TypeScript型検査合格。
- 共通Swift：43件合格。永続化/古い応答での復活防止/同版矛盾/復元を追加。
- iOS：iOS 17 target/iPhoneOS 26.5 SDKによる全アプリ/XCTestソース型検査合格、アプリSwift module生成成功。通常XcodeビルドはユーザーSwiftPMキャッシュ書込・CoreSimulatorへの接続拒否で完了せず。追加XCTestのSimulator実行、新画面目視、実機更新は未完了。
- Mac：ビルド成功。全27テストで1スキップ・21アサーション失敗。ドラッグ14と監視7。変更前のドラッグ処理を含む検証コピーでも6テスト/14アサーション失敗が再現。Pasteboard/NSXPC/FSEvents接続が利用できない環境のため、全体合格とは扱わない。
- iOS差分は元repoに対する`git apply --check`合格。ルート`git diff --check`合格。ログ/差分/作業コピーはGit除外の`outputs/mobile-bookshelf-implementation/`。

## 未完了と安全境界

zukanはこのチャットの当初の書込ルート外。本人が許可追加を回答した後とNode実行環境再初期化後も、既存ファイルの同内容書込がEPERM。元repoは変更できず、許可領域に5ファイルの差分を用意した。作業コピーのpackage参照だけは検証用の絶対パスで、納品差分には含めない。

共通ゴミ箱はサーバー/両Bundleとも既定無効。AWS、実資料、利用者管理設定、実機、Applications版を変更していない。公開有効化前に、同一IDへの生成/uploadと削除の排他、legacy取り込み/レート制限の追加検証、具体的な構成/料金と別承認が必要。削除対象の実資料は指定されていないため、実削除を検証していない。

作業中に別処理の`Work sync 2026/10/19, 9:17`が途中の変更をGitへ取り込んだ。エージェントによるcommit/pushは実行していない。既存の他作業のsession記録を変更していない。

## 続行：元repo反映・実機確認準備（2026-10-19）

本人の明示依頼後、承認付きexecで元zukanへの差分適用が成功。既存Team/Bundle IDで署名build/codesign合格、Vesperaへ同Bundle ID更新/起動成功。最初のSimulator試行はarch混在で失敗し、arm64明示で68 XCTest・失敗0。新本棚の画面要素はCUAの読み取りで確認、画像取得/後続操作はtimeout。実機操作は本人確認待ち。共通ゴミ箱は引き続き本番無効、AWS変更/実削除なし。iOS正本はzukan/docs/mobile-bookshelf-deployment.md。

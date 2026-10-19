# 常設本棚と共通ゴミ箱（実装中・本番無効）

2026-10-19。本人が選んだフォルダ常設案をiPhone向けに実装。上部に現在の本棚・件数・検索・選択・管理、左にすべて/未整理/階層フォルダ/ゴミ箱を置く。既存の資料種別切替・分類・タグ・非表示・まとめ・閲覧は維持する。

## 今回の状態

- iOSの実体は隣接 `zukan`。このチャットの許可に旧 `Presentation-Viewer` が残り、本人が追加したとの回答後も実書込はEPERMだったため、`outputs/mobile-bookshelf-implementation/zukan` に作業コピーを置いた。その後、本人の反映/実機確認依頼を受けた承認付き実行で元repoへ適用済み（2026-10-19）。
- iOS差分は `outputs/mobile-bookshelf-implementation/ios-mobile-bookshelf.patch`。元repoで `git apply --check` 合格。共通LibraryOrganizationの今回の追加も必要。作業コピーのXcode package参照は検証用の絶対パスであり、元repoの相対参照は変更しない。
- 共通Swiftモデル/認証クライアント、API状態遷移/S3アダプター、Macの入口とゴミ箱シートはこのrepoに実装。Mac全体の再デザインは含まない。
- `VIEWER_LIFECYCLE_ENABLED`（サーバー）、Bundleの `LibraryLifecycleEnabled`（両アプリ）は既定無効。未配備APIを利用可能と表示せず、ゴミ箱はサーバー反映待ちと表示する。AWS/利用者設定/Applications版を変更していない。iOSはVesperaへ更新・起動済みで、新ゴミ箱のフラグは無効のまま。

## 操作と同期

共通ゴミ箱は単一ownerの資料ID全体に適用。資料本体やフォルダの同期とは別の永続状態を使う。通常一覧/まとめ/オフラインコピーで `trashed` / `deleting` / `deleted` を除外し、ゴミ箱では `trashed` / `deleting` を表示。フォルダ所属は保持し、存在する元フォルダへ復元する。親フォルダが解除されていれば既存の所属解除に従い未整理になる。

旧iPhone単独の非表示を自動で共通ゴミ箱へ移さない。既存クラウドの `library/state/` のtrashed状態はS3アダプターで読取り、最初の明示操作で新namespaceへ条件付き作成する。新状態があれば旧状態より優先する。旧ファイルを上書きしない。

通信は既存HTTPS/Bearer/owner認可を利用。Macは共有認証接続のアカウント固定・silent refresh・要求間隔を継承。iOSは既存HTTPSクライアントのAPI要求間隔を全インスタンスで1.1秒以上に調整し、両ライブラリの大量選択でも共有する。429時の再試行表示は配備前の確認項目である。

## API（フラグ有効時だけ）

- `GET /v1/library-lifecycle`：完全な状態一覧。schemaVersion=`library-lifecycle-1.0`。欠落をactiveや削除済みと推定せず、端末では版の古い応答を適用しない。
- `POST /v1/library-lifecycle/{id}/trash|restore`：bodyは `{revision}` のみ。CAS競合は409。削除中/削除後は復元不可。
- `GET /v1/library-lifecycle/{id}/deletion-plan`：資料ID・状態版・対象キー集合のdigest、全版の成果物容量、管理JSONを含むオブジェクト数。
- `POST /v1/library-lifecycle/{id}/delete`：bodyは確認済み `{digest}` のみ。任意のキー/パスをクライアントから指定できない。

状態ファイルは `library/lifecycle/{id}.json`。書込はSSE-S3/ExpectedBucketOwner/If-None-MatchまたはIf-Match。既存資料の取得・通常一覧でも共通状態を確認する。旧trash/restore書込は新フラグ有効時にUSE_LIBRARY_LIFECYCLEで拒否し、二つの正本を作らない。

## 完全削除と端末コピー

確認済みキー集合を永続的な `deleting` 状態へCAS保存し、資料ID配下の許可リスト（未公開の中断アップロードも含む）からS3成果物/版別manifest/catalogを削除、すべての削除と対象prefixの残存検査が成功後に `deleted` の記録を残す。途中失敗時も同じdigestで再試行可能。対象の追加版でdigestが変われば再確認を要求する。S3バージョニング有効/停止済みバケットは、delete markerを完全削除と誤認しないよう拒否する。

端末は `deleted` の通知を管理領域へ保存してからコピーを消す。iOSは利用者別の保存ファイル・全版キャッシュ・詳細/一覧を整理し、取得中の遅い応答による再保存を拒否。キャッシュ削除や古い応答でも削除記録を保持。失敗したコピー整理は次の読込時に再試行する。

Macは今回アプリ所有のクラウドコピーがまだない。将来のコピー専用namespaceだけを自動削除の対象にし、現在の登録フォルダにある制作原本を削除しない。完全削除時はMac通常一覧/プレビュー/まとめからも除外する。別アプリへ書き出したファイルや、外部で開いたファイルを回収する機能ではない。オフライン端末への反映は次の接続時となる。

## 本番有効化前の残件

1. 元zukanへの適用、署名付きXcode build/codesign、arm64 Simulator68 XCTest、Vespera更新/起動は完了。画像目視と本人の実機操作確認を行う。
2. 新APIの認証付きHTTP/S3モックを広げる。特にlegacy state取り込み、コピー削除失敗、iOSの公開APIレート制限を確認する。S3 CAS/暗号化/限定キー/バージョニング拒否と削除途中の再実行はモックで合格。
3. 資料単位のCASロックをupload・移動・削除で共用する実装とモック検証を追加済み。配備時に全保存CLIを更新し、承認済み設定の `lifecycleProtection` を有効にする。旧CLIや管理者の直接S3書込を排他する仕組みではない。クラッシュしたuploadのロックは自動期限切れにせず、旧処理の停止を確認後に個別復旧する。
4. 既存AWSのバージョニング/削除拒否/条件付き更新ポリシーを読み取り確認。新prefixのGet/Put/List、限定した成果物/catalogのDeleteObject、GetBucketVersioning、既存Denyとの整合を具体化する。DeleteObjectVersion・他prefixの削除・公開設定を追加しない。
5. [コスト方針](cost-policy.md)に従う試算と具体的IAM/bucket policy/Lambda差分を提示し、本人の別承認後に適用。今回の実装依頼をAWS変更・実資料削除の承認と扱わない。

## 検証記録

ログは `outputs/mobile-bookshelf-implementation/`。API全回帰31件合格・1件スキップ、型検査合格。共通Swift43件合格。iOS SDKで全アプリと全XCTestソースの型検査合格（アプリのSwift module生成も確認）。追加のiOSコピー削除を含むSimulator68 XCTest・失敗0。元repoの署名付き実機build/codesign・Vespera更新/起動も成功。

Macはビルド成功。全27テスト実行で1件スキップ、ドラッグ/監視に21アサーション失敗。変更前コードの作業コピーでもDragTestsの6テスト・14アサーション失敗を再現。Pasteboard/NSXPC/FSEventsへ接続できない環境であり、全テスト合格とは報告しない。iOSの通常ビルド/CoreSimulatorの拒否は承認付き実行で解消した。画面読み取りで新本棚の要素を確認したが、画像取得はtimeout。新画面の画像目視、本番S3/認証APIでのゴミ箱操作、実機でのコピー削除は未検証。

## 2026-10-19 配備準備

AWS読取では東京リージョン、S3バージョニング未設定、AES256、公開ブロック4項目有効、catalog 53オブジェクト/45資料、旧state・新lifecycle・ロック各0件を確認。既存Lambdaは256MB/20秒、ログ14日。新APIは未配備、機能フラグは無効。具体的な変更と試算は[承認案](shared-trash-aws-proposal.md)。

Macは前回アカウントの削除通知を起動時に先読みし、壊れたキャッシュでは資料を公開せず完全な状態取得を待つ。認証接続を再利用する。APIは一覧ごとの状態全件取得を重複させず、既存stateはprefix一覧から実在分だけ取得する。状態500件/計画10000キーを上限とし、超過時は処理を停止する。

# Macプレゼン読込の継続調査

## Request

Mac版のプレゼン資料の読み込みがまだ非常に遅いため調査する。

## Investigation

配布済みApplications版とローカル候補の実行ファイルが異なること、通常本棚を開くプロセスがApplications版とdist版の2つ起動していることを確認。別途一時state付きの検証用プロセスもある。本人のアプリを強制終了・置換していない。

Applications版をCUAで図解32件からプレゼン16件へ切り替え、GitHub v3/46ページの「資料を取得中」と、その後のPDF本文表示を確認。取得中のsampleでキーチェーン停止は見られず、表紙取得/キャッシュ整理と画面更新・ダウンロード処理の実行を確認。エンドツーエンドの厳密な秒数は計測していない。

確定した問題：`CloudBookshelfClient.pruneCache`は表紙のみの版も30件枠に数えていた。48資料の一覧を横断すると容量が小さくても既読PDFごと整理され、再取得が発生し得る。アカウント別コピーを読取集計した時点で30版・34.03MiB・PDF4版だった。個別の消去履歴は残っていないため、今回選んだGitHubの待ち時間の全てがこの原因だったとは断定しない。APIの1.1秒間隔や初回通信も別の待ち要因として残る。

## Changes / Files Changed

Mac `CloudBookshelf.swift`の件数枠を本文取得済みの版だけに適用。表紙のみは合計512MiBの容量枠へ含め、30本文版の枠を消費しない。既存の取得中保護・SHA256照合・認証・保存先隔離・削除通知を維持。共通同期・iOS・AWSは変更なし。

`CloudBookshelfTests`へ48表紙＋古いPDF保持、本文版枠超過、合計容量超過の回帰を追加。仕様正本とCURRENTを更新。前作業のフォルダ統合変更を保持。

## Validation

Mac Swift34件、1スキップ、失敗0。ログoutputs/mac-cache-preview-quota-tests.log。release署名ビルド成功（outputs/mac-cache-preview-quota-build.log）。Applications版は置き換えていない。両repoのgit diff --checkで変更の書式確認。

## Result / Remaining Issues

既読PDFの再取得を増やす具体的な不具合をローカル修正。Applications/実機は未更新。修正後の本番速度比較、全資料の初回取得速度、重複起動の整理は未実施。キャッシュ内容やS3資料を調査のために消去していない。

# 図解のまとめをフォルダへ統合

## Request

図解/プレゼンを大項目にし、それぞれでフォルダを作成可能にする。図解の「まとめる」はフォルダへ統合。

## Investigation

Macと隣接zukanのiOSは共通整理パッケージを利用。従来は共通フォルダと図解専用の順序付きまとめが別操作だった。まとめは複数所属を許すため、単一所属へ単純変換すると情報が欠落する。

## Changes / Files Changed

共通`LibraryFolders.swift`に種類別の親・旧共有ツリーの決定的分割・旧まとめのフォルダ化・補助所属を追加。既存スキーマと同期APIは維持。Mac `Store`/`BookshelfApp`/Core、zukan `CloudFiles`/`CloudLibraryStore`/`CloudLibraryView`/`CloudModels`で一覧・作成・移動・名前変更・解除を統合。iOS保存は既存管理ジャーナルを利用。古い内部APIの既定動作は互換維持。詳細は[仕様](../docs/unified-library-folders.md)。関連正本とCURRENT/CODEMAP/TESTINGを更新。

## Validation

- 共通Swift 48件失敗0。複数所属・順番・移動・解除・旧階層/画像/種類別分割・再実行/再保存を検査。
- Mac Swift 33件、1スキップ、失敗0。Pasteboard/FSEventsのsandbox拒否は通常環境で再実行して合格。
- iPhone 17 / iOS26.5 Simulator XCTest75件失敗0。新規統合テストは旧まとめ表示相当のモデル、種類別独立、名前変更、移動、空フォルダ保持、再起動、解除を確認。初回のアーキテクチャ不一致はarm64明示で解消。
- Mac release署名ビルド成功。dist内に生成し、Applicationsは更新していない。
- CUA：識別子を`jp.local.zukan.foldercheck`に分けた検証用アプリと`/private/tmp/zukan-folder-ui/library.json`で画面確認。図解の旧まとめフォルダ表示、作成メニュー一本化、新規`Diagram folder check`作成、プレゼンへ切替時に当該フォルダが混ざらないこと、図解へ戻した一覧の余白/重なりなしを確認。入力はAX setValueで実施。実データは変更していない。
- 両repoのgit diff --check合格。ログ：outputs/folder-unification-{shared-tests,mac-tests,mac-build}.log、/private/tmp/zukan-folder-unification-tests.log。

## Result / Remaining Issues

ローカル実装・回帰・Mac画面確認完了。AWS変更なし。実機更新、iOS画面の手操作、更新後の本番双方向同期は未実施。配布時は旧表示との混在を避けるためMac/iPhone/iPadを揃える。

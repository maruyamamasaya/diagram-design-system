# iOS本棚のフォルダと複数選択

## Request
共通仕様を使いiOSへフォルダ表示と複数選択移動を追加。既存タグ/まとめ/保存済みを保持し同期は作らない。

## Investigation / Changes
実装対象は隣接Development/zukanのCloudFiles/CloudLibraryStore/CloudLibraryView。共有OrganizationStateを利用者別organization.jsonで保存し、既存classifications/collections/index/本体は維持。全て/未整理/階層フォルダ、フォルダ作成/解除、複数タップ/表示中全選択/一括移動を追加。選択中とフォルダ絞込中はまとめを個別資料表示するが、読む順番や所属スナップショットは変更しない。保存済み/まとめ内の未取得資料も既知IDとして扱う。未知ID/移動先を拒否し、失敗時は元の状態を保持。

## Files Changed
zukanのCloudFiles.swift、CloudLibraryStore.swift、CloudLibraryView.swift、CloudLibraryTests.swift、docs/library-folders.md、CURRENT/README。本repoはCURRENTと本記録。

## Validation
新規2テストは階層/一括移動/未整理/復元/親解除/既存タグ・まとめ・保存済み記録保持/利用者分離/未知ID/書込失敗時保持。SwiftUI式の型検査時間超過はカード描画関数分離で解消。59 XCTest合格を確認し、最後の表示調整後も全件再実行し59件/失敗0・TEST SUCCEEDED（22:01 JST）。両repoのgit diff --check合格。専用画面操作ツールはSimulatorの接続で2度timeoutReachedのため、実タップ/画面目視は未確認。別方式のUI自動操作は行わない。

## Result / Remaining Issues
同期・AWS/API・外部資料タブ・実機配布は今回対象外。画像設定/名前変更/順序編集/ドラッグは未追加。実画面操作の確認は残る。

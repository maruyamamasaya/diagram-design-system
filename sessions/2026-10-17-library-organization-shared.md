# Mac/iOSの整理機能共通化

## Request
共通データ仕様とSwiftパッケージを作成し、既存Macフォルダ/iOSタグ・まとめを引き継ぐ。同期は実装しない。

## Investigation
MacはLibrarySettingsの仮想階層フォルダ/UUID順序/単一所属、iOSは利用者別classifications.json/collections.jsonとCloudDiagramの順序付きスナップショット。iOS現リポジトリはDevelopment/zukan（旧Presentation-Viewerから移動）。既存未コミット変更を維持。

## Changes / Files Changed
packages/LibraryOrganizationにFoundationのみのSwiftパッケージ、共通型・フォルダ処理・タグ正規化・まとめ構造検証・旧JSON純粋取込を追加。Macは互換型aliasと処理委譲、iOSは分類/まとめaliasと従来閲覧検証extensionへ移行。ローカルSwiftPM/Xcode参照を接続。docs/library-organization.mdを仕様正本とし入口文書更新。稼働中のデータを書換えない互換移行。

## Validation
共有4テスト合格（旧設定/分類/まとめのラウンドトリップ、順序・画像・タグ保持、旧任意項目、未知版/破損拒否、選択移動、タグ正規化、まとめ重複）。Mac21テストとrelease build合格、実outputs65冊/152版/注意0。iOS Simulator generic build合格。初回testはCPU成果物混在、arm64再実行の署名なしではKeychain2テストに3失敗。通常署名で最終コードを再実行し57テスト/失敗0、TEST SUCCEEDEDを確認。両repoのgit diff --check合格。

## Result / Remaining Issues
仕様と共有コードを両アプリへ接続。同期・アプリ画面統合・iOSのフォルダUI・実機配布・Applications置換は実施しない。独立リポジトリCI/配布には今後パッケージのGit固定参照が必要。フォルダアイコン本体の移送、包括的な参照整合性検証、端末間ID照合/衝突解決は次段階。

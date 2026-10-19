# 両リポジトリの未コミット変更確認

## Request
diagram-design-systemとzukanの全変更を確認し、問題がなければコミット・プッシュする。

## Investigation
差分、共通フォルダ層、Mac/iOSの保存・移動・旧まとめ互換、キャッシュ整理、関連テスト・仕様を確認。リモート取得後、両mainに先行・遅延なし。修正を要する問題は確認されなかった。

## Changes / Files Changed
既存のフォルダ統合、iPad横断表示、Mac本文キャッシュ修正、関連仕様・テスト、茶室史の制作記録2件を保存。本記録を追加。制作成果物outputsは既存方針どおりGit対象外。

## Validation
- 共通Swift：48件、失敗0。
- Mac Swift：34件、1スキップ、失敗0。
- Mac releaseビルド・アドホック署名成功（distのみ）。
- 隣接zukan：iPhone 17 / iOS 26.5 Simulatorの75 XCTest合格。
- 文書リンク231件、欠損0。両repoのgit diff --check合格。
- ログ：/tmp/commit-review-{common,mac,mac-build,ios}.log。

## Result / Remaining Issues
コミット前の差分確認と関連検証完了。今回の画面手操作・本番同期・実機配布・AWS変更は実施していない。過去の画面確認・配布範囲は各既存記録を参照。

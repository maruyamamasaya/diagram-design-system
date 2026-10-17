# 未整理への一括ドラッグ

## Request
左側の未整理へ選択資料をまとめて戻す。進捗を分かりやすく説明する。

## Investigation / Changes
BookshelfAppの未整理行へ既存FolderDropSurfaceを26ptで追加。既知資料IDだけを受け、moveBooks(to:nil)で一括解除。固定行はフォルダ並べ替えの候補・OSフォルダ受信から除外。フォルダ自体と原本は維持。

## Files Changed
BookshelfApp.swift、FolderDropSurface.swift、DragTests.swift、mac-app/README.md、CURRENT.md。

## Validation
Swift21テスト合格。未整理への複数ID解除・対象外の分類保持・固定行へのフォルダ並べ替え拒否を追加検証。release buildとApplications更新、署名検査成功。CUAで2冊を技術へ一括分類→2冊を未整理へドラッグ→技術0冊/未整理65冊を確認。画像はmac-app/.build/validation/unfiled-drag/result.png。元の分類へUIで復帰後、library.jsonは検証前と一致。実outputs65冊/152版/注意0。

## Result / Remaining Issues
配置済みアプリで利用可能。iOS/同期/AWSは変更なし。今回の未整理操作に未完了事項なし。

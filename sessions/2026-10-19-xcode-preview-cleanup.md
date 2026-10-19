# Xcodeプレビュー専用データの整理

- 依頼：安全に削除できる場合、Xcodeプレビュー用データを削除してよいとの本人承認。
- 対象：Library/Developer/Xcode/UserData/Previews内の専用Simulator DevicesとSimulator%20Devices。
- 事前確認：Xcodeと通常Simulatorは起動中だったが、専用device setのiPhone 17 ProはsimctlでShutdown、lsofの全プロセス走査で対象ファイルの利用なしを確認。
- 操作：専用device setを指定してsimctl deleteで停止済み端末を削除し、残存するプレビュー専用ディレクトリを削除。通常のLibrary/Developer/CoreSimulator/Devicesは保持して存在確認。
- 結果：27,182ファイル、3,346,150,711 bytes（約3.35 GB）を整理。Previews親ディレクトリは空で保持し、削除後の空状態を再確認。
- 証跡：outputs/cleanup-record/2026-10-19-xcode-previews.json。プレビューの再生成・再起動は未実施。AWS操作なし。次回プレビュー時は必要データの再作成が発生する。

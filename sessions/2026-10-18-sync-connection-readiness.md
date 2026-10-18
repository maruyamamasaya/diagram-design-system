# 整理同期の本番接続準備

Request: ロードマップの本番接続前仕上げをまとめて進める。AWSと既存データは変更しない。
Investigation: 認証/分割/バックアップbindingは既存実装を利用可能。新しい画面入口・Lambda組立・未適用構成が残っていた。
Changes: 共通SyncSetupView、Mac/iOSメニューと追加scopeログイン後の統合確認、既定無効の組立、固定管理キーの権限/既存Cognitoを再利用する未適用template、初期管理JSONとUUID/hashを作るオフライン準備CLI。初回/多分割料金を追加。
Files Changed: 共通UI、Mac Store/View、iOS CloudOIDC/Store/View/App、viewer runtime/lambda/test/準備CLI、infra案、料金/運用正本。
Validation: 共有40/Mac27/iOS66/viewer25合格。viewer typecheck/build、Mac release/codesign、Lambda bundle成功。実TLSは125folder、7変更batch、最大8146/8192 bytes、partial ACK喪失/待機/再起動/同操作ID再送/双方向、receipt=revision127/受付5を再確認。初期JSON hash/空状態/固定UUID、元templateの非対象resource維持、上書き拒否、文書リンク179/差分を確認。公式9単価を公開価格JSONと再照合。
Result: 通常+初回追加約7.71円/月、毎時5回×10データ通信は約165.78円/月。100円保証なし。AWS/本番API/Applications版/実機/既存管理JSON未変更。コミット対象外の既存sessionファイルを維持。
Remaining Issues: AWS GetTemplateは短期セッション期限切れ、ライブ差分未確認。専用CUAのSimulator取得は2回timeout、新画面操作未確認。実Cognito/実端末同期未検証。MacのS3一覧/本体取得は別未実装。詳細はdocs/organization-sync-readiness.md。テストログはmac-app/.build/validation/sync-readiness、準備bundleはoutputs/organization-sync-readiness/review-20261018（Git除外）。

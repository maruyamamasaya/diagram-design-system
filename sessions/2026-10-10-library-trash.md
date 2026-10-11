# クラウド資料のゴミ箱

- Request：クラウド資料をゴミ箱へ移動できるようにする。完全削除は含めない。
- Investigation：既存API/ロールは読取用、iOSにキャッシュ削除だけ存在。生成・uploadと切り離した資料ID単位の状態を採用。
- Changes：状態保存、active/trashed一覧、移動/復元API、取得拒否、iOSカード操作・確認・ゴミ箱。AWS未適用の別構成案。
- Files Changed：viewer/src/lib/api.ts・store.ts、viewer/tests/trash.test.ts・package.json、別repo CloudAPI/CloudLibraryStore/CloudLibraryViewとCloudLibraryTests、仕様と入口文書。
- Validation：API12テスト・typecheck、viewer build、Lambdaローカルbundleを検証。Simulator38 XCTest合格（新規ゴミ箱検証を含む）。最初の2試行は容量試験で中断し失敗、実行を分離した3回目で全件合格。本番AWS/実機/新画面目視は未実施。
- Result：ローカル実装。本番の権限・コード・環境設定反映と既存iPhone更新は承認前。
- Remaining Issues：既存S3 URL最大300秒・端末コピー残存。保存料継続。完全削除なし。同時操作は最終保存優先。デプロイ前に実スタックとの差分を照合する。

## 承認後デプロイ

- Approval：本人「完了したら、デプロイまでお願い」。本番コード・state専用権限・設定と既存iPhoneの更新を承認。
- AWS：実スタックのOriginal templateを読み、Roleのstate専用List/Get/PutとFunctionのtrash flagを追加。他パラメーターはUsePreviousValue、CodeKeyだけ新hashへ。変更セットはRole/FunctionとFunction.Arnに伴うIntegration間接更新、全Replacement=False。UPDATE_COMPLETE。
- Verification：コードSHA256 `ng0XPzvpERAdkHRS8WQp2Ov3urbPU1rXWx3qm4zkd/c=` がローカルzipと一致。既存Role/owner/Memory256 MB/Timeout20秒維持、trashEnabled=true。HTTPS一覧/ゴミ箱一覧/me/trashは未認証401。
- iOS：既存TeamでDebug署名build・codesign検証成功。既存Vesperaへ同Bundle IDで更新インストール・旧プロセスから更新版起動成功。最初のTeam未指定buildは失敗、既存設定指定後成功。
- No actual document was moved to trash during verification. 認証済み本番の移動/復元と新UI目視は未実施。端末操作の本人確認待ち。
- Evidence：outputs/library-trashの変更セット・verification・https-smoke、別repo outputs/library-trashのbuild/install/launch。正本のinfra/phase11b2-deployment.jsonを更新。

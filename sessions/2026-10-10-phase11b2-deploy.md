# Phase 11B-2 deploy

Request：構成／パラメーターを記録し、未完了ならデプロイ、両repoをコミット／push。
Investigation：短期認証をCLIで更新。既存アカウント・承認済み構成・コードを照合。
Changes：専用コードS3キー、Cognito/HTTP API/Lambda/読取ロール/Logsを作成。iOSに公開値だけを反映。ownerは本人メール回答待ちでUNCONFIGURED。
Validation：CREATE_COMPLETE。実HTTPS未認証401・password route404。Lambda CodeSha256一致。初回Tags形式失敗でrollback、今回の空スタックを整理し修正後成功。
Files Changed：infra/phase11b2-deployment.json、scripts/deploy-phase11b2.cjs、docs/phase11b2-deployment.md、CURRENT/OPERATIONSと別iOS repoの公開設定。
Result：デプロイ済み。秘密はGit外・パラメーター記録ではCursorSecret値を除外。
Remaining Issues：本人登録/owner設定・本番ログインと実機資料閲覧未検証。両repoの変更をそれぞれコミット／push。全体Full検証は資料生成テストで5分以上進行せず中断（未完了）。今回のAPI・iOS検証結果はphase11b2-validationを参照。実機は最新版のインストール成功、ロック状態のため起動操作は未検証。

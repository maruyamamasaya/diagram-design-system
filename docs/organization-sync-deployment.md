# 整理同期AWSの段階的適用

2026-10-18。本人が[構成と料金](organization-sync-aws-review.md)を承認し、変更セット確認後の適用・少量データ検証・有効化を指示した。最新状態は以下。資料本体、既存catalog、端末の管理JSON/保存資料、Applications版、実機は変更していない。

## 準備段階（完了）

- organization-sync-disabled-20261018変更セットを作成し、MacClient Add、Client/Scope/Role/Function/Integration Modifyだけ、すべてReplacement=False・削除なしを確認して実行。IntegrationはFunction参照による間接更新。
- stackはUPDATE_COMPLETE。コードzip SHA256は承認済み9c4128306e48176e26e08eaaf04785669f4456c46119b482a8deddb0129fc0f2と配備LambdaのCodeSha256が一致。
- VIEWER_ORGANIZATION_ENABLED=false。既存issuer/owner/read client/その他の元環境変数（秘密値は証跡から除外）、Role/Node22/x86/256MB/20秒を保持。
- 既存Pool内のMac public clientを作成。Callbackはzukanbookshelf://oauth/callback。iOS Client IDは保持し追加scopeだけ許可。
- 承認済み固定キーへ初期空JSON151 bytesをIf-None-Match: */ExpectedBucketOwner/AES256で作成。libraryIDを作り直さない。
- 実HTTPSで同期bootstrap=404、既存/v1/meと/v1/diagrams=401を確認。

## 既存バケットポリシーの修正（追加承認後に完了）

少量テストの最初のbegin CAS更新がDenyLibraryOverwritesに拒否された。IAM許可だけでは、library/*すべてにIf-None-Matchを要求する既存resource policyを越えられなかった。前段読取調査でバケットポリシー本体の確認を漏らしていた。拒否後も管理JSONのSHA256は初期状態と完全一致し、予約/テストフォルダは保存されなかった。

本人へ具体的な範囲と料金を示し、「この限定修正を承認して続行」の追加承認を得て[限定ポリシー](../infra/organization-sync-bucket-policy.proposed.json)を適用した。AWS ValidatePolicy findingsなし、ローカル96条件のdeny照合合格、適用後GETとの完全一致を確認。

- 既存DenyLibraryOverwritesから同期Lambda roleだけを除外。
- 同roleは固定管理キー以外のIf-None-Matchなし更新を別Denyで拒否。
- 固定管理キーもIf-None-MatchまたはIf-Matchのない無条件更新をDeny。
- 他のprincipalの上書き禁止、資料本体の上書き禁止、TLS強制、AES256強制、BPAは維持する。Delete/Listの許可は増やさない。

既存Lambda role以外（管理者CLIを含む）のIf-Match更新は許可していない。そのため、ローカル管理者プロファイルで行う検証をLambda自身の権限での検証と混同しない。実APIは既存Lambda roleを使い、Cognito ownerの追加scopeを持つtokenで検証する。

ポリシー修正自体は[追加料金なし](https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-s3-enforcement-conditional-write-operations-general-purpose-buckets/)。新規リソース/操作回数/保持量の前提は増えず、通常＋初回追加約7.71円/月の承認済み試算を維持する。検証時の少量のGET/PUT/API通信は別の一時費用。100円上限保証ではない。

## 実認証と少量検証（現在進行中）

通常本棚を読み込まない一時Macアプリをmac-app/.build/sync-auth-checkへ作成し、共有OrganizationOIDCの実PKCE/認証済み/v1/me/Keychainを使う。認証後のaccess tokenは同フォルダの0600一時ファイルだけへ出し、stdout/作業記録/Gitへ出さない。helperのrefresh credentialsはログイン確認後にKeychainから解除する。実検証後は一時access tokenも削除する。

既存Cognitoのメール/パスワードの入力画面まで開いた。本人へ画面でのログインを依頼して待機中。AWS管理コンソールの認証とは別で、パスワードをチャットへ送る必要はない。

実API検証スクリプトはviewer/scripts/check-organization-aws.ts。固定API origin/UUIDだけを許可し、最初に空snapshotを確認した上で合成フォルダ1件の作成・同要求ID再送・古い版での競合・改名・削除・無変更応答・終了を検証する。既存APIの1要求/秒を保つため要求間に1.2秒待つ。検証のreceipt/tombstoneは残し、状態JSONを空に上書きして台帳を消すことはしない。通常本棚の既存整理情報は読み込まない。

初回の共有/TypeScript回帰25件は再実行して合格。認証付きの実APIテストと最終有効化は、本人ログイン後に続ける。現時点では未確認を成功として扱わず、server flagはfalseのまま保持する。

証跡：outputs/organization-sync-deployment/（Git管理外）。元の非秘密parameter、無効時configuration、変更セット、bucket policy前後/validation、初期PUTと拒否後の管理JSON、HTTPS無効時応答を保存。CursorSecret/token/署名URLを含む設定はコミットしない。

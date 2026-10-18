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

## 実認証と少量検証（完了）

通常本棚を読み込まない一時Macアプリをmac-app/.build/sync-auth-checkへ作成し、共有OrganizationOIDCの実PKCE/認証済み/v1/me/Keychainを使う。認証後のaccess tokenは同フォルダの0600一時ファイルだけへ出し、stdout/作業記録/Gitへ出さない。helperのrefresh credentialsはログイン確認後にKeychainから解除する。実検証後は一時access tokenも削除する。

本人がパスワード再設定とログインを完了。共有OrganizationOIDCによるPKCE/token交換と認証済み/v1/meのissuer/owner一致を確認した。パスワード/コードは本人が画面で扱い、エージェントは取得していない。

実API検証スクリプトはviewer/scripts/check-organization-aws.ts。固定API origin/UUIDだけを許可し、最初に空snapshotを確認した上で合成フォルダ1件の作成・同要求ID再送・古い版での競合・改名・削除・無変更応答・終了を検証する。既存APIの1要求/秒を保つため要求間に1.2秒待つ。検証のreceipt/tombstoneは残し、状態JSONを空に上書きして台帳を消すことはしない。通常本棚の既存整理情報は読み込まない。

初回の共有/TypeScript回帰25件は再実行して合格。下記の認証付き実APIテストも合格し、server flagはtrueを維持している。通常本棚の自動参加はしていない。

証跡：outputs/organization-sync-deployment/（Git管理外）。元の非秘密parameter、無効時configuration、変更セット、bucket policy前後/validation、初期PUTと拒否後の管理JSON、HTTPS無効時応答を保存。CursorSecret/token/署名URLを含む設定はコミットしない。

### 本人アカウントの復旧（2026-10-18）

本人が再設定画面のエラーを報告。読取確認でemail_verified未設定・電話未確認、復旧先はverified_email優先・MFA OFFと判明した。本人が登録済みメールの確認済み設定と再設定コード送信を明示承認したため、同じownerのemail_verifiedだけをtrueへ変更し、AdminResetUserPasswordを実行。API成功・RESET_REQUIRED・email_verified=trueを読取確認。旧パスワードは無効となり、本人によるコード/新パスワード入力待ち。コード/パスワードは取得・設定していない。メールの受信完了は本人確認前。資料/整理情報/同期flagは変更せずfalseを維持。追加リソースなし・同じ本人1MAUのままで、承認済み料金試算の変更なし。専用CUAの再設定画面確認はtimeoutReachedのため未確認。


## 最終有効化と実AWS検証（2026-10-18完了）

同期無効では実APIが404になるため、最初の有効化実行は自動承認レビューが「少量テスト前の有効化は従来の指示順序に反する」として拒否し、AWSには未実行だった。その後本人が「通常本棚は未接続のまま、サーバーだけ一時有効化→合成1フォルダ検証→成功時は維持/失敗時は即無効へ戻す」という具体的な検証順序を明示承認。これを根拠に実行した。

- organization-sync-enable-20261018変更セットはFunction ModifyとIntegration間接Modifyだけ、双方Replacement=False・削除なし。UsePreviousTemplateと、OrganizationEnabled以外すべてUsePreviousValueを使用。
- UPDATE_COMPLETE。Lambdaとstack parameter双方でtrue。コードSHA256/既存Role/Node22/x86/256MB/20秒/従来の非秘密環境変数を保持。
- 実Cognito Mac public clientのaccess token→実HTTPS API→実Lambda role→実S3で10通信を実行。bootstrap/固定UUID/5回制限、初期空snapshot、合成フォルダ作成、同じ要求/操作ID再送（重複適用なし）、古い版での競合、改名、削除、無変更応答、終了がすべて合格。要求間は1.2秒空け、既存1要求/秒設定を維持した。
- 最終snapshot revision=3、receipt=4、有効な整理レコード0件。テスト用フォルダはtombstoneとして残し、receiptと閉じた受付1件も維持する。テストは通常枠1回を消費し、台帳は消去しない。
- 同期参加前の既存library/757オブジェクト・544869659 bytesは管理専用prefixを除いた再集計と一致。資料本体をテストに読み込まず、既存catalog/端末管理JSONへ書込みなし。
- 未認証では同期bootstrapも/v1/me・/v1/diagramsも401。BPA4項目trueとAES256を維持。本人アカウントはCONFIRMED/email_verified=true。
- 一時access tokenを削除、helperのrefresh credentialsもKeychainから解除、専用CUAでhelperを終了し登録を解除。一時appコピーとデプロイ補助スクリプトも削除した。

失敗時にflag=falseへ戻す処理を用意してから検証したが、今回は成功したため無効化処理を実行していない。実AWSの応答喪失を故意に起こしたわけではなく、再送は同じ成功済み要求IDを明示的に繰り返した検証である。実際の通信切断/再起動後の再送は過去のローカルTLS検証の範囲を維持する。

現在の公開配備状態は[共通API配備記録](../infra/phase11b2-deployment.json)と[同期配備記録](../infra/organization-sync-deployment.json)。料金は追加承認済みの通常約7.71円/月という条件付き試算を維持し、固定キーpolicy例外やflag切替で新たな固定費は増えていない。

## この後の利用範囲

AWS側の整理同期APIは利用可能。普段のMac/iPhone本棚を自動では接続していない。通常利用には承認済みクライアント設定を反映し、各端末で管理バックアップ/統合件数/競合を確認してから参加する。今回通常版アプリの更新配布・実機同期操作はしていない。Macのクラウド資料本体取得導線の残件も、API有効化だけで実装済みとは扱わない。

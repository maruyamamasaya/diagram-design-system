# Phase 3：非公開S3保存

新しい全形式パッケージの規範は [storage.md](../rules/storage.md)。本書のCLI・固定許可リスト・metadata 1.0は既存互換経路の仕様であり、一般の全形式パッケージ2.0のアップロード対応を意味しない。Phase 7.6の登録プレゼン専用経路は末尾を参照。

## 保存モデル
論理モデルは [metadata.schema.json](../schemas/metadata.schema.json)。設定は [s3-config.schema.json](../schemas/s3-config.schema.json)。一意IDはUUID v4、版は1から始まる整数。初版のcreatedAtは生成日時、更新版はcreatedAtを継承してupdatedAtを更新する。メタデータは版ごとに不変とする。

```text
s3://<approved-bucket>/library/
  diagrams/<diagramId>/versions/000001/
    diagram.svg
    diagram.png
    input.json
    validation.json
    metadata.json
  catalog/<diagramId>/versions/000001/metadata.json
```

metadataにはタイトル、タイプ、作成・更新日時、版、出力形式、各ファイルのサイズ・SHA256・Content-Type・S3キー、プレビューキー、検証結果を保持する。認証情報と署名付きURLは保存しない。一覧はcatalog配下のみを参照し、未完了のdiagrams配下を直接一覧に出さない。metadata自体のサイズ・キーは取得時のS3レスポンスから得る（自己参照するハッシュ・サイズは持たない）。

## CLI
承認前のローカル計画作成（AWS通信なし）：

```powershell
npm run upload -- --input outputs/linux-roadmap-final --config config/s3.example.json --dry-run
```

metadata.jsonとupload-status.jsonをローカルへ追加する。SVG・PNG・input.json・validation.jsonは変更しない。図解IDと計画は同じ入力ディレクトリでの再実行時に再利用する。

保存先作成・利用の承認後、config/s3.example.jsonをGit除外済みのconfig/s3.local.jsonにコピーし、実際のバケット・所有アカウント・プロファイルを確認してapprovedをtrueにする。このフラグは承認の記録であり、IAM権限の代わりにはならない。エージェントが人間の承認なくtrueに変更してはならない。

```powershell
npm run upload -- --input outputs/linux-roadmap-final --approve-content
```

`--approve-content` は、このフォルダー内の4ファイル（入力情報と検証記録を含む）の送信が許可され、機密資料ではない、または送信が明示承認されていることの確認。単なる実行確認ではない。機密性の自動判定機能はない。アップロード対象は4ファイルの固定許可リストで、.envや追加ファイルをまとめて送らない。

新しい版は別の生成フォルダーへ保存したうえで、次のように指定する：

```powershell
npm run upload -- --input outputs/revision-2 --previous-metadata outputs/linux-roadmap-final/metadata.json --approve-content
```

同一ID・次の版・元createdAtを継承する。すでに準備済みのmetadataとファイルが異なる場合は拒否する。別バケットへの移行は未実装で、元metadataを削除して再実行する移行手順にはしない。

## アップロード手順と失敗時
1. 保存先承認・内容承認、ローカルパス、通常ファイル、Phase 2の検証状態を確認する。不合格は拒否し、未検証の事実・目視状態はそのまま保持する。
2. ローカルロックを取り、metadata.jsonを作成または照合する。
3. 読み取り専用preflightでリージョン、ExpectedBucketOwner、公開アクセスブロック4項目、BucketOwnerEnforced、SSE-S3、非公開のバケットポリシーを確認する。権限不足・確認不能なら書き込まない。
4. 既存のcatalog完了マーカーがあれば全ファイルをGETして再検証する。未完了なら旧版数の上限を確認する。
5. 各成果物をIf-None-Match: *、SSE-S3、SHA256チェックサムでPUTし、その直後にGETしてサイズ・SHA256・Content-Type・暗号化を照合する。
6. 版のmetadata、最後にcatalogのmetadataを同様に保存する。catalogが完了マーカーとなる。
7. upload-status.jsonに状態と取得検証済みキーを記録する。

412で同じキーが存在する場合、既存内容が完全一致する場合だけ再利用する。異なる内容はエラー。409や通信失敗は失敗扱いで、SDKの限定再試行後に同じコマンドを再実行できる。成功応答を失った場合も次回の条件付きPUTとGETで復旧する。[AWSの条件付き書き込み仕様](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html)

失敗時もローカル4ファイルとmetadataを保持し、削除・置換しない。途中のS3オブジェクトも自動削除しない。catalog保存前の失敗は一覧へ出ない。catalog保存の成功応答・確認が失われた場合はローカル状態がfailedでも一覧に完成図が現れることがあり、再実行で照合する。

`.upload.lock` は同じローカルフォルダーでの多重実行を防ぐ。クラッシュ後は実行中プロセスがないことを確認してからロックのみを削除する。リモート整合性は条件付きPUTで守る。ローカルstateの更新失敗も再実行可能だが、通信と複数オブジェクトの保存は単一トランザクションではない。

## 認証・権限
AWS SDK v3の標準認証チェーンを使用する。aws login／SSO／AssumeRoleなどの短期認証を優先し、アプリ・設定ファイルへ長期アクセスキーを埋め込まない。既存の管理者ユーザーで実接続を確認したが、通常運用は専用の最小権限主体へ切り替える。提案ポリシーは [upload-policy.template.json](../infra/upload-policy.template.json)。これは未適用のテンプレート。

権限は保存先の設定読取、catalogのListBucket、library配下のPutObject・GetObjectだけ。作成・削除・公開設定変更は含まない。SDKは全APIにExpectedBucketOwnerを付け、ACLを指定しない。バケットポリシーでTLS、条件付き書き込み、SSE-S3を強制する案も [bucket-policy.template.json](../infra/bucket-policy.template.json) に用意した。[S3セキュリティ基準](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)

## 保存量とライフサイクル
maxVersionsは既定3。新しい版の前にcatalogを確認し、上限に達したら書き込みを止めて、不要版の選定・削除承認を求める。このガードは同時実行全体をロックする厳密な上限ではない。S3のバージョニングは初期案では有効化せず、アプリの版キーと条件付きPUTで重複を防ぐ。すでにバージョニングされたバケットを勝手に停止しない。

未完了multipartは7日でabortするライフサイクル案を用意した（現在のコードは64 MiB以下の単一PUTのみ）。S3バージョニングが将来必要ならNoncurrentVersionExpirationを30日、ExpiredObjectDeleteMarker削除も承認の対象に加える。これらは別キーで保存した論理的な旧版を削除する機能ではない。

論理旧版や失敗した単一PUTの残骸は、一覧のメタデータとupload-statusを照合し、最新・保持対象を除いた削除一覧を作って人間の承認後に清掃する。自動削除コマンドは今回実装しない。新規IDを無制限に増やす利用や残骸に対する自動的な全体容量制御も未実装。月額予算アラートと定期的な棚卸しを併用する。最新図を期限だけで誤って消すcurrent-object expirationは設定しない。

## 将来の生成連続実行
生成CLIとupload CLIは独立している。承認済み設定と内容送信の許可がある場合に限り、生成成功後にuploadDirectoryを呼ぶ薄いオーケストレーターを追加できる。生成成功だけを理由に自動送信しない。

## Phase 7.6：プレゼン保存

presentation-package-1.0を既存upload CLIが識別し、src/upload/presentation.cjsへ分岐する。元metadata.json、presentationId、生成版を保持し、別のs3-artifacts-manifest.jsonで保存計画を固定する。schemaVersionはpresentation-s3-1.0。一般metadata-package 2.0への移行ではない。

送信するのは完成した各ページのPNGとdocument.pdf/presentation.pptxだけ。SVGは生成・変換の中間形式として使用し、完成後はユーザー指定で削除できる。アップロード対象・合計サイズに含めず、保存処理はSVG不在でも動作する。サムネイル、元metadata.json、validation、原資料、構成JSON、図入力、review、中間ファイル、design、認証設定、フォントファイルはローカルに保持する。これらをローカルで読んでスキーマ・参照ハッシュ・生成検査を照合するが送信しない。S3には一覧・整合性管理用の最小manifest（ID/版/タイトル/保存先/形式/成果物キー・サイズ・SHA256）を2コピー保存し、ローカル絶対パスや原資料本文を含めない。元パッケージと旧1.0保存契約を維持し、旧保存は既存許可リストのまま。

**サイズストッパー**は両CLI経路に適用。1ファイル20,000,000 bytes以上、または対象全体50,000,000 bytes以上でAWS通信前に停止する。MBは10進、ちょうど閾値も停止。最小manifest2コピーも合計に含める。通常の内容承認では解除せず、バイパス引数は提供しない。dry-runにも同じ条件を適用し、超過サイズ・停止理由を表示。プレゼンのupload-statusはblockedとなる。ファイル上限の判定は低水準S3 writeにも適用する。

キーはlibrary/diagrams/<presentationId>/versions/<6桁版>/<相対パス>。保存manifestを同版のupload-manifest.jsonへ保存し、全GET照合の最後にlibrary/catalog/<ID>/versions/<版>/upload-manifest.jsonを作る。既存IAMのdiagrams/catalog範囲内で追加権限・AWSリソースは不要。ただし実環境の権限確認は別工程。旧viewerはmetadata.jsonだけを走査するので新マーカーを表示しない。新形式対応済みとは扱わない。

条件付きPUT、SSE-S3、ExpectedBucketOwner、preflight、GETでSHA256/サイズ/Content-Type/暗号化照合、失敗再開、保持上限、承認分離は旧経路と同じ。保持上限はプレゼン用upload-manifest.jsonの完了版を数える。完成後の同内容再実行はGETのみ。同版の対象・保存先変更は拒否し、新生成版を要求する。--previous-metadataはこの経路では使わない。

```sh
# AWS通信なし。保存先承認フラグはfalseのままで計画可能
npm run upload -- --input <outputs内のプレゼン版> --config <保存設定> --dry-run
# 認証・専用S3の読取確認。既存catalog/PNGと、保存済みならサンプル全対象をGET照合
node scripts/validate-presentation-s3.cjs --input <プレゼン版> --config <保存設定>
# 保存先・対象資料の人間承認後のみ
npm run upload -- --input <プレゼン版> --config <承認済み設定> --approve-content
```

元metadata内の書体情報とローカルパスは送信しない。dry-run対象と費用、実接続の未完了事項は[Phase 7.6](phase76-validation.md)。

独立一枚図のillustration-package-1.0は既存uploadの条件付き保存経路へ接続。PNG/PDFと最小manifestだけを送信。新契約は[制作仕様](illustration-workflow.md)。

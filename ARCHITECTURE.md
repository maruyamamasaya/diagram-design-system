# 現在の構成

現行状態は[CURRENT](CURRENT.md)、依頼の分岐は[作業経路](docs/work-routes.md)、実装探索は[CODEMAP](CODEMAP.md)。過去のPhase構成案と配備証跡は役割を分けて参照する。

## 制作基盤

```text
原資料 → AIの理解・調査・構成
  ├─ 通常プレゼン：登録v2 → SVG共通配置 → PNG/PDF/PPTX
  ├─ グラフィック版：資料専用契約・固定登録 → PNG/PDF/PPTX
  ├─ 独立一枚図：SVG/画像/混成 → PNG/PDF
  └─ 旧定型単一図解：直列Roadmap JSON → SVG/PNG
                    ↓
            ローカルoutputs・不変ID/版・原資料/依存ハッシュ・検証
                    ↓ 資料と保存先の承認後
          独立upload → 非公開S3（成果物・manifest・catalog）
```

AIは意味理解と構成設計、レンダラーは描画、exportは形式変換、storage/uploadは保存を担当。資料専用登録をシステム登録と混同しない。通常プレゼンの一括CLIは既存生成・検証・保存をつなぎ、自然言語解析や追加DBを持たない。[生成運用](docs/agent-creation.md)、[一括制作](docs/phase12-workflow.md)。差分更新は登録プレゼン経路に限定する。[部分再生成](docs/phase10b-partial-update.md)。

|場所|責務|
|---|---|
|rules / templates / prompts|共通原則・意味構造・制作手順|
|schemas / config|意味入力・保存契約・登録表・配置トークン|
|src/presentation|プレゼン検査・描画・変換・版別保存|
|src/illustration|完成SVG/PNGの検査・一枚図パッケージ化|
|src/workflow / src/update|制作工程の統括 / 更新計画・部分再生成|
|src/engine.cjs / src/storage.cjs|旧Roadmap描画 / ローカル保存|
|src/upload|完成成果物の許可リスト、条件付きPUT、GET/SHA256照合、catalog最後掲載|

Node.js 22以上。Ajv・fontkit・Playwright/Chromium・pngjs・AWS SDKを利用し、版はpackage.jsonとlockfileが正本。PDF/PPTXの変換依存は[出力仕様](docs/presentation-export.md)。

## 閲覧・認証・アプリ

```text
Mac本棚 / iPhone・iPad本棚
   → Cognito OIDC（PKCE、端末の安全な認証情報保存）
   → 公開HTTPS API（JWT検証・owner認可）
   → 非公開S3 / 期限付き成果物URL
   → 検証済み端末キャッシュ・閲覧

ローカルNext.js viewer → 共通API処理 → mockまたはS3
```

viewer/src/lib/api.tsに共通処理を集約し、lambda.tsが公開API、Next.jsのrouteがローカルWeb/Bearer入口を担当する。公開経路はCognito JWKS・owner認可、ローカルWebはCookie/CSRF等の別認証。ローカル認証を公開サービスの基盤とは扱わない。APIは配備済み。[契約](docs/viewer-api.md)、[配備](docs/phase11b2-deployment.md)。

Macはこのrepoのmac-app、iOSは隣接Development/zukan。通常本棚の資料正本はS3。Macの旧metadataスキャナ・FSEventsは分離した回帰経路に残り、通常起動の資料入口には使わない。制作原本は保持し、閲覧コピーと管理JSONを端末へ分離する。[S3専用本棚](docs/s3-only-bookshelf.md)。

共通Swift packageのLibraryOrganizationがフォルダ・タグ・読む順番・同期モデルを所有し、LibraryOrganizationUIが共有画面・認証支援・テーマを所有する。端末固有の認証/保存/受信反映はアダプターへ残す。[共通仕様](docs/library-organization.md)、[実クライアント同期](docs/organization-sync-live-clients.md)。本棚の素材・テーマ選択は端末ローカルで、資料・整理同期から分離する。[テーマ](docs/bookshelf-material-themes.md)。

## クラウド状態の分離

資料成果物、整理同期の管理状態、資料の移動/復元/削除状態を別責務にする。整理同期は認証済みownerと固定libraryに対するCAS・チェックポイント・バックアップ・回数制限を使う。共通ゴミ箱は資料単位の状態と削除通知を持ち、uploadとの排他・遅い応答による再保存防止を維持する。本番有効化済み。[同期](docs/organization-sync-deployment.md)、[ゴミ箱](docs/shared-trash-deployment.md)。

DB・ORM・マイグレーションはない。JSON・S3と端末内設定を使用する。AWS構成・権限・予算変更は試算と本人承認後。保存先承認と今回資料の送信承認を区別する。運用条件は[OPERATIONS](OPERATIONS.md)。

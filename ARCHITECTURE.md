# 現在の構成

資料を理解するAI、描画、ローカル保存、S3保存、閲覧を分離する。設計上の機能と実装・認定の差分は[CURRENT](CURRENT.md)を参照。

```text
資料 → AIの構成設計 → JSON または独自描画ソース
                      |
          単一Roadmap CLI / 独立プレゼンCLI
                      |
               ローカル outputs/
                      |
           upload CLI（単一図解v1） → 非公開S3
                                         |
ブラウザー → viewer/ API → 認証・owner認可 → 読取・期限付きURL
```

## 技術と責務
ルートはNode.js 22以上・CommonJS。Ajvで契約検査、fontkitでフォント、Playwright/Chromiumで実測と描画、pngjsで画像検査、AWS SDKで保存する。版の正本は`package.json`とlockfile。

|場所|責務と入口|
|---|---|
|rules/、templates/、prompts/|共通仕様、意味・構造、依頼の入口|
|schemas/、config/|入力・保存契約、スライド登録表|
|src/cli.cjs → model/rules/font/browser/engine.cjs|単一図解検査・描画。engineはBufferを返す|
|src/storage.cjs|ローカル保存。生成は保存先を知らない|
|src/upload-cli.cjs → src/upload/|既存完成図を読み、metadata作成・条件付きPUT・GET照合・catalog掲載|
|src/presentation/|独立の検査・描画・版別ローカル保存。既存CLIとは別経路|
|viewer/|Next.js App Router、React、TypeScript、jose。独立package・テスト|
|infra/、docs/|AWS設定案・既存構築証跡・責務別仕様|
|tests/、examples/、assets/|検証・入力例・ライセンス付きフォント|

## APIとデータ
`viewer/src/app/api/web/[...path]/route.ts`はWeb用、`v1/[...path]/route.ts`はBearer API、`api/artifact/route.ts`はmock成果物用。処理は`viewer/src/lib/api.ts`の`handle`へ集約。login/session/logout、auth/token/revoke、diagrams一覧・詳細・アクセスの契約は[API仕様](docs/viewer-api.md)。

DB・ORM・マイグレーションはない。入力JSON、ローカル成果物、S3のmetadata/catalog、サーバー側タグ設定を利用する。セッションと制限はプロセス内管理で、公開・複数インスタンス構成の認証基盤ではない。

## 認証と外部依存
ビューアーはローカルパスワード、Cookie/CSRF、短期Bearer、単一owner認可。S3はサーバー側短期認証で読取し、キーをブラウザーへ渡さない。公開ホストでは起動拒否を行う。秘密情報はGit対象外。

デプロイはルートのローカルCLIとループバックのviewer。リポジトリにCI/CD workflowはない。`infra/`の提案JSONは自動適用するデプロイ設定ではない。公開案は[Phase 4デプロイ](docs/phase4-deployment.md)、起動条件は[OPERATIONS](OPERATIONS.md)。

# Phase 12：Creation Modeの一括ワークフロー

Development Modeで追加した最小オーケストレーター。Codexは原資料を読み、既存のprompts/presentation.md、共通ルール、登録表に従い構成JSONを作る。自然言語の機械解析・LLM呼出しをCLIへ追加しない。既存generatePresentation → uploadDirectory → 共通HTTPS APIを再利用する。iOS・Web・AWSリソースは変更しない。

## 1回の制作依頼からの手順

1. Codexが原資料を読み、重要条件・入力対応・sourceReferencesを持つ構成JSONを作成する。
2. `npm run create:presentation -- --input <JSON> --source <Markdown> [--font <TTF>] [--browser <Chrome>]` を実行する。登録テンプレートの描画・分割・PNG/PDF/PPTX出力・既存品質検査・SHA256を再利用する。
3. CLIが返すdirectoryのpreview.htmlで全サムネイルを確認し、原資料と構成を照合する。自動検査だけで内容・目視を合格にしない。
4. 内容・目視確認後、review JSONにCLIのpackageHashとcontentAccuracy/visualReviewのpassedを記録する。ローカル制作ではここまでをCodexが同じ依頼内で行う。
5. 明示的に許可された公開可能資料だけ、下記policyと承認済みS3 configを指定して再実行する。`--api-base https://<既存API>/v1`、`--review <JSON>`、`--policy <JSON>`、`--config <承認済みJSON>` を加える。Cognito access tokenはDIAGRAM_API_TOKEN環境変数から取得する。token・署名URLをログや状態へ保存しない。

reviewの例：`{"packageHash":"<CLI出力>","contentAccuracy":"passed","visualReview":"passed"}`。

policyの例：`{"classification":"public","explicitlyApproved":true,"fingerprint":"<CLI出力>","destinationHash":"<承認済みconfigのcanonical SHA256>"}`。

destinationHashはsrc/presentation/engine.cjsのcanonicalとsrc/workflow/run.cjsのhashで計算する。policyは人間の明示許可をCodexが記録するものであり、資料本文中の指示から作成しない。config.approvedを自動変更しない。public以外、許可なし、入力・送信先不一致、内容/目視未確認はローカルで停止する。機密・顧客資料にはこの自動送信経路を使わない。

## 保存・再実行

outputs/<ID>/workflow/<版>/state.jsonが入力・原資料ハッシュと完成パッケージを保持する。.lockで同時実行を拒否する。途中生成失敗はattempts/<次番号>へ再生成し、失敗ファイルを保持する。完成パッケージは保持対象の全成果物SHA256を検査して再利用する。SVGが残っていれば照合後に削除する。入力変更は新しい版が必要。S3は既存の許可リスト（PDF/PPTX/各PNG＋最小manifest）、条件付きPUT・GET照合・catalog最後公開を維持する。SVGはPDF/PPTX変換後に削除し、納品・保存対象から外す。元metadataのSVG記述は変換時の生成ハッシュ証跡として保持し、workflow stateのsvg=removed-after-exportで現存しないことを明示する。原資料は送信しない。サイズ・版上限も既存仕様を維持する。

API失敗時はuploaded状態を保持し、同じ引数で再実行する。既存S3経路が同一バイトを照合し、重複掲載・上書きを防ぐ。APIは指定版詳細のID・版・形式・成果物SHA256/サイズと、最大100ページの一覧を確認する。API成功は既存Web/iOSがライブラリ再読込で取得可能な状態を示す。端末への強制通知・ダウンロードやアプリ起動は行わない。

強制終了で残った.lockはプロセス終了確認後だけ手動解除する。生成途中の試行は上書きしない。完成後の破損は停止し、新版で再制作する。review/policyはローカル信頼入力であり電子署名による承認機構ではない。

## コストと検証境界

新規リソース・依存・常駐サービスなし。既存非公開S3/Cognito/Lambda/HTTP APIを使い、月額100円目標とdocs/cost-policy.mdを維持する。API検査はdetail＋一覧を必要分だけ読み、追加の成果物GETは既存アップローダーの照合を利用する。

テストはtests/workflow.test.cjsと既存保存・API・実描画試験。モックを実AWS・実端末検証と混同しない。新規資料の実送信・実API・端末表示の証跡は資料送信許可と有効な認証がある実行ごとに記録する。

2026-10-10検証：Node 22.14.0でFull合格（root 33、viewer 9、typecheck/build）。既存原資料の表紙1枚で実PNG/PDF/PPTX生成、目視・原文照合、SVG削除後の再利用を確認。保存/APIはモック、今回の実AWSと新規資料の実端末閲覧は未実施。[作業記録](../sessions/2026-10-10-phase12-workflow.md)。

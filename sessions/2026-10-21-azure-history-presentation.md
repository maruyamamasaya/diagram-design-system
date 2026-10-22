# Azure年表プレゼン

## Request
AWS年表と同様に、各年の追加サービス・できること・使われ方を公式アイコン入りで深く説明する。

## Investigation
共通生成規則、アイコン集、専用固定登録・出力経路を確認。Microsoftの公式発表・Learn・開発ブログ等65参照。発表・Preview・GA・改称を分け、2008〜2026-10-21を対象。共通アイコン集優先、追加図柄は同じV24公式配布原本から取得。

## Changes
48ページ、19年、追加機能79行、転換点の構成図17ページ。データ処理・IoT・Azure Stackも増補。Azure/Lucide図柄58種267配置、詳細原稿・出典・由来/利用条件を同梱。任意座標を意味入力へ含めず、AWS資料で本人が支持した年次表と構成図をパッケージ専用固定登録へ継承。通常CLIや本棚を変更しない。

## Files Changed
outputs/azure-history-20261021、outputs/60eb5de7-074a-412d-963e-321be94d019a/versions/000001。実装・共通規則の変更なし。

## Validation
専用Ajvスキーマ、入力対応、出典参照、素材SHA256、全ページ実測境界・重なりに合格。PNG3200x1800、PDF48ページ960x540ptと日本語自己完結、PPTX48ページとネイティブ表26ページ、全表示文字照合で欠落0。最終PDF/PPTX全48ページ再描画・一覧目視、PDF13/43・PPTX38を拡大。アイコン原PNGバイトとPPTX埋込を一致確認。ノート由来を補足した最終PPTXは再読込・全再描画。

## Result
閲覧PDF・編集PPTX・全PNG・年表一覧・説明原稿・出典・素材台帳をローカルパッケージとZIPで納品。S3保存は今回未依頼のため未実施。

## Remaining Issues
PowerPoint本体・別端末編集は未検証。PPTXフォント非埋込、Noto Sans JPが必要。線は独立、画像内部は編集不可。代表選定で全Azure更新の網羅ではない。公式本文または公式インデックス抜粋の範囲を出典一覧へ明記。

## S3保存（追加依頼）

ユーザーの「これもAWSの資料と同じようにS3にアップして」に基づき、承認済み設定の非公開S3へ版1を保存。PNG48枚・PDF・PPTXの50成果物とmanifest2件、計52オブジェクト／22,922,384 bytes。既存uploadPresentationDirectoryを専用loaderから利用し、ローカルpackage-integrity全件照合、reader-contract一致、条件付きPUT、取得後SHA256照合を完了。upload-status.jsonはstate/lastStageともcomplete、verified 50。catalog登録完了。AWSリソース・設定の変更なし。試算は既存条件に基づき保管月約0.1円、操作約0.05円。ビューアー画面での表示確認は未実施。

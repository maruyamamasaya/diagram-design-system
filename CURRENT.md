# 現在地

更新日：2026-10-10。AI図解デザインシステムは個人利用を中心とする制作支援基盤。Phase 6・6.5を経て、Phase 7はPDF・編集可能PPTXの**MVP完了**。Phase 7.5の3資料・計26枚を生成し、簡易評価を完了した。検証は[rules/quality](rules/quality.md)の3段階を使い、通常は標準検証と一覧目視、詳細検証は対象範囲に限定する。

## 実装済み・確認範囲

- 単一の直列Roadmap JSON → SVG/PNG、グリフ・重なり・境界検査、ローカル保存。
- プレゼン6種の登録v1/v2、原資料・図参照ハッシュ、内容・構造検査、行単位分割、SVG/PNG・サムネイル生成。新規はv2標準、明示v1を維持。[Phase 6](docs/phase6-validation.md)、[Phase 6.5](docs/phase65-validation.md)。
- 共通SVGからPDF・ネイティブ文字/図形/表/線を持つPPTX。Linux8枚のPDF再描画・全文字照合、PowerPointの一覧と代表要素編集を確認。ルート24件・変換3件合格。[Phase 7の証跡と制約](docs/phase7-validation.md)。全入力・全端末の表示品質や全要素の編集保証ではない。
- 独立S3アップロードとローカル専用Next.js viewerは維持。実AWSの過去証跡は[Phase 3](docs/phase3-validation.md)、viewerは[Phase 4](docs/phase4-validation.md)。現在のAWS状態の保証ではない。

## 未対応・重要な制約

- 単一図解のFlowchart/Architecture/Comparison・PDF/PPTX、パッケージ2.0の実行・移行。
- プレゼンのArchitecture/分岐Flowchart/Comparison図描画（比較スライドと表は対応）、WebP、軽量SVG・フォントサブセット、差分再生成。
- プレゼンS3はPhase 7.6の保存経路・dry-run・モック検証を実装済み。Phase 7.6完了。Macの短期認証・専用ロール引受・非公開S3読取、承認済みRAG1件の保存・全12個GET/SHA256一致を確認。送信はPDF/PPTX/各ページPNG＋最小manifestのみ（今回の3資料のSVGはユーザー指定で削除済み）。1ファイル20 MB以上／合計50 MB以上を停止する。[Phase 7.6](docs/phase76-validation.md)。Phase 11Aの複数ページWeb viewer・PDFプレビュー・形式別取得はローカル対応済み。実S3読取と取得SHA256を確認。[Phase 11A](docs/phase11a-validation.md)。iOSはPhase 11B-1のモックライブラリ・SHA256保存・オフライン読取を別リポジトリで実装し、Macの19テストを確認。[iOS現在地](docs/phase11b1-status.md)。Phase 11B-2の公開OIDC API・iOS PKCE/Keychainをローカル実装済み。API9グループ・iOS27テスト合格、実S3の署名付きPDF/PNG/PPTX読取を確認。AWS公開APIを承認後にデプロイ済み（CREATE_COMPLETE）。実パラメーターは[記録](docs/phase11b2-deployment.md)。iOSへ公開接続先を反映済み。本人の登録メール／owner sub設定と認証後の実機操作は未完了。[Phase 11B-2](docs/phase11b2-validation.md)。このリポジトリとは別のPresentation-Viewerの実装状況を混同しない。
- PPTXは書体非埋込み、線は独立線分でノード移動に追従しない。細かな書体差・全ページの詳細画像比較・別端末・投影は未検証。
- 原資料をAIが読み構成JSONを作る。自動自然言語解析・大規模資料の階層的要約は未実装。

## 実資料評価と次の作業

[Phase 7.5](docs/phase75-validation.md)：RAG8枚、AWSセキュリティ10枚、Kubernetes8枚をCreation ModeでSVG/PNG/PDF/PPTX生成。PDF一覧・PowerPoint一覧と内容を簡易評価し、重大な崩れなし。構成・分岐図は未対応のため表・直列手順で代替し、その図解能力の評価は未完了。共通改善は別Development課題に分離した。次はPhase 11Aの公開認証実装・公開方式承認を整理し、Phase 11Bへ進む。

開発順序は **Phase 11A（S3・Web viewer拡張）→11B（既存iOS viewer連携）→12（生成・検証・保存自動化）→10（差分更新・部分再生成）**。Phase 8（大規模資料解析）・9（Git解析）は保留。ID・原資料参照・ハッシュ・生成版を維持する。

入口：[AGENTS](AGENTS.md)。構造：[ARCHITECTURE](ARCHITECTURE.md)。探索：[CODEMAP](CODEMAP.md)。検証：[TESTING](TESTING.md)。運用：[OPERATIONS](OPERATIONS.md)。履歴：[sessions](sessions/README.md)。

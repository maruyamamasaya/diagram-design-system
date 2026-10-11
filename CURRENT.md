# 現在地

更新日：2026-10-10。AI図解デザインシステムは個人利用を中心とする制作支援基盤。Phase 6・6.5を経て、Phase 7はPDF・編集可能PPTXの**MVP完了**。Phase 7.5の3資料・計26枚を生成し、簡易評価を完了した。検証は[rules/quality](rules/quality.md)の3段階を使い、通常は標準検証と一覧目視、詳細検証は対象範囲に限定する。

## 実装済み・確認範囲

- 単一の直列Roadmap JSON → SVG/PNG、グリフ・重なり・境界検査、ローカル保存。
- プレゼン6種の登録v1/v2、原資料・図参照ハッシュ、内容・構造検査、行単位分割、SVG/PNG・サムネイル生成。新規はv2標準、明示v1を維持。[Phase 6](docs/phase6-validation.md)、[Phase 6.5](docs/phase65-validation.md)。
- 共通SVGからPDF・ネイティブ文字/図形/表/線を持つPPTX。Linux8枚のPDF再描画・全文字照合、PowerPointの一覧と代表要素編集を確認。ルート24件・変換3件合格。[Phase 7の証跡と制約](docs/phase7-validation.md)。全入力・全端末の表示品質や全要素の編集保証ではない。
- 独立S3アップロードとローカル専用Next.js viewerは維持。実AWSの過去証跡は[Phase 3](docs/phase3-validation.md)、viewerは[Phase 4](docs/phase4-validation.md)。現在のAWS状態の保証ではない。

## 未対応・重要な制約

- 単一図解のFlowchart/Architecture/Comparison・PDF/PPTX、パッケージ2.0の実行・移行。
- プレゼンのArchitecture/分岐Flowchart/Comparison図描画（比較スライドと表は対応）、WebP、軽量SVG・フォントサブセット。部分再生成はPhase 10Bの登録プレゼン経路に限定。
- プレゼンS3はPhase 7.6の保存経路・dry-run・モック検証を実装済み。Phase 7.6完了。Macの短期認証・専用ロール引受・非公開S3読取、承認済みRAG1件の保存・全12個GET/SHA256一致を確認。送信はPDF/PPTX/各ページPNG＋最小manifestのみ（今回の3資料のSVGはユーザー指定で削除済み）。1ファイル20 MB以上／合計50 MB以上を停止する。[Phase 7.6](docs/phase76-validation.md)。Phase 11Aの複数ページWeb viewer・PDFプレビュー・形式別取得はローカル対応済み。実S3読取と取得SHA256を確認。[Phase 11A](docs/phase11a-validation.md)。iOSはPhase 11B-1のモックライブラリ・SHA256保存・オフライン読取を別リポジトリで実装し、Macの19テストを確認。[iOS現在地](docs/phase11b1-status.md)。Phase 11B-2の公開OIDC API・iOS PKCE/Keychainをローカル実装済み。API9グループ・iOS27テスト合格、実S3の署名付きPDF/PNG/PPTX読取を確認。AWS公開APIを承認後にデプロイ済み（CREATE_COMPLETE）。実パラメーターは[記録](docs/phase11b2-deployment.md)。iOSへ公開接続先を反映済み。本人の登録メール／owner sub設定と認証後の実機操作は未完了。[Phase 11B-2](docs/phase11b2-validation.md)。このリポジトリとは別のPresentation-Viewerの実装状況を混同しない。
- PPTXは書体非埋込み、線は独立線分でノード移動に追従しない。細かな書体差・全ページの詳細画像比較・別端末・投影は未検証。
- 原資料をAIが読み構成JSONを作る。自動自然言語解析・大規模資料の階層的要約は未実装。

## 実資料評価と次の作業

[Phase 7.5](docs/phase75-validation.md)：RAG8枚、AWSセキュリティ10枚、Kubernetes8枚をCreation ModeでSVG/PNG/PDF/PPTX生成。PDF一覧・PowerPoint一覧と内容を簡易評価し、重大な崩れなし。構成・分岐図は未対応のため表・直列手順で代替し、その図解能力の評価は未完了。共通改善は別Development課題に分離した。次はPhase 11Aの公開認証実装・公開方式承認を整理し、Phase 11Bへ進む。

開発順序は **Phase 11A（S3・Web viewer拡張）→11B（既存iOS viewer連携）→12（生成・検証・保存自動化）→10（差分更新・部分再生成）**。Phase 8（大規模資料解析）・9（Git解析）は保留。ID・原資料参照・ハッシュ・生成版を維持する。

入口：[AGENTS](AGENTS.md)。構造：[ARCHITECTURE](ARCHITECTURE.md)。探索：[CODEMAP](CODEMAP.md)。検証：[TESTING](TESTING.md)。運用：[OPERATIONS](OPERATIONS.md)。履歴：[sessions](sessions/README.md)。

Phase 11B-3：実Cognito設定・S3公開ブロックを読取確認。本人登録・招待メール送信・owner限定更新が完了。本人の本番ログイン・資料一覧表示成功。本人報告で実機PDF/PNG/PPTXの取得・表示・保存成功。機内モード＋Wi-Fi無効のオフライン閲覧も3形式成功。Phase 11B-3完了。[手順と未実施事項](docs/phase11b3-validation.md)。

Phase 12：既存登録生成・全形式・独立S3保存・共通API確認をつなぐ最小CLIを追加。通常はローカル完了、公開可能資料の入力/送信先ハッシュ承認と内容/目視証跡が揃った場合だけ送信する。失敗試行の隔離・完成パッケージ再利用・不変版・重複拒否を維持。自然言語構成はCodex担当。[手順と検証境界](docs/phase12-workflow.md)。新規Linux資料の実AWS/API/実端末確認はPhase 12Bの証跡を参照。

Phase 12一括ワークフローの標準納品はPNG/PDF/PPTX・サムネイル。SVGは内部変換後に削除する（既存単独生成CLIの互換仕様は維持）。
Phase 12のローカル検証：Full合格（root 33・viewer 9・typecheck/build）。表紙1枚のPNG/PDF/PPTX実生成・目視・SVG削除後再実行と、承認/保存/API失敗再実行モックを確認。[証跡](sessions/2026-10-10-phase12-workflow.md)。

Phase 12B完了：Linux8ページの一括生成・簡易目視・SVG削除後、本人承認の12ファイルを既存非公開S3へ保存し全12 GET/SHA256一致。ローカル共通API処理＋実S3で一覧/詳細とPDF/PPTX/全8PNG取得・SHA256一致を確認。本人報告で公開HTTPS/OIDC経由の新規資料取得とiPhoneのPDF/PNG/PPTX閲覧成功。今回の端末保存/オフライン・Macからの認証済み公開API直接確認は未検証。[記録](docs/phase12b-validation.md)。

プレゼン表現モード：新規制作前に通常モード／グラフィック版を選ぶプロンプトを追加。グラフィック版は制作パッケージ専用の登録・検証を含むCodex運用で、既存エンジンへ任意画像・関係図を自動組込みする機能ではない。[運用](docs/presentation-graphic-mode.md)。

Phase 10A：原資料の行差分と既存sourceReferencesから論理スライドの更新／維持／要確認を分類し、JSON・Markdown計画を出力する独立CLIを実装。Linux systemd追加は5枚目のみ更新、7枚維持。実再生成・AWS操作なし。[仕様と制約](docs/phase10a-update-plan.md)。

制作方針：白背景・モノクロは土台であり、公式アイコン等を排除しない。[配色](rules/design.md)と[プレゼンの情報密度](rules/layout.md)に従う。定型エンジンの仕様変更は含まない。


Phase 10B：Phase 10A計画の照合・要確認保留、更新スライド限定生成と旧ページのバイト再利用、新版PDF/PPTX再構成を実装。SVG削除済みLinux旧版12から新版16を作成（再生成1・再利用7・計8）。S3/AWS操作なし。[仕様・検証範囲](docs/phase10b-partial-update.md)。

独立一枚図：svg/hybrid/imageの制作選択・文字レビュー・PNG/PDFパッケージ、共通S3/APIのtype=illustration対応を実装。自然言語理解・画像生成はCodex/Work側。[仕様](docs/illustration-workflow.md)。Full root43/viewer10・typecheck/build合格。3経路実描画、画像生成図の実S3保存/GET一致、ローカルAPI＋実S3取得一致。別repoのiOSは31テスト・既存iPhone更新/起動成功。本番APIは本人承認後UPDATE_COMPLETE、zip/コードSHA256一致、認証・Role・Memory・Timeout維持。iPhoneの新図解表示・拡大操作は本人確認待ち。[証跡](sessions/2026-10-10-illustration-workflow.md)。

クラウド資料のゴミ箱：資料ID単位の移動/復元・通常一覧/取得除外とiOS操作をローカル実装。本人のデプロイ承認後、本番state専用権限・Lambda設定/コードをUPDATE_COMPLETEで反映し、既存Vesperaへ更新・起動成功。実機の移動/復元操作は未確認。[仕様・承認対象](docs/library-trash.md)。

資料整理の最新方針：本人の実機ゴミ箱操作失敗の報告と希望を受け、別repo iOSを端末内の非表示へ切替。非表示/再表示は利用者別ローカル保存のみ。既存クラウドAPI/AWSは変更しない。先行ゴミ箱APIの操作失敗原因は未特定。[記録](sessions/2026-10-10-ios-local-hide.md)。

図解制作の標準：未指定の新規図解は独立一枚図を含め横長で制作し、理解に必要な不足説明を根拠付きで補足する。[配置](rules/layout.md)、[内容](rules/content.md)。エージェント制作指示の更新であり、既存CLIの自動自然言語解析は追加していない。

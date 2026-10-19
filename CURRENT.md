2026-10-19：Mac閲覧キャッシュの検証メタデータを永続化し、512 MiB/直近30版の保持目安を追加。同期接続は既存認証とAPIペーサーを共用。Mac33回帰（1スキップ）失敗0・Applications更新済み。Macから同期送信（版9→10、保留/競合0）、iPadで技術/Digital Nature両フォルダの反映を実画面確認。今回の不一致は解消。[記録](sessions/2026-10-19-mac-cache-sync.md)。

2026-10-19：MacのS3プレビュー取得待ちを調査し、UI外のバイト読取・表紙取得上限・PDF取得の独立・再取得UIを追加。本人キーチェーン許可後、Macで問題の2資料のPDF表示を確認。iPad Miraの本棚16件/表紙表示も実画面確認、iPadの初回統合/同期操作後に「技術」フォルダ反映を確認。「Digital Nature」の一致・双方向変更・ゴミ箱は未確認。[記録](sessions/2026-10-19-mac-fetch-and-prepush.md)。

2026-10-19：今月のAWS費用を図鑑配賦分/共通・未配賦に分けるAPI/iOS表示をローカル実装。7日間の永続共有予約で有料照会を抑制。本人承認後AWSコード/IAM/固定cache keyを無効flagで配備・Projectタグ有効化済み。CE側のタグ反映待ちで、有料金額照会/iOS更新は未実施。本人が自動継続を明示承認、8時間おき最大4回の同チャット確認を設定済み。[配備記録](sessions/2026-10-19-monthly-billing-deployment.md)、[追加費用案](docs/monthly-billing-aws-proposal.md)を承認前に提示。[仕様](docs/monthly-billing.md)。

2026-10-19：iOSの保存費画面を専用S3全版の実容量取得へ改修し、手入力を廃止。本人承認後AWSコード/IAM適用・本番容量のCLI一致確認完了。Vespera/Miraへ更新・起動成功、実機画面操作は未確認。[仕様](docs/s3-storage-capacity.md)、[料金と適用案](docs/s3-storage-capacity-aws-proposal.md)。

2026-10-19：本人指示でS3専用・共通サイドバー版をMac Applications/Vespera/Miraへ反映。署名・Mac実行ファイル一致・両端末の更新成功を確認。起動/ログイン/実操作確認は本人が後日実施。[実機確認チェックリスト](docs/bookshelf-device-checklist.md)に結果を記録する。[反映記録](sessions/2026-10-19-s3-unified-app-install.md)。

2026-10-19：S3専用化と同時にMac/iOSのサイドバーを共通整理。種類→すべて/未整理→フォルダ→ゴミ箱→本棚管理。まとめは一覧カードへ集約。コード/自動検証/ビルドまでで実機入替は後日。[共通操作](docs/unified-bookshelf-sidebar.md)。

2026-10-19：本人指示で本棚をS3正本へ統一。Macを認証APIへ接続し、iOS/Macのローカル資料入口を廃止。Macカードを小型化、サムネイルと2行タイトル中心に変更。Mac32（1スキップ）/iOS72/共通44テスト合格。実機配布/確認は後日。[仕様と検証境界](docs/s3-only-bookshelf.md)。

2026-10-19：Macも資料/まとめカードを共通の正方形に統一、タイトル2行分確保・末尾省略。27テスト（1スキップ）失敗0・release署名成功、Applications版更新/起動・画面確認済み。[記録](sessions/2026-10-19-mac-square-cards.md)。

2026-10-19：iOSのクラウド/まとめ/ローカル資料カードを共通の正方形へ統一。タイトルは常に2行分を確保、超過は末尾省略。72 XCTest・署名build成功、Vespera/Miraへ反映。[記録](sessions/2026-10-19-ios-square-cards.md)。

2026-10-19：Mac/iPhone/iPadのゴミ箱へ「ゴミ箱を空にする…」を追加・配布。件数/容量/関連ファイル数を確認後、既存S3全版削除/残存検査を利用。実資料削除・AWS構成変更なし。[仕様](docs/shared-library-trash.md#ゴミ箱を空にする2026-10-19)。

# 現在地

2026-10-19：屋久杉/黒漆テーマの素材が出ない問題をPNG直接復号で修正。共通44（素材の画素検査追加）・Mac27（1スキップ）・iPad/iPhone各72テスト成功。3画面の木目/質感を確認し、Mac Applications・Mira/Vesperaへ再更新/起動成功。端末別選択保存・ダーク基調を維持。[素材テーマの描画検証](docs/bookshelf-material-themes.md#素材が描画されない問題の修正)。

2026-10-19：iPhoneの常設フォルダ/薄い本棚バーと、スマホ・Mac共通ゴミ箱を実装・本番有効化。本人承認後、AWSの限定権限/コードを適用し、認証付き合成資料の移動/復元/全削除/再試行・既存catalog53件保持を確認。MacはApplications更新/起動、ゴミ箱シートと本番削除通知受信に成功。iOSは元zukanで71 XCTest・署名build成功、Vesperaへ更新。端末内コピーは削除通知保存後に消す。Mac制作原本は保持。本人の実機手操作は最終確認待ち。[配備状態](docs/shared-trash-deployment.md)。

制作方針（2026-10-14）：高密度の資料は関連する説明・例・条件を統合し、各ページの意味と読み順から構成を設計する。同一構図の機械的な反復を避け、理解を完成条件とする。[正本](rules/layout.md#内容に応じたページ設計)。既存レンダラーの仕様変更は含まない。

更新日：2026-10-10。AI図解デザインシステムは個人利用を中心とする制作支援基盤。Phase 6・6.5を経て、Phase 7はPDF・編集可能PPTXの**MVP完了**。Phase 7.5の3資料・計26枚を生成し、簡易評価を完了した。検証は[rules/quality](rules/quality.md)の3段階を使い、通常は標準検証と一覧目視、詳細検証は対象範囲に限定する。

## 実装済み・確認範囲

- 単一の直列Roadmap JSON → SVG/PNG、グリフ・重なり・境界検査、ローカル保存。
- プレゼン6種の登録v1/v2、原資料・図参照ハッシュ、内容・構造検査、行単位分割、SVG/PNG・サムネイル生成。新規はv2標準、明示v1を維持。[Phase 6](docs/phase6-validation.md)、[Phase 6.5](docs/phase65-validation.md)。
- 共通SVGからPDF・ネイティブ文字/図形/表/線を持つPPTX。Linux8枚のPDF再描画・全文字照合、PowerPointの一覧と代表要素編集を確認。ルート24件・変換3件合格。[Phase 7の証跡と制約](docs/phase7-validation.md)。全入力・全端末の表示品質や全要素の編集保証ではない。
- 独立S3アップロードとローカル専用Next.js viewerは維持。実AWSの過去証跡は[Phase 3](docs/phase3-validation.md)、viewerは[Phase 4](docs/phase4-validation.md)。現在のAWS状態の保証ではない。

## 未対応・重要な制約

- 単一図解のFlowchart/Architecture/Comparison・PDF/PPTX、パッケージ2.0の実行・移行。
- プレゼンのArchitecture/分岐Flowchart/Comparison図描画（比較スライドと表は対応）、WebP、軽量SVG・フォントサブセット。部分再生成はPhase 10Bの登録プレゼン経路に限定。
- プレゼンS3はPhase 7.6の保存経路・dry-run・モック検証を実装済み。Phase 7.6完了。Macの短期認証・専用ロール引受・非公開S3読取、承認済みRAG1件の保存・全12個GET/SHA256一致を確認。送信はPDF/PPTX/各ページPNG＋最小manifestのみ（今回の3資料のSVGはユーザー指定で削除済み）。原則1ファイル20 MB以上／合計50 MB以上を停止する。2040年産業資料の版1のみ、本人承認のキー・サイズ・SHA256固定例外を追加（[保存仕様](docs/s3-storage.md#2026-10-15の資料限定サイズ承認)）。[Phase 7.6](docs/phase76-validation.md)。Phase 11Aの複数ページWeb viewer・PDFプレビュー・形式別取得はローカル対応済み。実S3読取と取得SHA256を確認。[Phase 11A](docs/phase11a-validation.md)。iOSはPhase 11B-1のモックライブラリ・SHA256保存・オフライン読取を別リポジトリで実装し、Macの19テストを確認。[iOS現在地](docs/phase11b1-status.md)。Phase 11B-2の公開OIDC API・iOS PKCE/Keychainをローカル実装済み。API9グループ・iOS27テスト合格、実S3の署名付きPDF/PNG/PPTX読取を確認。AWS公開APIを承認後にデプロイ済み（CREATE_COMPLETE）。実パラメーターは[記録](docs/phase11b2-deployment.md)。iOSへ公開接続先を反映済み。本人の登録メール／owner sub設定と認証後の実機操作は未完了。[Phase 11B-2](docs/phase11b2-validation.md)。このリポジトリとは別のzukanの実装状況を混同しない。
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

2040年産業資料の大容量閲覧：API側も保存時のハッシュ固定承認を共用し、全42成果物のある40ページ資料を受理。viewer14件・型検査・ビルド・ローカル共通API＋実S3全42取得一致。本人の今回限りの明示承認で本番APIへ反映済み（UPDATE_COMPLETE・配備コードSHA256一致、権限/環境/実行設定維持）。実機閲覧は未確認。[API仕様](docs/viewer-api.md)。

iOS続報（2026-10-15）：移動先Development/zukan内にも20MB制限が残っており、今回の原本PDF/PPTX限定で修正。実29.64MB PDFの40ページ/保存/オフライン再表示含む53 XCTest合格、Vespera更新/起動成功。本人の資料表示操作は未確認。[記録](sessions/2026-10-15-industry-2040-ios-open-fix.md)。

2026-10-17：本人依頼のMac本棚MVPを独立`mac-app/`へ追加。既存metadata付き成果物のサムネイル一覧・版集約・仮想階層フォルダ・検索・PDF/Quick Lookプレビュー・ローカル設定保存。Foundationモデル/取込を分離しiOS共通化に備える。同期・iOS・AWS変更なし。[使い方](mac-app/README.md)。

Mac本棚の自動更新（2026-10-17）：登録フォルダをFSEventsで再帰監視し、変更を集約して自動再読込。スキャン中の変更は再実行、再アクティブ化時も確認。監視開始失敗時は30秒間隔で代替。配置済みアプリへ更新済み。[仕様](mac-app/README.md#自動更新)。

Mac本棚の複数選択（2026-10-17）：⌘追加選択・Shift範囲選択・表示中すべて選択と、選択資料の一括フォルダ移動を追加。実画面で2冊移動、10テスト合格。配置済みアプリを更新。[操作](mac-app/README.md#複数選択と一括移動)。

Macの一括ドラッグ移動：実画面でOSドラッグが移動しない問題を確認し、同一ウインドウ内のAppKitマウス処理へ修正。選択集合・件数表示・フォルダ強調を維持し、解放位置で一括保存。配置済みアプリで2冊の一括移動・別カードからの再移動・再起動保持を確認。20テスト合格。確認後の設定は検証前と完全一致。[操作と境界](mac-app/README.md#複数選択と一括移動)。

Macフォルダ画像アイコン（2026-10-17）：フォルダ右クリック／上部設定から画像選択・標準へ復帰。最大128pxのPNGコピーを端末内保存、旧設定互換を維持。14テスト合格、画像選択/保存・再起動後の表示・解除を実画面で確認。配置済み版を更新。[操作](mac-app/README.md#フォルダごとの画像アイコン)。

Macフォルダ順（2026-10-17）：フォルダ自体のドラッグで表示位置を上下に変更しfolderOrderへ保存。資料ドロップと区別し、親子/分類/画像を維持。実画面で範囲の狭さとOSセッション依存を確認後、26pt行とアプリ内マウス処理へ修正。通常版で上下ドラッグの反復・非名前順の再起動保持を確認。19テスト合格、配置済み版を更新。[操作](mac-app/README.md#フォルダの並び替え)。

Mac未整理へのドラッグ（2026-10-17）：左の固定「未整理」行に複数資料をドロップして分類を一括解除。フォルダ並べ替え先から固定行を除外。配置済み版で2冊の一括復帰を実画面確認、21テスト合格。確認後の分類は元に復元。[操作](mac-app/README.md#複数選択と一括移動)。

整理機能の共通化（2026-10-17）：Foundationのみのpackages/LibraryOrganizationを追加。Macフォルダ/並べ替え/移動/解除、iOS分類・タグ・順序付きまとめのデータ型を共通化。両端末の旧JSONを維持し、状態統合用の純粋なimportも用意。画面統合・同期・クラウド変更なし。[仕様](docs/library-organization.md)。

iOSフォルダ整理（2026-10-17）：隣接zukanへ共有パッケージによるフォルダ表示/作成/解除・複数選択一括移動/未整理へ復帰を追加。タグ/まとめ/保存済みファイルは保持、同期なし。iOS正本はzukan/docs/library-folders.md。今回実機配布なし。

Mac分類・まとめ（2026-10-17）：仕事/私用/その他・自由タグ編集とAND絞込/タグ検索、図解の順序付きまとめ作成/編集/解除を追加。共有型/検証を使い、旧library.jsonは任意追加項目を空で読込。既存資料/フォルダを維持し同期/AWS/iOS変更なし。[操作](mac-app/README.md#グループタグと図解のまとめ)。

整理同期のローカル検証版（2026-10-17）：共通パッケージへ操作キュー/版比較/再送重複防止/競合保持/削除tombstone/初回統合計画を追加。127.0.0.1の模擬HTTPで応答喪失再送を検証。アプリ/実端末データ/本番API/AWSへ未接続。[仕様・検証](docs/organization-sync-local.md)。

同期画面のローカル接続（2026-10-17）：共通LibraryOrganizationUIをMac/iOSへ接続。初回確認/送信待ち/最終同期/競合解決/再試行を独立した検証コピー上で実装。元の本棚への自動反映・実機同期・AWS変更なし。共有19/Mac24/iOS60テストとHTTPセッション検証合格。Mac実画面に加え、iOS Simulatorも専用ツール接続を復旧して初回両案選択/通信失敗再送/双方の競合解決/解除を操作確認し、原設定不変を照合。[仕様](docs/organization-sync-ui.md)。

通常本棚の同期テスト（2026-10-17）：明示的なテスト起動時だけ通常保存の送信待ち/手動同期/受信反映を接続。Mac/iOS通常画面のフォルダ・所属・タグの往復を模擬HTTPで確認。共通20/Mac25/iOS62テスト合格、反映失敗/中断回復と端末固有情報を保持。既存利用者データ/Applications版/実機/AWSは未変更。[仕様](docs/organization-sync-bound.md)。

同期開始前の管理データ保護（2026-10-17）：テスト本棚に接続前の管理JSON自動バックアップ、統合件数/競合確認、画面から同期停止/復元を追加。資料本体は対象外。共通24/Mac26/iOS64と両画面の通信失敗後復元・元JSON一致を確認。既存利用者データ/実機/AWS未変更。[仕様](docs/organization-sync-recovery.md)。

実端末の整理同期AWS案（2026-10-18再計算、未適用）：既存Cognito/HTTP API/Lambda/非公開S3を再利用。全端末5回/時と受付/終了/台帳保存/再送/無変更応答を計上。無変更75%仮定・転送枠なしで同期追加は通常約7.65円/月、毎時5回の正常通信約27.62円、全HTTP3送信＋全CAS3試行約162.50円。既存費用は別、100円の保証ではない。AWS/実データ変更なし。[構成・条件・計算結果](docs/organization-sync-aws-plan.md)。

整理同期の回数制限（テストのみ）：全端末合計で直近1時間5回、追加は画面同意1回だけ。待ち時刻/通常編集と送信待ち保持/再起動と切断後の維持を実装。共通28/Mac26/iOS64と両画面、HTTPの2端末合算/10並行5許可を確認。AWS/実データ未変更。[仕様](docs/organization-sync-quota.md)。

整理同期の通信削減（2026-10-18、ローカルのみ）：無変更は版だけを返し、失敗後30秒から最大15分＋jitter/Retry-Afterまで待つ。待機を再起動後も保持し自動再送なし。模擬HTTPで300フォルダの全応答50,901 bytes以上→無変更25 bytes、待機中HTTPゼロ・ACK喪失再送・別端末削除を確認。[仕様](docs/organization-sync-efficiency.md)。AWS/既存データ未変更。

AWS向け同期APIのローカル実装（2026-10-18）：既存viewerへTypeScript authority/回数台帳/無変更応答/CAS保存ポート/認可付きルートを追加。Swiftと5共通fixture・75ステップの応答一致、実loopback24通信とACK喪失を確認。既定Lambdaの同期ルートは無効のままで、AWS/既存データ/実機変更なし。[境界と検証](docs/organization-sync-api-local.md)。

認証付き同期HTTPS/分割送信（2026-10-18、テストのみ）：共通のBearer/bootstrap/1回silent refresh/アカウント固定、最大50操作＋実JSONバイト上限、部分ACK後の永続再送を実装。Mac/iOSのテスト本棚へ明示注入し、既定は無効。125フォルダの実ローカルTLS/応答喪失/再起動/双方向を確認。AWS/既存データ/実機未変更。[仕様](docs/organization-sync-https.md)。

同期の本番接続準備（2026-10-18、未適用）：Mac/iOSへログイン前説明・統合確認への導線、無効が既定のLambda組立、未適用CloudFormationと固定UUID/初期管理JSONのオフライン準備を追加。初回分割込み通常追加約7.71円/月、多分割常用では100円超。AWS読取はセッション期限切れ、新画面CUAはtimeoutで未操作。AWS/既存データ/実機未変更。[適用・復旧と残り](docs/organization-sync-readiness.md)。

整理同期のAWS事前確認（2026-10-18）：再ログイン後ライブ構成/IAM/S3安全設定を読取照合。新規MacClient1件、既存4リソースの更新案と固定管理キー未作成を確認。通常+初回追加約7.71円/月。適用・変更セット作成なし。[差分と最終見積もり](docs/organization-sync-aws-review.md)。

整理同期AWSの準備適用（2026-10-18）：本人承認後、置換・削除なしの変更セットを実行してUPDATE_COMPLETE、flag=false・空管理JSONを条件付き作成。既存S3上書き禁止との衝突を検出し、追加承認後に固定キー/Lambda/If-Match限定の例外を適用。Cognito本人ログイン待ちで実API少量検証・最終有効化は未完了。既存資料/端末整理情報未変更。[段階的適用](docs/organization-sync-deployment.md)。

整理同期AWSの実検証・有効化（2026-10-18）：本人の再設定/実Cognitoログイン完了。検証時の一時有効化順序も追加承認後、flag-only変更セットを置換削除なしで適用。実HTTPS10通信で合成1フォルダの作成/再送/競合/変更/削除/無変更/終了合格、server trueを維持。既存757オブジェクト/544869659 bytes一致・端末整理情報未変更。通常本棚は未接続。[配備証跡・境界](docs/organization-sync-deployment.md#最終有効化と実aws検証2026-10-18完了)。

通常本棚の接続（2026-10-18〜19、完了）：公開設定を有効化したMac/iPhoneを既存アプリへ更新。Macは本人ログイン・管理バックアップ・追加3/変更解除競合0の確認後、実API同期済み（版6/待ち0）。iPhoneも初回確認後に実同期し、Macへ戻して両端末版9/待ち0/競合0。フォルダ1/所属1/分類1/まとめ2・18参照の一致、既存情報と自動バックアップの保持を確認。共有41/Mac27/iOS67テスト合格。[現在の接続状況](docs/organization-sync-live-clients.md)。

2026-10-19：本人承認のMac/iPad左本棚統合を実装。既存一覧を保持、Macゴミ箱を同一画面内で切替、iPad上部本棚を左常設へ移動。Mac27件/1スキップ/失敗0・iPad71件合格。Applications/Miraへ更新・起動済み。[仕様・検証](docs/mac-ipad-sidebar.md)。

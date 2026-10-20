# 資料取得障害・10GBキャッシュ・分類フォルダの修復

## Request

Mac/iOSの全件・部分取得失敗の原因特定、修正、両アプリ反映、実取得確認。追加で両アプリ10GB保持、今後のAPI不整合防止、種類の親と分類フォルダの混同/フォルダ分け不能を解消。AWSは具体案と料金を提示し、本人が「提示した範囲で適用してよい」と明示承認。

## Investigation

既存Macの更新失敗を実画面で再現。本人認証 `/v1/me` 200、catalog/lifecycle 409 INVALID_MANIFEST。美術史v3の `slides/slide-NNN/slide.png` と43.8MB PDF/30.1MB PPTXの限定承認が本番Lambda未反映。catalog1件の拒否が全体を中断していた。S3完了marker64件を読取し、修正後は新形式63件すべて合格。CLIの短期AWS認証期限切れはこれと別で、公式loginによる既存権限の更新で解消した。

iPadでは内部の種類別親を普通のフォルダへ列挙し、親を選んでも未整理資料を含まず、移動先名が空になる。親への直接所属も整理済みと数えていた。移動から新規分類先を作る入口が欠けていた。直近5資料のMac割当はすべて未設定。本人の資料を勝手に分類していない。

## Changes / Files Changed

- 保存/APIの検証器をsrc/libraryへ共有。2種のページパスと承認済み全ハッシュを検査。ソース固定fingerprintを包装時・実保存前に確認。旧/新保存とも実S3書込前に本番不一致を停止。
- APIは不正な1版をwarnings付きで隔離し、健全な他資料を継続表示。新しい認証不要endpointは仕様fingerprintだけを返し、資料/本人データは返さない。
- 共通SwiftのLibraryArtifactPolicyで大容量限定承認/10GB保持を共有。Macは件数枠廃止・catalog復元。iOSはApplication Supportへ既存キャッシュを引き継ぎ、バックアップ除外、版単位LRUで詳細/本文を保つ。
- GET/URL発行の401更新・429/5xx/通信失敗、S3期限切れ/一時失敗の限定再試行。削除等の書込は自動再送しない。整合性/削除通知保護を維持。
- 種類別親は分類済みと数えず、iPadの「プレゼン（すべて）」「図解（すべて）」は未整理を含む全資料を表示。移動先から親を除き、新規分類フォルダ作成と選択資料の移動を1保存で実施。種類混在の選択は種類別に操作する案内を表示。
- CURRENT/CODEMAP/TESTING、API/保存/本棚仕様、隣接zukanの仕様と作業記録を更新。既存の未コミット制作物・サムネイル変更を保持。

## AWS適用

[承認案](../docs/library-fetch-repair-aws-proposal.md)。既存Lambda Codeだけを更新。変更セットはFunctionと依存Integrationのみ、置換なし。IAM/認証/バケット設定/予算/API1req秒burst5/Lambda256MB20秒/ログ14日を維持。新規固定費なし、検証転送は提示した0.5GB枠内、CE照会なし。

最終ZIP SHA256 `0fa9f5205863204cd9a3a499143708dab2b17b2bacf6b699943ba473c6f42106`。本番コードハッシュ一致、reader fingerprint一致、catalog53資料/警告0、lifecycle200、未認証catalog401。S3資料本体の変更・削除なし。作業中のZIP3個は既存deployments/apiへ条件付き保存しGET/SHA256照合。旧本番ZIPはローカル退避。

## Validation

- ルート58件合格（S3モック、公開前不一致時のAWS通信0、日本語実描画含む）。viewer48件中47合格/1スキップ、typecheck/build合格。不正marker混入でも健全な一覧を返す回帰を含む。
- 共通Swift50件合格。Mac35件中34合格/1スキップ。署名Release build/Applications実行ファイルSHA一致。
- iPad/iPhone最終Simulator各82 XCTest、1スキップ、失敗0。スキップは明示有効化時のみの実本番検証。
- 本番API経由で美術史PDF/PPTX/22頁PNG、リフキンPDF、既存の紙の情報処理PDFをGETしサイズ/SHA256一致。
- Mac Applications版で美術史v3/22ページを実描画。再起動後も43,829,069 bytes PDFを表示、mtime不変/SHA256一致で再取得なしを確認。旧distプロセスを通常終了。
- Mira/Vesperaの既存本人ログインを用いた実機限定XCTestで美術史22ページ/リフキン1ページを実取得、SHA256・PDFKit描画・OfflineAPIで再表示に合格。Miraは最終再試行修正後も再合格。Vesperaの追加再試験は自動ロックで待機したため重複分を停止し、先行実機合格と最終Simulator全件の結果を区別する。
- Macの独立した一時本棚で、実UIから「新しいフォルダへ移動」→作成→フォルダ内1冊→未整理0冊を確認。本人の管理JSONは変更なし。iOSは原子的な作成/移動と再起動復元を回帰で確認。

証跡はGit除外のoutputs/fetch-stability/（API応答・コード/変更セット・ハッシュ・実機描画添付・Macキャッシュ再起動・分類UI・テストログ）。iOSのビルド/配布ログ・xcresultは/private/tmp/zukan-{fetch,folder}-*。認証値/署名URLを証跡へ保存していない。

## Result / Remaining Issues

取得障害を本番修復し、10GBキャッシュと分類操作の修正版をMac Applications/Mira/Vesperaへ同じBundle IDで反映。全53資料の全形式を全端末で開いたという検証ではない。新規資料の自動内容分類は行わず、直近5資料は本人が分類先を指定するまで未整理。新規資料保存時は本番読取仕様を先に配布して一致確認し、保存完了と実端末表示完了を分ける。

最終配布：フォルダ修正込みMac実行ファイルSHA256 `8ad73aa23c32e8d4d119ad9bfef7fda3d372a236864f0500922294e23b088e6a` をApplications/distで照合。Mira/Vesperaへ通常Release版を上書き。実機のApplication Support/DiagramLibraryCache存在を読取確認。Vesperaは自動ロックにより最終起動だけ失敗したため、本人の再解除後、02:01 JSTに通常起動成功を確認した。AWS配備の非秘密要約はinfra/library-fetch-repair-deployment.json。

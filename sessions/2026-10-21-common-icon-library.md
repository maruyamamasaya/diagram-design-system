# 図解・プレゼン共通アイコン集

## Request
人物・もの・PC・サーバー・AWS/Azure等の目印を事前に用意し、図解・プレゼン制作時に必要に応じて使う。

## Investigation
既存designルールは線画/公式アイコンと由来記録を許可。AWS歴史資料の素材は個別outputs内にのみ存在。AWS公式利用案内、Azure公式利用条件/V24、Lucide固定タグ0.468.0のISCと継承FeatherのMITを確認。登録グラフィックassetsはPNG/JPEGのみでSVG直接入力は非対応。

## Changes / Files Changed
assets/iconsに143種（汎用Lucide48、AWS75、Azure20）のSVG/PNG原本、SHA256/名称/用途/出典/版/条件を持つcatalog、配布ZIPハッシュ付きsources、ライセンス、ローカル検索一覧、利用手順を追加。AWSは既存公式ZIP内の原本から抽出。Azureは公式V24から選定。AGENTS/design/agent-creation/README/CURRENT/CODEMAPから制作時の参照を接続。自動配置やエンジン入力契約は変更していない。

## Validation
143件のid重複なし/ファイルSHA256一致、Chromeで全143素材を実復号。PC検索とAzure20件のフィルターを検査。一覧先頭とAzure一覧のスクリーンショットを目視確認。文書リンク260件の対象で欠落0、git diff --check合格。4テンプレート・generate/revise・README・graphic実例を確認し既存任意アイコン規則と矛盾なし。

証跡：outputs/icon-library-validation（再実行用check-icon-library.cjs、catalog.png、azure.png、root-tests.log）。初回ルート試験はDIAGRAM_FONT未指定で描画8件失敗したため、既存OFL日本語フォントとChromeを指定して再実行。日本語SVG実描画を含む先頭6件は合格したが、プレゼン3試験プロセスで数分間結果の追加がなかったため今回起動の試験ツリーだけを停止。全ルート回帰は未完了であり合格扱いにしない。

## Result
今後の制作時に共通集から意味に合うものを選び、出典・許諾表示・ハッシュとともに制作パッケージへコピーできる。公式配布の全サービスを網羅するものではなく、必要時に追加する。

## Remaining Issues
ルート回帰のプレゼン実描画試験は未完了。今回の変更は素材と参照文書で、既存エンジン実装は変更していない。
登録レイアウトにアイコン専用スロットを追加していない。SVGからPNGへの変換と最終資料の再描画検証は資料ごとに実施。公式素材の利用は各社許諾の用途に限定し、最新版自動更新はしない。

## Follow-up：回帰完了

本人指示により日本語フォント・Chromeを明示し逐次実行。前回未完了3ファイル10件と残り48件、合計58件が全合格。直近2資料65頁はネイティブ文字の編集保存・再読込、全頁文字/図形数/画像数保持と元ファイル不変を確認。初回の未完了事項は今回解消。[範囲・制約と検証記録](2026-10-21-presentation-regression-followup.md)。

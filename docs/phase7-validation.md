# Phase 7検証：MVP完了

2026-10-09 JST。Development Mode。最新依頼の軽量なMVP判定を適用し、PDF・編集可能PPTXの基本機能は合格。全形式・全ページの詳細な画像一致や全オブジェクトの編集保証は未実施。検証レベルの正本は[rules/quality](../rules/quality.md)。

## 対象と環境

Linuxインフラ運用8枚、登録v2、資料ID `66666666-6666-4666-8666-666666666666`、最終版12。成果物は `outputs/phase7-final-mac/66666666-6666-4666-8666-666666666666/versions/000012/`。SVG/PNG・document.pdf・presentation.pptx、source・metadata・validation・export-validation・reviewを同梱。outputsはGit対象外。

Mac、Node 22.14.0、既存Chrome、Poppler、Codex同梱Python・Artifact Tool 2.8.59、PowerPoint 16.112.4で確認。Noto Sans JPは公式noto-cjkのVariable TTF、Monoは既存assets。OFLメタデータ検査を通過。PowerPoint検証中だけセッション登録し、恒久インストールせず、確認後にセッション登録を解除済み。PDFは自己完結した埋込みグリフ、PPTXはフォント非埋込み。閲覧・編集環境の書体差は残る。

## 結果

|項目|結果と証跡|
|---|---|
|生成・読取・ページ順|全4形式生成。PDF8ページをPopplerで描画。PDF/PPTXの全表示文字列をvalidationと照合し欠落0、PDF960×540pt。review/standard-checks.json|
|PDF・SVG/PNGの一覧目視|review/pdf-overview.pngとsource-overview.pngを確認。日本語、順序、情報量、重大なはみ出し・重なりに問題なし|
|PPTX実アプリ表示|PowerPointでコピーを開き8枚を認識。全8枚の一覧と代表1・3・5・8を確認。review/powerpoint-overview.png。重大な構成崩れなし|
|実アプリ編集性|コピーで1枚目のタイトルを置換、3枚目のtopセルだけを置換、5枚目のノード矩形を独立移動。edit-text/table/shape.png。変更を戻し保存せず終了。原本SHA256一致|
|線分|ネイティブlineへ変換。単独線を選択し微調整操作を試したが、端点・全線分の編集結果の詳細確認は保留。ノード追従は未対応|
|回帰|ルート24/24（v1/v2描画・分割・安全性モック）、変換3/3（v1/v2 PDF/PPTX・不変保存・不正ハッシュ拒否）合格。outputs/phase7-environmentのログ|

一覧比較では重大な視覚差分なし。PowerPointの字面・太さはPNGと差が見えるため、全ページの細かな位置・書体一致は合格扱いしない。閲覧・編集後の再保存の互換性、別端末・実投影・印刷は未検証。MVP完了と詳細検証完了を区別する。

## 発見と修正

- Windows CRLFに対する例のハッシュがMac LFと不一致。Linux原資料・Roadmapを.gitattributesでLF固定し、3つの例の参照ハッシュを実バイトへ更新。内容は不変。失敗した版8〜11は診断用に残し、版12で再生成。
- この環境のArtifact Tool 2.8.59では接続先なしのconnectorが失敗。export.cjsのSVG単独線分を文書化されたgeometry=lineへ変更。図形・文字・表の配置を変更せず、変換回帰を再実行して合格。
- Google Fontsの別配布ではファミリー名がNoto Sans JP ThinだったためPPTX制約が拒否。条件を緩和せず、公式noto-cjkのNoto Sans JPを使用。

S3・Web viewerを変更せず、AWS操作・アップロードなし。次は[Phase 7.5](phase75-validation.md)の実資料生成と実用性評価へ進む。

後処理（同日・ユーザー指定）：outputs清掃で失敗版8〜11・テスト生成物・変換途中のPDF/PPTX・最終Linux版のSVG・編集確認コピーを削除。検証レポートはoutputs/cleanup-record/evidenceへ保存、確認画像と最終PDF/PPTX/PNGは維持。過去のSVG描画確認と現在の保存ファイルを区別する。削除一覧・保持ハッシュはoutputs/cleanup-record/2026-10-09-cleanup.json。

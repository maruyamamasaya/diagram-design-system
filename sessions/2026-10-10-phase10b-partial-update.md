# Phase 10B：部分再生成

## Request
Phase 10A計画から影響スライドだけを再生成し、非更新ページを再利用して新版PNG/PDF/PPTX/サムネイルを作る。旧版・AWS・Web/iOSを保持。

## Investigation
Linux最終旧版12はSVG削除済み。維持対象を描画しない条件に合わせ、PDFのページとPPTXのネイティブXML/OPC依存を再利用する。原資料・ハッシュ・参照・登録テンプレート・生成/保存責務を照合。既存未コミット変更を保持。

## Changes
独立update:presentation CLI。計画を原資料から照合し、要確認は版生成前に保留。新構成の維持内容/参照抜粋を確認。更新だけ既存エンジンで描画・分割し、再利用PNG/サムネイルをSHA256でコピー。PDF/PPTXを新版順序に構成し既存finalizerを適用。metadataに旧版/計画/入力ハッシュ・更新/維持/削除・ページ対応・依存ハッシュを互換追加。旧/新原資料を版別スナップショットに同梱。成功後のSVG/部分生成中間を削除。旧版へのシンボリックリンク経由出力も拒否。

## Files Changed
- [regenerate.cjs](../src/update/regenerate.cjs)、[regenerate-cli.cjs](../src/update/regenerate-cli.cjs)、[compose.py](../src/update/compose.py)
- [engine.cjs](../src/presentation/engine.cjs)：pageNumberStartだけを互換追加
- [metadataスキーマ](../schemas/presentation-metadata.schema.json)、[package.json](../package.json)
- [partial-update.test.cjs](../tests/partial-update.test.cjs)、[partial-composition.test.cjs](../tests/export/partial-composition.test.cjs)、[compose-fixture.py](../tests/export/compose-fixture.py)
- [新構成](../examples/linux-operations/presentation-systemd.json)、[新図入力](../examples/linux-operations/roadmap-systemd.json)。旧examples/原資料は変更なし
- [仕様](../docs/phase10b-partial-update.md)、README/CURRENT/CODEMAP/ARCHITECTURE/TESTING、presentation-engine/exportの関連リンク

## Validation
- ルート回帰41/41（既存v1/v2実描画・分割・S3モック・Phase 12含む）、形式変換4/4（既存3＋native構成1）。Chrome起動に既存のsandbox外権限を使用、AWS通信なし。
- 最終安全確認（旧版へalias出力拒否、unsafe sourceId防止）後に関連4/4再実行合格。
- 文書リンク・git diff --check合格。
- 実Linux E2E：旧版12→新版16。Phase 10Aは5枚目のみupdate。再生成1・再利用7・計8。非更新全14 PNG/サムネイルのSHA256一致。旧版原資料/全PNG/サムネイル/PDF/PPTXの既存ハッシュ一致。PDF/PPTX全表示文字とsystemdコマンド一致、8ページ/寸法一致、PPTXネイティブXML保持・finalizer再インポート合格。
- PNG一覧、変更5枚目、PDF/PPTX再描画4/5/6を簡易目視し、重大な欠け・重なりなし。Artifact Tool再描画であり今回のPowerPoint編集・別端末・全ページ詳細比較は未検証。
- 開発失敗版13–15は保持。図kindのスキーマ適合、OPC名前空間、finalizerレポート分離を修正して版16で完了。

## Result
outputs/phase10b-systemd/66666666-6666-4666-8666-666666666666/versions/000016。旧版の変更/削除・S3送信・AWSリソース変更なし。Web/iOSの変更なし。

## Remaining Issues
意味的波及と新構成の原文照合はCodex/人間担当。論理新設スライドの自動計画、共有図の異なる版の同時利用、単一図解、要確認の自動解決は未対応。分割/並べ替え時に再利用ページの印字番号も維持するため、新順序はmetadataの対応表を参照。対応は既存登録生成の静的PDF/PPTXに限定。

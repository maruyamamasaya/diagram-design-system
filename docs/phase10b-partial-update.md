# Phase 10B：スライド部分再生成

Development Modeの独立ローカル経路。Phase 10A計画と更新済み構成JSONを入力に、更新対象だけ既存generatePresentationで描画し、維持対象のページを再利用して新しい資料版を作る。原資料から構成JSONへの意味整理は引き続きCodex担当。AWS・S3・Web・iOSを呼ばない。

## CLI

```sh
npm run plan:presentation -- --input <旧版>/source/presentation.json --before <旧sourceId辞書> --after <新sourceId辞書> --output <新規計画ディレクトリ>
npm run update:presentation -- --baseline <旧版ディレクトリ> --plan <計画>/update-plan.json --input <更新済み構成JSON> --sources <新sourceId辞書JSON> --output <出力ルート> --font <既存OFLフォント> --browser <Chrome>
```

sourcesのパスは辞書ファイル基準。新構成は同じpresentationIdと大きいversion、更新スライドは同じslideIdと大きいslideVersion。維持スライドはcontent/templateId/slideType/notes/references/slideVersionを保持し、sourceReferencesだけ新資料のハッシュ・行範囲へ移す。維持参照の抜粋が新旧で一致することも照合する。参照宣言の変更や新論理slideIdはこの計画から推測しない。

Node APIは`src/update/regenerate.cjs`のregenerate({baseline, plan, input, sourceFiles, output, fontPath, browserPath})。sourceFilesはsourceId→ファイルパス。完了時status=generated、directory/regenerated/reused/pagesを返す。要確認が残る場合status=heldとreviewSlideIds/reviewChangesを返し、出力版を作らない。CLIの終了コードは成功0、保留2、失敗1。

## 生成と保存の境界

1. 旧metadata・構成・原資料スナップショット・全PNG/サムネイル・PDF/PPTXをSHA256と既存構造検査で確認する。SVGが残っていれば照合し、削除済みなら復元しない。
2. 原資料からPhase 10A計画を再計算し、入力計画と全項目を一致確認する。改ざん・別資料・古い計画は拒否。reviewスライドまたは帰属未確定差分が一つでもあれば新資料全体を保留し、不明な変更をkeepへ降格しない。
3. 新版ディレクトリを不変ID/版で確保。EEXISTで上書き拒否。更新対象を論理slideId単位で既存登録エンジンへ渡し、既存のoverflow分割を適用する。描画ページ番号の開始値だけNode APIのpageNumberStartで指定。既存CLIの既定値は1のまま。
4. 維持対象はPNG/サムネイルをバイトコピーし、コピー後SHA256を照合。contentHash/pageId/part/slideVersion/templateId/generatedAt/元sourceReferencesを保持する。再描画しない。
5. 各生成パッケージと旧版から必要なPDFページをpypdfで、新版順に構成する。PPTXは選択スライドのネイティブXMLをそのまま使用し、notes/layout/master/themeなどのOPC依存グラフを衝突しないパスへコピーして関係を付け直す。画像化・再レイアウトしない。新しいpresentation.xmlの順序と全ページ数を検査する。既存Presentations finalizerで構造・寸法・見出し・表・フォント・再インポートを検証後に納品名へコピーする。
6. PNG/PDF/PPTX/サムネイル、原資料・構成・計画・metadata/validationを新版へ保存。SVGは更新ページの内部変換にだけ使い、成功後の.partial-workとともに削除。SVG descriptorは生成時ハッシュの証跡で、update.svgPolicy=removed-after-exportが現存しないことを示す。既存Phase 12と同じ方針。失敗時は新版のvalidation=failedと診断ファイルを保持し、成功metadataを書かない。再実行は別版。

依存は既存Node/Ajv/描画エンジンとCodex同梱pypdf/Artifact Tool。環境指定は[既存形式変換](presentation-export.md)のDIAGRAM_PYTHON/DIAGRAM_PRESENTATIONS_SKILL/RUNTIME_NODE_MODULES。新規npm依存・常駐サービスなし。

## メタデータと順序

presentation-package-1.0へ任意のupdate項目を互換追加する。baselineVersion/baselineMetadataHash/planHash/inputHash、regeneratedSlideIds/reusedSlideIds/removedSlideIds、各ページのaction/slideId/pageId/part/pageNumber/fromVersion/fromPageNumber/fromPageId/dependencyHash/コピー成果物ハッシュを記録する。旧版metadataは書き換えない。生成したページと再利用ページの依存ハッシュを区別し、資料のdependencyHashはその集約。

sourceReferencesの生成時情報は再利用ページで旧版のまま。source/presentation.jsonは新構成の現在参照を持ち、sourcesに旧・新スナップショットをハッシュ付きファイル名で同梱する。同じsourceIdでもsourceVersionで区別する。次の差分計画は新版構成の現在参照と対応スナップショットから作れる。

入力slides配列が新版順序。更新対象の自動分割はslideIdを保ちpart/pageIdで追跡。維持対象の順序変更と更新対象の明示削除に対応し、維持対象の削除は拒否する。論理的な新設スライドはPhase 10Aの帰属未確定差分の確認と計画拡張が必要。

**再利用ページの印字済みページ番号もバイト保存する。** 分割・削除・並べ替えで新順序と印字番号がずれる場合はupdate.pagesのpageNumber/fromPageNumberを正とする。番号を振り直すにはそのページも描画対象とする別計画が必要。Linux E2Eは8枚・順序不変なのでずれなし。

## Linux E2E

旧版：outputs/phase7-final-mac/66666666-6666-4666-8666-666666666666/versions/000012。SVG削除済みの既存最終Linux8枚を使用し、元資料・旧版は変更しない。

Phase 10Aの新計画：outputs/phase10b-systemd-plan/update-plan.json。新原資料はexamples/linux-operations/input-systemd.md、構成はpresentation-systemd.json、図入力はroadmap-systemd.json。5枚目の状態収集にsystemctl status <unit>/journalctl -u <unit>を追加し、元の4段階・推奨順序・条件分岐ではない注意を保持。

完成版：outputs/phase10b-systemd/66666666-6666-4666-8666-666666666666/versions/000016。更新1論理スライド・再利用7・合計8ページ、PNG/PDF/PPTX/サムネイル。旧版PNG/サムネイルの7枚全14ファイルでSHA256一致。旧版の原資料/全PNG/サムネイル/PDF/PPTXの記録ハッシュも一致。PDF/PPTX全8枚の表示文字と検査記録を照合。新規PDF/PPTXのページ数・寸法・ネイティブXML維持とfinalizer合格。

PNG一覧、更新5枚目、PDFの4/5/6、PPTX再描画の4/5/6を簡易目視。内容・日本語・コマンド・重大な欠け/重なりに問題なし。PPTXはArtifact Toolで再描画し、今回の実PowerPoint編集・別端末・全ページ詳細比較は未実施。review/standard-checks.json、画像、目視記録を新版に保持。

開発中の失敗版13–15は診断用に保持。13は図入力のkind修正、14はOPC Content Typesの既存検査適合、15はfinalizerの非納品レポート配置を修正。旧版の失敗ではない。

検証結果：ルート41/41、変換4/4、最後の安全確認後に関連4/4再実行、文書リンク/diff検査合格。[作業記録・変更一覧](../sessions/2026-10-10-phase10b-partial-update.md)。

## 検証と残課題

tests/partial-update.test.cjsは対象限定描画・分割/並べ替え対応・再利用ハッシュ・不変版・保留・計画照合・維持内容変更拒否・破損拒否・途中失敗を検証。tests/export/partial-composition.test.cjsは実pypdf/ZIPでページ選択・順序・notes・master/layout循環参照・入力保持・外部依存拒否を検証。実資料E2Eは上記の別証跡。

意味理解と更新JSONの正確性はAI/人間レビューが必要。図の単一ノード超過は既存どおりエラーで、情報を削って適合させない。単一図解の部分更新、論理新設の自動計画、未確定影響の自動解決、共有図入力の異なる版を同時利用する設計、印字番号の自動振り直しは未対応。既存登録経路で生成した静的PDF/PPTXに限定し、外部依存・custom shows/拡張presentation構造は明示エラー。S3・Web/iOSの拡張なし。

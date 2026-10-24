# 残容量の内訳と追加削減候補の監査

- Request：現在の容量内訳を示し、完成版・再生成用以外でさらに削減できるファイルを確認する。
- Investigation：CURRENTとlocal-output-cleanupの保持・証跡条件を確認。outputs全体の通常ファイル37,311件を集計（監査フォルダの新規記録を除く）。拡張子、上位フォルダ、試作SVG、確認画像、候補PDF/PPTXの役割を調査。manifest等の参照を走査し、複製をSHA256・サイズ、試作SVGを完成版metadataの生成ハッシュと現存する両PNGのSHA256で照合。
- Changes：outputs/cleanup-record/2026-10-23-remaining-audit/へinventory.json、candidate-checks.json、svg-location-groups.json、summary.jsonを保存。今回は内訳・候補確認のみ。既存の成果物・コード・設定の変更や追加削除は行わない。
- Validation：論理容量20,320,461,275 bytes。SVG9,507,483,318 bytes、PNG約4.531GB、PDF約2.376GB、PPTX約1.378GB、ZIP約1.088GB。実ディスク表示はoutputs約19GiB、repo全体約21GiB。候補55PDF/PPTXのうち必須参照のある1件を除外し、54件191,376,903 bytesを候補として識別。samples SVG83件のうち41件566,811,472 bytesが完成版の元SVGハッシュ・対応PNGと一致。残り42件は一致未確認として保持。
- Result：確度の高い追加整理候補は合計758,188,375 bytes（約0.76GB）。確認画像約1.207GBのうち386件91,741,402 bytesはmanifest等で参照されるため保持対象、残る約1.115GBは証跡・元ファイルの再描画・入力依存の確認が必要な条件付き候補。両候補群は重複しない。SVG約9.51GBを全て不要とは判定していない。
- Remaining Issues：今回は追加削除0件。候補を削除する場合は、スクリプトの入力依存・直前の稼働・保持対象ハッシュを最終確認する。確認画像は一覧/代表ページ/寸法・ハッシュ索引の保持条件も満たす必要がある。拡張子別集計を完成品/不要品の分類として扱わない。AWSの照会・削除は行っていない。

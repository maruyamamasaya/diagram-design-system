# 音楽史を除くスライド中間SVGの整理

- Request：音楽史以外のスライド関連で、中間・不要ファイルを削減して容量を空ける。
- Investigation：CURRENT/CODEMAP、保存ルールとlocal-output-cleanup、プレゼン規則、workflowのSVG削除契約を確認。outputsのディスク使用量は約32GB、SVG論理合計21.62GiB。名前だけでbuild・旧版・テスト出力を削除しない。
- Changes：Google Cloud史の制作途中SVG50件と共通グラフィック検証3パッケージのSVG18件を削除。完成PDF/PPTX/PNG、原資料、scenes、登録、素材、コード、検証記録、manifestは保持。参照先の欠けていたNoto Sans JPを既存の同一SHA256実体から元パスへ復元（新規ダウンロードなし）。音楽史は対象外、AWS操作なし。
- Files Changed：outputs/内の計画記載68SVGのみ削除。outputs/phase7-environment/NotoSansJP-verified.ttf復元。outputs/cleanup-record/2026-10-23-nonmusic-svg/に計画・実行結果・監査コード・フォント復元記録。
- Validation：完成パッケージ宣言の成果物SHA256、Google Cloud史の作業PNGと完成PNG50件の一致、フォントSHA256、原資料/入力/素材等1172ファイルの削除前後ハッシュ一致を確認。対象ディレクトリの.lock不在とlsofの開放状態を削除直前に確認。計画外の削除なし。計画のaudit.pyは削除前用であり、削除後の再実行は想定しない。
- Result：68件・925,142,240 bytes（882.28MiB、約0.93GB）の論理容量を削減。空き容量の観測差は約1.23GBだが、同時に動くOS等の影響を含むため削除効果と同一視しない。
- Remaining Issues：完全な再生成・新規目視は未実施。既存PNGと一覧・検証記録は保持。その他の大容量SVG、未完了出力、旧版は個別の参照・依存確認が必要なため保持。共有コードの変更がないためアプリテスト対象外。

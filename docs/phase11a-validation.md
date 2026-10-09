# Phase 11A：ローカル実装・検証

2026-10-09。**ローカルのS3／Web拡張は完了。外部公開用認証と公開は未完了。** 開発順序は11A→11B→12→10、Phase 8・9は保留。

## 実装

旧diagram metadataとPhase 7.6の成果物限定manifestに対応。一覧・タイトル／タグ検索・タイプ絞込・版選択APIを維持し、presentationのページ数、ページPNG、PDF内蔵プレビュー、PNG/PDF/PPTXダウンロードを追加した。PPTX自体のブラウザ編集は対象外。旧SVGはimg隔離表示を維持し、新プレゼンのSVG保存は追加していない。

manifestは固定の保存先・ID・版・キー・形式・MIME・SHA256・ページ連続性を検査し任意キーを署名しない。非公開S3、安全設定preflight、短期認証＋読取専用session policy、owner認可、cookie/CSRF、Bearer API、300秒GET URLを維持。公開環境では現行パスワード認証を拒否する。

## 検証結果

- viewer APIテスト7件合格（既存5件＋新形式／改ざん拒否2件）。任意キー、MIME変更、保存先変更、重複、欠番、20 MB以上、不正ハッシュ、path traversal、秘密フィールド、範囲外ページ、PPTX preview、失効ticketを検証。
- TypeScript型検査・Next.js本番ビルド合格。
- ローカルChrome→実S3のブラウザ確認8項目合格。未認証401、RAG検索／絞込、ページ8 PNG、ズーム／全画面、PNG/PDF/PPTX取得SHA256、PDF表示、390px幅、ログアウトを確認。
- PDF 902,888 bytes、PPTX 42,186 bytes、8ページ目PNG 170,692 bytesのSHA256が元成果物と一致。ダウンロード試験の一時複製は削除した。
- スクリーンショットを目視。PDFの日本語本文と8ページ構成、PNGページ8、モバイル幅で重大なUI崩れなし。モバイル縦向きの資料文字は小さく、拡大／横向き利用が必要。

証跡はGit管理外 `outputs/phase11a-validation/`：api-tests.log、typecheck.log、build.log、browser-s3.json、desktop-list.png、rag-page8.png、rag-pdf.png、mobile-detail.png。ブラウザ確認の初回は検証コードのページselectセレクターが不一致で停止し、修正後合格した。

## 制約・残課題

公開OIDC、公開環境のsession／失効／レート制限、外部HTTPS、iOS実機は未実装・未検証。[公開方式・認証・費用案](phase11a-deployment.md)を整理した。公開前に実装とセキュリティ検証、構成・料金・アクセス制御の承認が必要。

新manifestに生成日時／検証証跡がないためcatalog更新日時を表示し、実体整合性・目視状態は未検証として表示する。新形式の検証済み表示をmanifest検査だけで付与しない。S3を毎回全実体GETする方式は採用しない。

今回PDFはChrome内蔵ビューアーで確認。Safari・モバイル実機のPDF挙動、PPTXダウンロード後の今回の再編集は未検証（Phase 7のPowerPoint編集証跡は別）。既存生成・アップロード処理、AWS設定、既存3バケット、iOSリポジトリは今回変更していない。AWS書込・新規リソース・外部公開は行っていない。

変更対象：viewer/src/lib/manifest.ts・store.ts・api.ts、app/page.tsx・style.css、proxy.ts、scripts/mock-init.cjs・browser-check.cjs、tests/presentation.test.ts、package.json、CURRENT／API仕様／運用・探索・検証文書。新規依存なし。

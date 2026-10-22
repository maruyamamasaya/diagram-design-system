# Python / Azure RAG 研修補強 v10

依頼：前バッチを維持しScope・API Role・JWT・OAuth 2.0・Entra IDをPython処理ブロック付きで反映。
成果物：outputs/rag-training-reinforced-20261021-v10。88ページ、28テーマ、出典85件。今回200節、累計1054節の入力索引。元研修PPTXのSHA256一致を確認。過去版保持。
Creation Mode、既存パッケージ固定登録レイアウトとネイティブOOXML派生経路を継承。実装・AWS変更なし。
Entra/OAuth/JWT/Scope/Roleの責務を整理し、Azure RBACと文書ACLを区別。MSAL/Directoryは代替、JWTはPyJWT 2.10.1とRSAで拒否条件を実行。実クラウド接続・HTTP認証全体は未検証。
全88ページ再レンダリングとPDF本文/ページ番号照合、16一覧画像、追加5ページ詳細を目視。38しおり、目次、出典、PDF書体埋込みを確認。詳細はvalidation.jsonとreview/content-review.md。

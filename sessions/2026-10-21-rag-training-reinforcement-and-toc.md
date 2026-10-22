# PythonとAzure RAG：研修補強と200ページ規模の目次

- Request：Chunk/Embedding/Vector Search/Keyword Search/Hybrid Search/Top-Kの6資料を要約して既存資料を補強。Pythonは処理のかたまりで例示。後続約50資料の配分を考慮。途中で追加ページの下部2列を削除する指定、約200ページを想定した目次の再構成を受領。
- Investigation：添付5ファイル全体と会話のTop-Kを読取。Embeddingは末尾の評価節が途中で切れている。264節の入力台帳と掲載先を保存。共通規則・プレゼン専用経路・Presentations/PDFスキルを継承。MicrosoftのChunk、SearchClient、Analyzer、RRF、Vector Filterを一次資料で確認。
- Changes：別資料の版3で5枚追加・Embeddingの既存1枚再構成。版4は2ページ目を主目次として組み直し、7章それぞれの詳細目次を追加し全69ページ。Python例は14/23/26/29/32/35頁。下部2列は全6処理単位から除き、認可・Token予算等の重要条件は右側本文とノートへ整理。出典は末尾1枚と47件の通常文字URL一覧。主目次・章目次・本文参照・出典一覧のページ番号を更新。PDFしおりは章・節の38項目へ整理。
- 配分：200ページの仮配分は導入/主目次2、全体像10、文書登録30、検索40、質問応答30、セキュリティ35、開発運用35、学習17、出典1。章目次を各章枠に含む。未受領資料で変更する仮案であり、空白・水増し・200ページの固定上限を作らない。詳細はsource/allocation-200.json。
- 見直し：①重複を既存説明へ統合して追加を5枚に抑制、②Keywordのallと厳密一致・Azure内RRFと説明用関数を区別、③RRF長行を分割して実測、④本人指定で下部2列を削除し重要条件を右欄へ統合、⑤本文と目次のページ番号の二重表示を修正、⑥主目次を平面の一覧にし検索章を6節に再編、⑦PDFの自動69しおりと章目次の重複を除き38項目へ整理。最終再描画で確認。
- Files Changed：outputs/rag-training-reinforced-20261021/（62頁の途中版）、outputs/rag-training-reinforced-20261021-v4/（69頁完成版）、本記録のみ。研修元資料・前プレゼン・システム実装・AWS設定は変更しない。
- Validation：6 Python単位のAST、通常系、Overlap不正、Embedding返却数不整合、Vector次元/零Vector、RRF重複と順位、検索条件、Token予算と0件境界をローカルfixture/adapterで確認。最終PPTXはfinalizerの構造・配置・書体・69枚再import合格。PDF69枚で全ネイティブ文字との抽出一致、章節の参照先、38しおりを検査。PPTX全69枚/最終PDF全69枚を再描画し各6枚の一覧で目視。Noto JP/Mono埋込み、PNG3200×1800を確認。
- Result：69頁PDF/PPTX、ページPNG、Python例、正式な出典HTML、原資料・構成・章ID・節対応・仮配分・検証をローカル保存。AWS送信なし。
- Remaining Issues：実Azure接続、実案件の構成・動作、実PowerPoint/別端末の編集は未検証。PPTX書体非埋込み。コードは依存を注入する説明用の単位で、アプリ全体ではない。約50資料は未受領で内容と最終ページ配分は未確定。

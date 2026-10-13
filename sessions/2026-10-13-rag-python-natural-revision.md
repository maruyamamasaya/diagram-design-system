# RAG資料の自然言語・密度改訂

- Request：本人からフォーマット改善、自然言語中心、情報量増加の依頼。
- Investigation：共通6ルール・改訂プロンプト・登録v2の配置／文字階層と前版原資料を照合。通常モードを継承。一般的なRAGと権限制御の説明をMicrosoft Learn一次資料で確認。
- Changes：同一IDの新版4。独立表紙とコード抜粋を自然言語の6テーマに統合。ページ本文約350〜380字。意味・条件・運用処理を保持し、架空の出張規程例で補足。コード全文はsourceに保持。旧版は変更しない。
- Files Changed：outputs/rag-natural/004cd811-e998-434c-a268-1a0b2a5cdb79/versions/000004/、制作ソース、作業記録のみ。実装・共通レイアウト・AWSは変更しない。
- Validation：登録schema・グリフ／境界／重なり・PNG3200×1800、全6ページ一覧。PDF6ページ960×540pt、Poppler再描画一覧。PPTX finalizer／再import／6枚構造。成果物SHA256照合。新版3の一覧で発見した長いラベルの改行と前版依存表現を新版4で修正。Level 1／2、reviewに原資料対応を記録。
- Result：自然言語・密度増加の修正版PDF／編集用PPTX／SVG・PNG・サムネイル／原資料・構成をローカル生成。
- Remaining Issues：PPTXの今回の実アプリ表示・編集と別端末は未検証。既存Phase 7証跡を参照し、フォント非埋込みを保持。実RAG動作は未検証。前回環境のrealpath制限を踏まえ、outputsへの登録CLI生成・finalizerは制限外で実行。

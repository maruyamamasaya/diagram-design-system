# RAG研修補強版 v7

資料作成のみ。元研修版v15と前派生版v6を保持し、派生ID97ac89d1-644c-48b2-8c20-f31b297b28d6 v7。Queue全40節、Timeout21節、Circuit Breaker24節を読み、取り込み14頁・運用63/65頁に各1頁ずつ追加。計75頁、処理ブロック15テーマ、受領索引553節。

Queueの製品依存FIFO/完了順、Ack失敗/ロック切れと冪等性、有限再配送/DLQ、到着過多時の受付抑制、asyncとの責務差を整理。Timeoutはrequestsの接続/読取と総期限を区別し、キャンセル/相手処理停止の限界を本文へ。Circuit Breakerは3状態と分岐、atomic permit/少数probe、取消・入力不正の中立扱い、Retry配置による計数差を説明。5回の改善はreview/content-review.md。

既存レイアウトとnative文字・図形を維持しArtifact Toolで新3頁を生成、局所OOXML統合。目次・38しおり・58件出典を同期。全75頁をPPTX再import/PNG、PDFへ変換し全頁文字一致。両形式全頁14contact sheetと新3頁PDF詳細を目視。PNG3200x1800、日本語PDFフォント埋込み。Python3.12.14で15ブロックAST、新3処理の成功/空/非Ack/DLQ、期限切れ前未実行・取消、遮断と中立解放を検査合格。

実Queue製品・Circuit Breaker状態機械ライブラリ・Azure/LLMの接続は未検証。アダプター契約検査と区別する。実PowerPoint/別端末編集は未検証、PPTX書体非埋込み。資料送信/S3保存・システム実装変更なし。約200頁の配分は暫定、取り込み章と運用章の現行枚数を更新。成果物outputs/rag-training-reinforced-20261021-v7/。

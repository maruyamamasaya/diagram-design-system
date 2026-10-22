# RAG研修補強版v8

資料制作のみ、元研修版v15と前派生v7を保持。派生ID97ac89d1-644c-48b2-8c20-f31b297b28d6 v8。並行処理37、Azure OpenAI37、Cache37、Azure AI Search52節を通読し、計163節を既存説明と照合。累計19テーマ716節の索引を同梱。

Search19、Azure OpenAI34、Cache53、並行/並列66頁を追加、計79頁。主目次・7章詳細目次・38しおり・65件出典一覧を同期。19テーマのPython処理例。初稿から5回の見直しはreview/content-review.md。

SearchのHybrid単一要求/RRF、Fieldとintegrated vectorization、Agenticのpreview区別を公式仕様で確認。Azure v1のEndpoint/Deployment指定、EmbeddingとResponsesをOpenAI/Microsoft公式で照合。認証と文書ACLを分け、モデル/地域/版の固定推奨を避けた。CacheはHashの非暗号化、scopeとモデル/次元/版、TTL/失効・認可を説明。並行はI/OとCPU、依存関係、件数とRPM/TPMを区別しTaskGroupの有限batchで例示。

Artifact Toolで新4頁をnative作成し局所OOXML統合。最終化後全79頁を再import/PNG化。PDF全79頁文字一致・目次/38しおり・フォント埋込み合格。PDF/PPTX全頁14contact sheetと新4頁PDF詳細を目視、3200x1800 PNG。章先頭へ挿入したAzure頁のfirstContentPage構成値を34へ修正し再検査合格。Python3.12.14で新4テーマのSDK/adapter契約、Cache分離/Hit/TTL、同時実行上限/順序/取消、全19テーマAST検査合格。

実Azure/LLM/Cacheサービス接続や負荷試験、実PowerPoint/別端末編集は未検証。PPTX書体非埋込み。原資料送信・S3保存・システム改修なし。出力はoutputs/rag-training-reinforced-20261021-v8/。200頁の配分は暫定のまま現行章枚数を更新。

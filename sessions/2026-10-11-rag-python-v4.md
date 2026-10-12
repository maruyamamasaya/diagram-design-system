# Azure/Python RAG資料 改訂4

- 依頼：Azureサービス名・図を含む資料をPythonの設計まで展開。前のS3送信承認と継続指示に基づく。
- 成果物：outputs/rag-azure-python-v4。25枚、graphicモード、package専用の固定登録レイアウト。システム実装変更なし。
- 追加：回答API/取り込みワーカーの分離、API処理フロー、モジュール責務、Blob/Service Bus/ワーカー/Search配置、再試行、外部アダプター、品質/変更管理。
- Microsoft公式AzureアイコンV24を原色・縦横比を保持して使用。出典・利用条件はassets/attribution.json。Python配置は推奨案であり現行社内設計未確認、Accenture PoCは仮説。
- 検証：25ページSVG/PNG、PDF再レンダリング、PPTX再インポートの全ページ一覧目視。サービス名を含む図4/21を詳細目視。日本語文字欠落0、重なり/境界検査合格。PDF960x540、PNG3200x1800。PPTX native tableは13/16/20/23/25、本文と図形は編集可能。
- 制約：PowerPointアプリ自体では未検証、Noto Sans JP非埋込み、ノード移動へ線は追従しない。
- 検証記録・依存hashはvalidation.json。S3は同じ専用非公開保存先へ版000004、29オブジェクト/8,261,388 bytes。読み取り安全確認合格後に保存を実施。完了証跡はs3/upload-status.jsonで確認。

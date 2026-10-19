# GitHub説明資料：人物・管理ケース増補 v3

ユーザー依頼：登場人物を固定し、「相手」が誰か迷わない説明と管理ケースを補足。

同一ID 61d4570c-0356-4d22-bf24-aad4a80ec7aa の000003。既存42枚を保持し、3名の役割、2台のPCとGitHub、権限・main保護・取り込み、困ったときの担当を4枚追加して46枚。用語・README・同時push・fork・APIケースを田中（実装）・佐藤（共同開発/レビュー）・鈴木（管理）に統一。架空例の権限と異なる運用例の前提を明示。公式GitHub repository rolesを追加調査。

outputs/github-mechanisms-20261019-v3 の共通内容JSONとパッケージ専用固定レイアウトからSVG/PNG/PDF/PPTXを作成。既存システム・AWSは変更しない。新規レイアウトの実測で3頁文量超過を検知し短文化、再描画して解消。5項目以上の改善証跡はproduction/improvement-log.md。

検証：入力スキーマ・対応・関係、全46枚の描画境界と重なり、PDF/PPTXの全文一致・ページ寸法・ネイティブ要素・PDFフォント自己完結を確認。PDFはPoppler、PPTXはArtifact Toolで全ページ再描画。全ページ一覧と新規・改訂箇所の拡大一覧を目視。Git挙動の検証証跡は意味が不変なv2を継承。

制約：PowerPoint本体での編集・表示は未検証。PPTXフォント非埋込み（Noto Sans JP/Monoが必要）、線は独立要素。ローカル独自パッケージ。S3送信なし。

## S3保存

本人がバケット名・PDF/PPTX・46PNG・管理情報約18.8MBを明示承認後、既存S3Storage経路とパッケージ専用loadPackageを利用して保存。事前に全ローカル成果物と依存ハッシュを照合。非公開preflight、協調排他、サイズ・保持上限、条件付きPUT、AES256、全GET照合、catalog最後を維持。元metadataは変更せず、個別保存manifestを追加。50オブジェクト18,758,250 bytes。upload-status.state=complete、成果物48ファイルGET検証とmanifest2コピーの照合が完了。
保存先：s3://diagram-design-system-676643701781-apne1/library/diagrams/61d4570c-0356-4d22-bf24-aad4a80ec7aa/versions/000003/
保存証跡：同版のs3-artifacts-manifest.json、upload-status.json。AWS設定変更・削除なし。ビューア実機表示は未確認。

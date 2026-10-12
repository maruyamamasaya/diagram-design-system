# RAG資料のAzure向け再制作

## Request
開発者向けに既存RAG資料を作り直す。社内でAzure上に稼働しているが詳細未確認。Azure上の望ましい構成を示し、ユーザー指定のグラフィック版で制作。

## Investigation
既存Phase75 RAG8ページ・共通制作規則・プレゼン規則・グラフィック専用運用を読取。Microsoft LearnのRAG概要、設計、権限、ベクトル化、分割、参照構成、評価を確認。アクセンチュアPoC由来は仮説であり未確認。

## Changes
同じ資料ID b290c3e5-9e2f-4abc-9193-d937859e9af6、版3。18ページの専用固定配置・意味入力をoutputs/rag-azure-graphicへ保存。全体構成・同期サイクル・検索統合・認可をネイティブ編集可能な図で説明。表3ページをネイティブ表として保持。現行構成未確認の注記を表示。原資料・出典を同梱。

## Files Changed
成果物と制作・検証ソースはoutputs/rag-azure-graphicのみ。システム実装・AWS・viewer変更なし。本作業記録を追加。

## Validation
構造・文字境界・文字重なり・3200x1800 PNG・PDF18ページ960x540ptを検査。PDF/PPTX表示文字の欠落0、ネイティブ表13/16/18。SVG/PNG、PDF、PPTX再読込の全ページ一覧を目視。表の余分な罫線を既存OOXML正規化処理で修正。詳細はbuild/検証記録。

## Result
ローカルPDF・PPTX・全18PNGを制作。S3送信なし。専用登録レイアウトの認定は本資料に限定し、システム登録能力へ一般化しない。

## Remaining Issues
社内現行設計は未確認。PPTXはNoto Sans JP非埋込み、実PowerPoint編集・別端末表示は未検証。PPTX再描画はArtifact Tool。通常版試作の失敗（Node/フォント初期設定・Chrome sandbox）を診断用に保持。グラフィック制作はChromeを許可範囲で実行し完了。

## S3保存（同日追加）
本人の「今の資料はS3に上げて良いよ」に基づき版3を既存承認済み専用非公開S3へ保存。PDF/PPTX/18PNG＋最小manifest2コピー、22オブジェクト・6,111,639 bytes。読取preflight（非公開/BPA/所有権/SSE-S3/保持上限）合格、条件付きPUTと全22 GET/SHA256/MIME/SSE-S3照合合格、catalog最後掲載。原資料・認証情報・ZIP・中間ファイルは送信なし。証跡outputs/rag-azure-graphic/s3/。自動承認レビューは一度、社内機密の送信先承認不十分と判断して拒否。実際の内容がMicrosoft Learnから作った一般推奨案であり現行社内資料を含まないことと既存保存先承認を検証記録で提示し、同一操作の再審査で許可・保存完了。今回公開OIDC/API/端末の操作確認は未実施。

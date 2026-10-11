# グラフィック版のプロンプトとS3保存

## Request
深掘り版をS3へ更新し、今後の制作でグラフィック版／通常モードを確認できるプロンプトにする。

## Investigation
保存仕様、設定・metadataスキーマ、AWS構成・コスト方針、既存S3Storage、manifest正規化、プレゼン子規則とプロンプトを照合。深掘り版は専用契約のため通常upload CLIへ渡さない。既存の実装・設定は維持。

## Changes / Files Changed
prompts/presentation.md、generate.md、revise.mdに表現モード選択を追加。docs/presentation-graphic-mode.mdに文献調査、関係図、生成イラスト、パッケージ専用固定登録、再描画・目視を含む運用を定義。docs/presentation-skill-policy.md、agent-creation.md、README、CURRENTへ対応リンク・制約を反映。生成モードとは別の選択とする。任意画像の自動CLI組込みは未実装のまま。

outputs/emptiness-deep/s3へ資料限定の引渡し・最小manifest・承認束縛・read-only preflight証跡を保存。PDF/PPTX/24PNGと最小manifest2個、計28ファイル、21,981,671 bytes。原資料・プロンプト・書体・認証は送信対象外。既存S3Storageの安全検査、条件付きPUT、全GET照合、catalog最後掲載を維持。

## Validation
文書検証：33文書のナビゲーションリンク、diff check合格。変更したプロンプトを通常・グラフィック・指定済み・既存修正の各ケースで読み合わせ。4図解テンプレートの意味・描画は変更なし。
S3：ローカルハッシュ・許可リスト・サイズ検査合格。既存viewer manifest正規化で版3、24ページ、3形式を受理。AWS read-only preflightと保持上限確認合格。

## Result / Remaining Issues
プロンプト更新完了。S3書込みは一度自動承認レビューが具体的な保存先・対象への承認を要求して拒否。ユーザーの追加承認後、版3の全28オブジェクトを保存しGET/SHA256・サイズ・MIME・SSE-S3一致。独立した読取り再検証も全28件合格。既存ライブラリの読取実装＋実S3で最新版3・24ページ・3形式と26成果物の全ハッシュを確認。公開OIDC API／端末UIは今回未検証。非公開設定・IAM・予算・既存版の変更はなし。

## 追加承認と再認証
ユーザーが具体的な保存先・28ファイルの送信に「どうぞ！」と明示承認。approval-review.jsonへmanifest SHA256に束縛して記録。保存開始時にAWS短期認証が期限切れのため書込み前に停止し、既存公式CLIの東京リージョン指定で再ログイン成功。承認を再要求せず、同じ版・同じバイトで再実行して保存完了。証跡：outputs/emptiness-deep/s3/result.json、upload-status.json、library-read-verification.json。

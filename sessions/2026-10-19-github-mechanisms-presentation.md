# GitHubの仕組み：開発経験者向けプレゼン

- Request：GitHubの仕組みを日本語でわかりやすく説明。本人指定は開発経験者向け・グラフィック版。
- Investigation：Git公式のPro Git/コマンド仕様、GitHub Docsのflow・PR差分・マージ・Actions・認証等の一次資料を確認（2026-10-19）。
- Changes：28枚。Gitオブジェクト/参照、index、fetch/push/pull、fork、PR、3方式のマージ、競合、保護、CIのSHA、信頼境界、認証、配布、復旧、具体例。制作パッケージ専用固定レイアウト。実装変更なし。
- Files Changed：outputs/61d4570c-0356-4d22-bf24-aad4a80ec7aa/versions/000001/ にPDF/PPTX/28PNG/一覧/原資料/意味入力/登録配置/検証。制作作業はoutputs/github-mechanisms-20261019/。本記録のみ追跡文書追加。他の既存変更は未操作。
- Validation：スキーマ・入力対応・参照・文字実測・境界・文字重複検査合格。5回の具体的改善と描画後修正をproduction/improvement-log.mdへ記録。PDF全28ページPoppler再描画・一覧確認、PPTX全28枚をArtifact Toolで再インポート描画・個別確認。両形式全文字照合で欠落0（PDF英字合字はNFKC正規化して照合）。ネイティブ表7枚・テキスト/図形/線、PDF960x540pt・フォント自己完結、PNG3200x1800確認。隔離したローカルGitでfetch/three-dot diff/merge・squashの親数/indexの記録を実検証。
- Result：日本語28枚の資料をローカル完成。既存システムの機能追加・変更はなし。AWS/S3へのアクセス・送信なし。
- Remaining Issues：PPTX書体非埋込み（Noto Sans JP/Mono必要）。独立線分はノードへ自動追従しない。今回の実PowerPoint本体での表示・編集、別端末は未検証。

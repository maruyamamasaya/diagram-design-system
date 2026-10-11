# Phase 10A：差分検出・更新計画

## Request
Development Modeで新旧資料の差分と影響スライドを検出し、JSON/Markdown計画を出す。再生成・AWS変更なし。

## Investigation
sourceIdは文書、sourceVersionは実バイトSHA256、sourceReferencesは旧行範囲、contentHashは分割後の描画content。既存の未コミット変更を保持し、生成/保存コードへ変更を加えない。

## Changes / Files Changed
src/update/plan.cjs・cli.cjs、tests/update-plan.test.cjs、Linux systemd追加入力・source辞書、packageのplan:presentation。docs/phase10a-update-plan.mdを仕様正本とし、CURRENT/CODEMAP/ARCHITECTURE/TESTING/READMEと生成仕様へ参照を追加。

## Validation
関連4テスト合格。Linux計画CLI実行：更新1・維持7・要確認0、JSON/Markdown出力。初回既存テストは旧Node/未設定フォント、続いてChrome sandbox起動制限により失敗。Node・既存OFLフォント・Chromeを設定し、権限調整後の並列描画試験は応答停止のため中断。直列回帰でroot 37/37合格（既存実描画含む）、viewer 9/9合格、typecheck合格、文書リンク36件欠落なし・diff --check合格。Full buildとPDF/PPTX追加変換試験は変更範囲外のため未実施。

## Result
5枚目の障害調査だけを更新対象とし、後続行ずれによる不要更新なし。計画のみ作成。既存資料の実再生成・送信・AWS操作なし（既存回帰試験の一時描画は別）。

## Remaining Issues
意味的波及・文書間依存・図入力/描画依存差分・実再生成は未対応。誤った参照は自動修復しない。大規模資料は要確認へ退避。

# outputs清掃

- Request：outputsの不要データを削除。
- Investigation：主な容量はPhase6/6.5/7のテスト生成物、Linux失敗版8〜11、SVG。
- Changes：テスト生成物・失敗版・変換途中PDF/PPTX・不要フォント配布・編集コピー・Linux SVGを削除。必要なテストmetadata/validation等はcleanup-record/evidenceへ移動。
- Files Changed：outputsとPhase7/7.6記録のみ。
- Validation：完成4資料のPDF/PPTX/PNGを削除前後SHA256照合、一致。テスト再生成は不要。
- Result：299ファイル、887.72 MBを削除。outputsはduで873 MiBから26 MiBへ縮小。削除一覧と保持ハッシュはoutputs/cleanup-record/2026-10-09-cleanup.json。
- Remaining Issues：SVG再変換は原資料から再生成が必要。AWS接続・送信は未完了。

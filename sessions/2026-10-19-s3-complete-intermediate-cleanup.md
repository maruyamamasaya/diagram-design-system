# S3保存完了資料のローカル中間ファイル整理

- 依頼：ローカルMacの不要生成物を調査し、S3アップロード完了資料の中間ファイルは削除してよいとの本人指示。
- 対象：outputs内の10資料。upload-status.jsonのcompleteとGET照合済み記録を確認し、PNG/PDF/PPTXの現存ファイルを保存記録のサイズ・SHA256と照合した。今回の実AWS再照会は行っていない。
- 削除：build/rendered配下の中間SVG290個とbuild直下の変換候補PDF/PPTX40個、計330個・4,201,021,444 bytes（約4.20 GB）。
- 保持：原資料・source.json・scenes.json・生成スクリプト・素材・納品物・検証画像と記録。対象パッケージ内の保持1,904ファイルを削除前後のSHA256で照合し、全件一致。中間ファイルの消失を確認。再レンダリングは未実施。
- 証跡：outputs/cleanup-record/2026-10-19-s3-complete-intermediates.jsonに削除対象・サイズ・ハッシュ・納品物照合結果を保存。既存metadataは変更せず、清掃記録で現存状態を補足。
- 範囲外：S3オブジェクト・アプリ利用データ・ビルドキャッシュ・Mac全体の一時ファイルは削除していない。読取調査ではLibrary/Developer約72 GiB、/private/tmp約18 GiBを確認したが、全量を不要とは判定していない。

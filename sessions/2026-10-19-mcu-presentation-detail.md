# マイコン資料：調査を反映した詳細版へ改訂
- Request: 前の21枚は情報が薄い。会話で調べた内容をプレゼンへ反映する。
- Investigation: 会話/旧構成/原資料の欠落を照合。共通6規則、プレゼン規則、専用登録運用、Presentationsスキルを使用。ST・Renesas・Nordic・Siemens・Espressif・Raspberry Pi・Arduino・micro:bit・M5Stack・TIの一次資料、入門キットの販売情報を再確認。20資料と対象範囲/確認日を保存。
- Changes: 30枚へ再構成。CPU/記憶/周辺機能、チップ/モジュール/ボード、入出力、測定器の対象、モーターの帰還、PLCと内部基板、IoTの役割、更新/復旧、検査・供給・費用、日常の部品と発展を反映。P-NUCLEO-IHM03/各基板、Motor Workbench等を具体名で掲載。表と図に理由・例・条件を統合。制作パッケージ内の固定レイアウトに限定し、システムの実装/登録表は変更なし。
- Files Changed: outputs/mcu-deep-creation、outputs/2050d3a8-5668-4421-a10f-29a1c22e1c63/versions/000004。版3は形式目視で表の追加改行が判明した試作として保持。
- Validation: review-log.mdに7回の具体的改善を記録。入力対応・出典・図の意味/方向・グリフ・文字境界/重なりの自動検査。試作PPTX全30枚を再importし個別目視、版4で13/20枚目の表と句読点改行を修正し再確認。最終PDF全30枚の再描画/一覧目視。PDF960×540pt/PNG3200×1800。PDF/PPTX全文字欠落0、PPTXネイティブ表16枚・テキスト760runs、finalizer/再import合格。原資料/描画/依存ハッシュを保持。
- Result: 詳細版のPDF/編集可能PPTX/全PNG/サムネイル/原資料/検証をローカル納品。AWS・外部公開なし。
- Remaining Issues: PowerPoint本体での編集、別端末/投影は未検証。PPTXはNoto Sans JP非埋込み、独立線分はノードに追従しない。パッケージ専用契約であり標準presentation.schema.json適合やS3アップロード対応を主張しない。

## S3アップロード依頼と実行制限
- 本人依頼: 「S3にアップまでお願い」。完成版4を対象に、既存loadPackage注入経路へ制作物専用ローダー outputs/mcu-deep-creation/s3/upload.cjs を作成。標準schemaの偽装なし、既存の所有者/非公開/AES256検査、条件付きPUT、取得SHA256検査、版数制限、lifecycleProtectionを継承。
- ローカル検証: metadata自己ハッシュ、78成果物のサイズ/SHA256、原資料/依存ハッシュ、30枚/版4の同一性、必須検証passedを確認。送信許可リストは30PNG/PDF/PPTXと最小manifest2個、34 objects / 14,719,811 bytes。通常サイズ制限以内、保存概算0.065円/月。
- 実行結果: sandbox内はAWS認証情報取得不可。昇格による既存プロファイル使用を自動承認審査が2回拒否。2回目は既存configとPhase3本人承認/所有者証跡を提示したが、審査は未信頼資料として扱い、具体的宛先の本人承認不足を理由に拒否。AWSの実アップロード未実施。ローカルupload-status.jsonは初回試行のfailedであり、S3障害を意味しない。
- 再開条件: 本人による具体的バケット名/所有者と当該完成資料の送信先承認を得て、同じuploadコマンドを再実行する。認証情報のコピーや別経路による回避は行わない。

## S3保存完了
- 本人がAWSアカウント676643701781 / バケットdiagram-design-system-676643701781-apne1と、今回の詳細版30枚のPDF・PowerPoint・PNGの送信を明示承認。既存アップロード経路を再実行して成功。
- 結果: state=complete、完成成果物32件とmanifest2件、合計34 objects / 14,719,811 bytes。各PUT後のGETによるサイズ/SHA256/MIME/AES256照合完了。catalogは最後に公開。ライフサイクルロック解放済み。
- 保存: library/diagrams/2050d3a8-5668-4421-a10f-29a1c22e1c63/versions/000004/。catalog: library/catalog/2050d3a8-5668-4421-a10f-29a1c22e1c63/versions/000004/upload-manifest.json。
- 証跡: 成果物版4のupload-status.jsonおよびs3-artifacts-manifest.json。S3保存と取得照合を確認。viewer/端末での表示は今回未検証。

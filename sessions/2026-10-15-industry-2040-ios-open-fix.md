# iOSで40ページ資料を開けない不具合

- Request: 本人が「資料が開けませんでした」と報告し、29.64MB/全体111.89MBが原因か質問。既存のiOS対応依頼を継続。
- Investigation: 別会話の移動記録からiOS実体Development/zukanを確認。旧パスの不存在だけで調査を止めた前回の確認範囲を補完。iOSのCloudModels.swiftとCloudAPI.swiftに20MB制限が残存。詳細の全ファイル検査でPDF/PPTXが拒否されるため画像閲覧開始にも影響。主因は合計容量ではなく1ファイルの制限。
- Changes: zukanにCloudArtifactSizePolicyを追加。同じ資料UUID/版1/40ページ/presentationで、承認済みPDF/PPTXの名前/MIME/サイズ/SHA256が完全一致する場合だけ許可。署名URL取得時も同じバイト情報で判定。既存HTTPS/ホスト許可/期限/サイズ/ハッシュ/認可を維持。AWS/API変更なし。他作業の未コミット変更を保持。
- Validation: 53 XCTest全件合格。新規2件は対象/版/サイズ/ハッシュの拒否と、実29.64MB PDFの40ページ読込・保存・キャッシュ削除後オフライン再表示。fixture試験はskipなし。構造・diff検査、実機署名build/codesign合格。ログ /private/tmp/zukan-large-{test,device-build,device-install,device-launch}.log。
- Result: 既存Team/Bundle IDでVesperaへ更新インストール、更新版起動を確認。アンインストールや保存資料削除なし。iOS正本docs/large-presentation-size-fix.md、CURRENT/READMEへ記録。
- Remaining Issues: 本人のログイン済み実機で今回の資料をタップして表示する操作は未確認。

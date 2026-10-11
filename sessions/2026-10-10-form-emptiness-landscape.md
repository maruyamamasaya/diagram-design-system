# 色即是空図鑑：横画面版
- ユーザーの縦→横画面希望に従い16:9・2頁へ再配置。Agent Creation / hybrid、既存挿絵再利用。本文・定義・二句・縁起・生活例・五蘊・誤解・日常の入口を保持。
- outputs/form-emptiness-landscape-20261010に原資料/ジョブ/描画ソース/画像/結合PDF/再描画/QAを保持。1600×900、PNG3200×1800。全84ラベルをPDF抽出と照合。共有グリフToUnicode補正は結合PDFのみ、描画は不変。
- Level1/2：全PNG/PDF再描画を目視。花と定義欄の画像干渉を修正後再描画、期待ラベル/グリフ/境界/PNG正常読取合格。実端末表示は未検証。
- S3：既存ID bc6b4d8c-7fce-400b-83d2-c2e31ee62c25 v4、a3e1d9c0-9be0-4d28-8fc7-36a1f384e080 v2。各PNG/PDF・最小manifestを既存安全CLIで保存、complete・GET/SHA256一致。結合PDFはローカル納品。旧版を削除せずAWS設定変更なし。
- 関連するiOSまとめ機能は別repoに実装・検証を記録する。この生成依頼と保存経路にアプリ機能を混在させない。

## iOSの関連作業
- Presentation-Viewer側に端末内の図解まとめを追加。利用者別設定、順番編集、1カード、前後移動、使用ページ一括保存。クラウド同期/AWS/API変更なし。
- 同repo docs/diagram-collections.mdに仕様/検証/制約。44 XCTest、Simulator操作、署名build/codesign、Vespera更新/起動成功。既存の未コミット作業を保持。実機対話操作は本人確認待ち。

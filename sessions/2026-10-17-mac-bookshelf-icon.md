# Mac本棚アイコン

- Request：Dockで識別できる本棚のアプリアイコン。
- Changes：青緑の角丸背景・木の二段棚・色違いの本をAppKitで描画。16〜1024pxを生成しICNSへ格納。build-app.shへ生成とCFBundleIconFileを統合。PNGプレビューをassetsへ保存。
- Validation：PNGを目視、release build成功、ICNSをsipsでPNGへ再変換成功、署名検証成功、git diff --check合格。iconutilは実行環境でInvalid Iconsetのため標準ICNSチャンク格納へ変更。
- Result：/Applicationsの既存アプリを更新、Launch Services再登録・Dock再読込、配置先から起動成功・65冊と分類保持を確認。Dock上の描画そのものの目視は未実施。iOS/AWS変更なし。

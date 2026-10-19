# 作業経路・現行文書と固定レイアウトの整理

## Request
古い説明を現在へ合わせ、資料制作・アプリ改修・設計思想の分岐を明確化。通常/グラフィック版の固定レイアウトへ制作経験を反映。

## Investigation
入口/CURRENT/構成/探索/運用/検証、プレゼン子AGENTS・契約・登録表・v2描画/変換、共通6規則を照合。マイコン詳細版、セキュリティ改訂、GitHub増補、AWS高密度版の記録から、薄い説明・画一的構図・不明な主体・過分割への改善要求を確認。既存未コミットのMac/フォルダ統合作業は保持。

## Changes
- work-routesを入口として3系統を整理。CURRENTを現行能力/適用状態/未確認へ集約、整理直前の内容は別スナップショットへ保持。ARCHITECTUREをS3正本本棚/公開OIDC API/共通同期/ゴミ箱の現行責務へ更新。
- README/AGENTS/CODEMAP/OPERATIONS/生成契約の旧未適用・未対応説明を修正。Phase検証文書は歴史的証跡として維持。
- 通常版とグラフィック版の設計方針を一本化。後者の構成/操作/因果/比較/具体例という専用固定登録の仕様カタログを追加。標準システムrendererを追加済みとは扱わない。
- 通常表v2へ任意widthProfileを追加。等幅は保持し、短い項目と長い説明・例・条件に固定列幅を配分。任意座標/数値幅と列数不一致を拒否。PPTXネイティブ表へ共通SVGの列幅を引渡す。

## Files Changed
入口6文書・運用、docs/work-routes.md、docs/presentation-layout-policy.md、プレゼン関連仕様/プロンプト/表テンプレート、profile/schema、validate/dense/export、列幅テストと変換回帰。Mac/iOS/AWS設定の変更なし。

## Validation
文書リンク・差分書式合格。追加仕様文書の相対リンクも独立照合。固定列幅5経路（省略/等幅/2列/3列/4列）実描画・全セル保持・行分割・最小文字/境界/重なりを検査し、一覧目視で欠落/重大な崩れなし。Node24のFull検証成功（root50合格、viewer45合格/1スキップ、typecheck/build合格）。v1/v2と新固定列幅のPDF/PPTX変換4件合格。新列幅のPPTX OOXML比率とPDF全表示文字を照合し欠落0。新表の最終PDFをPoppler、PPTXをArtifact Toolで再読込・描画し、両画像を目視して列境界/文字/罫線に重大な崩れなし。実PowerPointの確認とは区別。

ログ：outputs/layout-profile-verify-node24.log、layout-profile-export-node24.log、layout-profile-targeted.log。画像/対象パッケージの索引：outputs/layout-profile-tests/evidence.json、export-evidence.json。通常表の省略/等幅/3固定プロファイルの全ページ一覧はoverview.png。共通ルールの4意味テンプレート、generate/reviseプロンプト、既存実例は今回の追加任意項目を強制せず互換維持。CLI既定・旧v1/v2・全形式の境界は変更なし。

初回のサンドボックス実行はChrome起動が失敗。通常MacのNode22実行は終了待ちが長く中断し、既存制作と同じ同梱Node24へ合わせて上記を完了。中断実行を合格へ算入しない。

## Result / Remaining Issues
グラフィック版の新しい汎用rendererや全資料認定は追加していない。専用登録・検証は制作単位で必要。実PowerPoint編集・別端末・投影は今回未検証。PPTX書体非埋込み・線の独立性を保持。資料送信・AWS変更・端末配布なし。

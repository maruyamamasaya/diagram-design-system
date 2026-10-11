# 独立一枚図の制作・S3・iOS分離

## Request

文章から複雑な一枚図を制作。SVG主体／画像部品＋組立／画像生成のみを制作時に指定・相談。品質は文字中心。PNG/PDF出力、共通S3、iOSの「プレゼン資料」「図解ライブラリ」分離、実装から実機デプロイ・テストまで。

## Investigation

既存のプレゼン保存は最小manifestと不変版を持つ。旧単独図解はSVG/PNGのみ。共通APIはtypeをiOSへ提供し、iOSにはPDF/画像拡大・ハッシュ保存・オフライン読取がある。両repoの既存未コミット変更は保持。

## Changes / Files Changed

- prompts/illustration.mdとdocs/illustration-workflow.md：選択・質問・画像生成スキル利用・文字レビュー・CLI契約。
- src/illustration：Agent制作済みSVG/PNGを変換。自由サイズ、OFL文字、期待ラベル、変形後文字境界、SVG安全検査、PNG/PDF・サムネイル・原資料と元描画ソースの保存、同版拒否。
- src/upload/illustration.cjsと共通保存loader接続：全ローカルハッシュ・review確認、PNG/PDFのみ送信。旧保存経路・条件付きPUT/GET照合・サイズ/保持上限は維持。
- viewerのmanifest/store/api：illustration-s3-1.0、type=illustration/pageCount=1、PDF参照、旧データ互換。
- Presentation-Viewer別repo：3タブ、typeによるオンライン/保存済みの分類、2タブ共通認証、画像生成した図のPNG/PDFモック。既存一枚プレゼンを誤分類しない。
- 責務別入口文書・export/storage/qualityを更新。一般パッケージ2.0やプレゼン生成は変更しない。

## Validation

- Node同梱v24でFull：root 43、viewer 10、typecheck/build、docs/diff合格。最終の元ソース保持・SVG変形境界追加後、illustration関連2グループを再実行。
- 3経路の実描画/PDF、同版拒否、原文改ざん拒否、未承認送信拒否、再実行GETのみ、禁止SVGを検証。既存保存テストが衝突/途中失敗/保持/サイズ境界を担う。
- built-in image_genで説明用サーバー構成画像を生成。8英語ラベルを目視。正確なpromptはoutputs/illustration-production/image-prompt.txt、制作ジョブはjob-image.jsonに保存。選択画像はworkspaceへコピー。
- 画像生成のみの実成果物：outputs/40dfe0b6-faec-4a34-8d90-f7c12155f6cf/versions/000001。PNG 1,102,266 bytes、PDF 738,041 bytes。PDFは1ページの画像PDF。Poppler再描画・目視でラベル/欠落/文字崩れなし。
- 承認済み専用S3へ説明用の非機密PNG/PDF＋manifest2コピーを保存、4 GET照合成功。ローカル共通API処理＋実S3でtype/pageCount、PNG/PDF取得SHA256一致。公開HTTPS/OIDCの認証済み確認ではない。
- iOS最終31 XCTest合格（1枚PDF追加で旧テストの固定8ページ想定が失敗し、各資料のpageCount照合へ修正後合格）。構造/diff検査合格。
- Simulator初期画面の「プレゼン資料」、3下部メニューを目視。GUI操作ツールのSimulator取得はタイムアウトし、図解タブ操作/拡大/保存の操作検証は未実施。
- 既存iPhone Vesperaへ同Team/Bundle IDの署名ビルド・更新インストール・起動成功。実機の新図解クラウド取得/拡大/保存は未確認。

## Result / Remaining Issues

ローカル生成・S3保存・API/iOSコードと実機更新は完了。本番APIコード更新は自動承認レビューが「具体的な本番API更新への明示承認がない」と拒否。回避せず、outputs/illustration-deployにzip・既存パラメーター保持計画を準備。asyncで既存diagram-library-apiのコードだけの更新承認を依頼。認証・権限・template・固定費は維持し、新AWSリソースなし。

新catalogをS3へ掲載済みのため、旧本番APIは新manifestを未対応として扱い一覧取得が失敗する可能性がある。API更新承認と適用を優先し、その後に公開/iOS実図解取得を検証する。全1〜5・本番連携完了とは報告しない。原資料送信・機密資料・IAM/予算変更・削除は行っていない。

## 本番更新の追記

ユーザーがasyncで「本番APIのコード更新を承認する」と明示承認。既存コードzipをSHA256別キーへ保存し、CloudFormationの既存templateと全CodeKey以外のパラメーターをUsePreviousValueで維持。初回は公開記録のパラメーター一覧にCursorSecretがないためValidationErrorで未適用。実スタックからパラメーター名だけ取得し、秘密値を読まずUsePreviousValueを追加して再実行。UPDATE_COMPLETE、Lambda Active/Successful、実コードSHA256とzipが一致。Role/Memory/Timeout維持、公開HTTPS未認証401。infra/phase11b2-deployment.jsonの公開コード情報を更新。旧APIの新manifest未対応状態は解消。

ローカル共通API＋実S3のPNG/PDF取得・SHA256確認済み。本人ログイン状態での公開HTTPS/iPhoneの表示・拡大操作はasyncで確認依頼。応答前には合格扱いしない。GUIツールのSimulator取得はタイムアウトしたため、初期画面だけ目視。最終関連テストは原資料再実行パス、文字未確認の保存拒否、途中失敗のcatalog未公開・再開成功も含む。

本人の実機テストで「本番接続は未設定です」。別repoの実機ビルドに有効な接続JSONが存在することを確認。認証初期化のtry?が設定読取とKeychain復元をまとめて握りつぶしていた。ログイン復元失敗でも設定を保持し、アクティブ復帰時再読取、初期化待ち/設定読取失敗表示と再試行を追加。32 XCTest・実機build合格、修正版を更新。AWS追加変更なし。実機の再表示は本人確認待ち。

続報「接続を準備しています」のままに対し、共有CloudConnectionState/Publishedと各タブのObservedObject gateへ変更。設定読取はSimulator本番起動で成功しており、初期化結果の表示反映を独立して修正。iOS26.5の33 XCTest合格、既存Vespera/iOS26.6.2へ署名版更新・起動成功。本人の再表示結果は未確認。前修正では実機問題を取り切れていなかったことを説明。

最終追記：待機継続のためiOS側を初回タブ描画前の同期初期化へ変更。34 XCTest合格、署名build成功、Vespera更新・既存プロセス終了後に起動。実機診断で設定読取成功と保存ログイン復元を確認。本人から「資料が見つかりませんに変わった」「いけたっぽい」と回答され、一覧への遷移を確認。図解個別表示/拡大/オフライン操作は未確認のまま区別する。AWS追加変更なし。

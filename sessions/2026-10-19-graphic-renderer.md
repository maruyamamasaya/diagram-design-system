# グラフィック版の共通描画器

Request：専用固定レイアウトを共通実装に昇格。お茶の資料の好ましい構成を再利用し、既存素材または生成画像も利用できるようにする。

Investigation：共通規則、プレゼン契約と描画/変換/保存、一括制作、部分更新、お茶20枚版の固定登録と画像台帳、既存のマイコン/GitHub/セキュリティ改訂を照合。Presentationsスキルの配置・ネイティブ編集・再描画検証を適用。既存のお茶関連未コミット文書を保持。

Changes：6種のgraphic登録、意味入力schema1.3、固定描画/共通SVGからPNG/PDF/PPTX。PNG/JPEG素材の出典/利用条件/ハッシュ/生成記録、パス/寸法/復号検査、ローカル原画像保存、PPTX画像要素と表示ラベル/ノート。一括制作は画像も再実行照合。画像付き部分再生成は旧素材を誤再利用しないよう明示拒否。

Files Changed：src/presentation、config/schemas/テンプレート、workflowの素材ルート/照合、updateの制約、uploadの画像ページ検査/素材照合、関連文書・tests・examples。AWS/viewer/アプリ変更なし。

Validation：Node24のFull合格（root55、viewer45合格/1スキップ、typecheck/build）。全変換6件合格。最終の関連3件も合格（危険ID/座標、画像のパス/由来/生成prompt/ハッシュ/symlink/不正PNG/容量・画素上限、6種実描画・超過拒否・不変版）。画像付き部分更新の事前停止、一括制作の画像変更時の生成前停止、保存前の素材スナップショット破損拒否を確認。保存モックと実AWS検証を混同しない。

お茶の既存PD図面2点を台帳ごと再利用し、通常CLI（認定例外なし）で6枚のPNG/PDF/PPTXを生成。共通PNG全6枚、最終PDF全6ページのPoppler再描画・PPTX全6枚のArtifact Tool再インポート描画を目視。文字/画像の重大な重なり・欠落なし。PDF全表示行の文字保持、960×540pt/6ページ、PPTXの元JPEGハッシュ一致を確認。テストではPPTX画像3配置とネイティブ図形/文字、生成表示・prompt/出典/利用条件のノート保持を照合。生成画像のメタデータ検証に使ったPNGは検査用画素であり、実際に画像生成サービスを呼んだ証跡ではない。

改善：①意味入力と図面/画像の役割を分離、②生成由来表示と素材台帳を追加、③初回一覧を見て句読点改行を修正（graphicだけ）、④図版比較の枠を広げて文字/条件と再配置、⑤保存引渡しの原色検査と素材破損検知を追加、⑥危険な要素IDを制約し再検証。認定は今回のサンプルだけで、他の入力は個別に内容/目視確認が必要。

ログ：outputs/graphic-full-verify.log、graphic-all-exports.log、graphic-tests-final.log、graphic-cli-demo.log。最終実例：outputs/graphic-common-demo/482278e8-5e11-4322-9b89-1e57a03bf833/versions/000001。再描画一覧：同親フォルダのpdf-overview.png、pptx-overview.png。生成方法はexamples/graphic-slidesとdocs/graphic-renderer.md。

Gitignore確認：作業終了後、git check-ignore -vで実成果物のPNG/PPTX/ログ、node_modules、S3ローカル設定、.aws、.env.local、credentials、pem、viewer/Mac/共通Swiftの生成ディレクトリを確認。全件が意図したignore規則に一致。git ls-files -ci --exclude-standardは0件、追跡済みoutputsは0件、確認対象のローカル認証設定ファイルも0件。ignoreの変更は不要。

Remaining Issues：実PowerPoint・他端末・投影は未確認。書体非埋込/線の非追従は維持。画像はラスター。任意グラフ、任意座標、素材自動検索/生成サービス呼出、画像付き部分再生成は対象外。

コミット前確認：docs/s3-storage.mdの誤置換をHEADの既存仕様へ復元し、今回の画像ページ検査の追記だけを保持。後から生成されたsrc/update/__pycache__を発見し、Pythonキャッシュ規則を.gitignoreへ追加。既存の追跡済みファイルは変更せず、リンク/差分と除外を再確認。

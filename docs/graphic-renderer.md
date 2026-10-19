# グラフィック共通描画器

2026-10-19。通常v1/v2を保持し、slideType=graphicの6テンプレートを追加。新規グラフィック制作ではまずこの登録経路を選び、不足する構成だけ専用固定登録を使う。仕様は[テンプレート](../templates/slides/graphic.md)、意味入力は[スキーマ](../schemas/presentation.schema.json)、登録状態は[登録表](../config/slide-templates.json)。

お茶の20枚版で評価された、大きい既存図版・読みどころ・比較・背景の統合をevidence/evidence-pairへ反映。マイコンやGitHubの主体/操作/結果、セキュリティの原因/分岐/介入を他の登録族へ整理した。原資料を読み構成を決める工程はAIが担当し、描画器は図版を自動検索・生成しない。

## 使い方

schemaVersion=1.3、slideType=graphic、templateId=slide.graphic.evidence.v1等を明示。通常スライドとの混在も可能。CLIの--inputファイルのあるフォルダを素材ルートにする。Node APIはassetRoot（省略時はrepo root）を指定する。一括制作CLIも入力ファイルのフォルダを使用する。構造例と準備方法は[サンプル](../examples/graphic-slides/README.md)。

```sh
npm run generate:presentation -- --input <job>/presentation.json --source <job>/input.md --output outputs --font <OFL日本語フォント> --browser <Chrome>
```

開発認定のみallowUnreviewedTemplates=trueを使う。通常CLIから未確認レイアウトを通過させない。正常入力のサンプル確認は全入力や実PowerPoint表示の保証ではない。

## 画像台帳と安全な再利用

トップレベルassetsにassetId、path、sha256、kind（existing/generated）、referenceId、origin、license、altを記録。既存資料からの抽出画像でも元の出典・利用条件を保持する。licenseは単なる入力記録であり、描画器が転載許諾の適否を判定するものではない。generatedはpromptを必須とし、キャプションへ「生成画像・説明用」を自動表示する。元画像はローカルsource/assetsへそのまま保存する。

各画像スロットはassetId・caption・readingを指定。referenceIdは資料全体と掲載ページのreferences双方で宣言する。表示キャプションに参照ID、PPTXノートに出典・利用条件・画像ハッシュ・生成プロンプトを保存する。生成画像を実際の史料/実測/出来事の写真と扱わない。原資料からの画像と生成画像は同じassets契約で扱うが由来を区別する。

ASCII相対パスのPNG/JPEGのみ。URL・絶対パス・親参照・symlink・未知形式・不一致ハッシュを拒否。1画像20MB以下、展開後40百万画素以下。PNG/JPEGの内容を検査してChromiumで復号、縦横比を保ち切り抜きや色変更をしない。従来の文字・線のモノクロを維持し、承認済み素材の原色は保持する。安全検査は利用条件の確認を代替しない。

素材のバイト・由来・入力と依存ハッシュを追跡し、metadata.assetsへローカル保存情報を記録する。一括制作の再実行では原画像とローカルコピーのハッシュを確認する。画像の参照先だけ同じでバイトが変わる場合も停止する。完成済みの同ID/版は上書きしない。

## 互換性・検証境界

PNG/PDF/PPTXの出力・既存プレゼン保存契約を再利用。保存前検査は登録画像ページの原色保持検査と素材スナップショットを照合し、従来ページのモノクロ検査を維持する。原画像・プロンプト台帳は送信許可リストへ追加しない。画像はPPTXの画像要素、文字・図形・線はネイティブ要素。フォント非埋込み、線がノード移動へ追従しない制約は従来通り。画像を含む部分再生成は現段階で明示拒否し、新版全体の生成を使う。原画像の追跡なしに旧ページを再利用しない。

自動検査は構造・参照・図版の実復号・グリフ・文字境界/重なり・画像と文字/画像同士の重なり・PNG寸法/不透明性。色のある素材のページを「モノクロ検査合格」と偽らない。情報の十分さ、図の意味、図版の読みやすさは原文照合と再描画目視で確認する。過去資料や新サンプルの認定を別資料へ流用しない。

今回の検証結果は[作業記録](../sessions/2026-10-19-graphic-renderer.md)。AWS構成・viewer・アプリの変更、資料送信は行わない。

# 本棚の素材テーマ

最新修正：本人の「反映されていない」という指摘から、名前指定Imageの描画で素材が出ていないことを再現。以下の初回証跡は配色・切替の確認であり、素材描画の検証は不十分だった。PNG直接復号へ修正し、末尾の描画検証・再配布を正とする。

2026-10-19。本人指定の屋久杉・黒漆をMac / iPad / iPhoneへ追加。明るい屋久杉のモックから、ダーク利用に合わせた墨茶へ変更。黒漆は墨黒・控えめな艶・淡い朱のアクセントとする。

## 操作と境界

- Mac：上部の半円アイコン → 本棚のテーマ → 屋久杉 / 黒漆。
- iPad：管理 → 本棚のテーマ。iPhone：上部「…」→ 本棚のテーマ。ローカル資料はiPadの上部メニュー／iPhoneの引き出しにも入口を置く。
- 初期値は黒漆。選択は各アプリのUserDefaults `bookshelf.materialTheme`。未知の値は黒漆へフォールバック。再起動で保持し、整理同期へ含めない。
- 両テーマともダーク表示。資料画像・PDFの色と既存のiPhone横向き指定を維持する。
- 質感はサイドバー・上部操作面へ限定。資料一覧とカード本文の背景は無地。強い光沢、金の装飾、動く効果は追加しない。
- コントラスト増加時はテクスチャを省き、カード境界を強める。選択状態は既存の選択通知と枠も併用。

## 正本と配布

色・合成率・枠は[BookshelfTheme.swift](../packages/LibraryOrganization/Sources/LibraryOrganizationUI/BookshelfTheme.swift)だけに定義。素材PNGは同階層 `Resources/yakusugi.png` と `Resources/urushi.png`。新しい外部依存はない。

共有LibraryOrganizationUIのSwiftPMリソースとして両アプリへ同梱。Macの署名済み.appは `Contents/Resources/LibraryOrganization_LibraryOrganizationUI.bundle` を使い、ローダーが先に探索する。SwiftPM実行時は `.module` を使う。`build-app.sh`がコピーしてから署名し、ビルドフォルダの絶対パスだけに依存しない。

両素材は本人承認で組込みimage_genにより新規生成。実物の屋久杉・漆のスキャンではなく素材感を参考にしたAI生成画像。CLI/API fallbackや外部画像は使わない。生成後の画素加工はせず、SwiftUIで透過合成する。

## 生成プロンプト

屋久杉：

```text
Generate a pure material texture asset, square full bleed, no objects, no UI, no words, no borders. Dark aged Japanese Yakusugi cedar veneer, exquisite fine flowing long wood grain, deep smoky walnut brown with subtle amber undertones. Very LOW contrast, almost monochromatic dark brown, quiet sophisticated natural variation. Flat diffuse evenly lit orthographic scan, matte satin finish, no hotspots, no perspective, no large knots, no stripes or planks. Suitable behind high contrast cream UI text at very low opacity. Seamless-looking edges. Fine premium authentic organic material, not an illustration.
```

黒漆：

```text
Pure material texture asset, square full bleed. Japanese kuro-urushi black lacquer surface, exquisitely smooth polished satin, subtly handmade microscopic organic surface. Extremely LOW contrast rich charcoal black, no wood grain. Flat even diffuse scan with faint broad soft tonal variation, no bright highlights, no reflected objects, no metallic flecks, no dust, no scratches, no cracks, no borders, no words, no graphics. Barely perceptible cool graphite glints in deep smoky near-black. Luxurious restrained authentic black lacquer material to be composited at low opacity behind an elegant dark app sidebar. Flat orthographic macro scan, no perspective. Seamless-looking edges.
```

## 検証

- 共通Swift package：43テスト、失敗0。
- Mac：27テスト、1スキップ、失敗0。releaseビルド、Applications更新後の厳密codesign検証、起動、既存66冊の一覧、2テーマ切替、再起動時の屋久杉保持を確認。
- iPad / iPhone Simulator：各71 XCTest、失敗0。両テーマの一覧と選択を目視。iPhoneはテーマをメニュー先頭へ移した最終版で再検証し、終了・再起動後の屋久杉保持を確認。
- 画面証跡：`outputs/material-themes/{mac,ipad,iphone}-{yakusugi,urushi}.png`。Macは既存資料、Simulatorは同梱モック。iPad証跡はメニュー順改善前だが素材と配置は同一。
- 実機配備は下に追記。本人の実機評価、長時間利用、大文字・OSのコントラスト増加の実操作は未検証。

初回の実機ビルドはTeam未指定で停止し、既存Team指定で成功。初回Mac署名はSwiftPMリソースの.app直下配置で失敗し、Resources配置とローダーを修正して成功。

## 実機配備

2026-10-19 10:58 JST：既存Team/Bundle IDで署名build、厳密codesign検証成功。Mira（iPad）・Vespera（iPhone）とも上書きインストールと更新版起動成功。アンインストール・データ初期化なし。実機での本人のテーマ選択・見え方は確認待ち。Mac Applications版も更新・起動・既存66冊の一覧を確認済み。

ログ：`/private/tmp/zukan-material-{device-build,ipad-install,ipad-launch,iphone-install,iphone-launch}.log`、`/private/tmp/bookshelf-material-{shared-tests,release}.log`、`/private/tmp/bookshelf-theme-tests.log`、`/private/tmp/zukan-material-{tests,phone-tests}.log`。Mac旧アプリの復元用コピーは `/private/tmp/Zukan Bookshelf-before-material-20261019.app`（一時領域、永続バックアップではない）。AWS構成変更なし。

## 素材が描画されない問題の修正

同梱PNGの存在・NSImageによる名前解決は成功し、OSのコントラスト増加も無効だった。しかしSwiftUI `Image(name, bundle:)` を使う旧素材面をImageRendererで描画すると、木目と黒漆の両方がほぼ一様な下地/グラデーションだけになった。PNGのURLからNSImage/UIImageへ直接復号して `.original` のImageへ渡すと、同じ条件で素材が描画された。復号画像は素材ごとに一度読み込んで再利用する。素材が分かる程度の強さへ合成率も調整。数値正本は引き続きBookshelfTheme.swift。

`BookshelfMaterialTests` は両素材を縦長サイドバー・横長ツールバーで実レンダリングし、中央の横一列のRGB平均値の幅が3/255を超えることを要求する。単色グラデーションだけでは通らない。旧描画の横一列の幅は両素材とも1/255、修正後は同じ縦長条件で屋久杉16.33/255・黒漆4.67/255。横長も合格。画像内容の見た目の合否は別に目視する。

- 共通44テスト成功（素材の画素検査を追加）。Mac27（1スキップ）・iPad/iPhone各72 XCTest成功。
- Mac・両Simulatorで2素材を目視。MacとiPhoneでは木目、黒漆では微細な質感が実際に表示されることを確認。
- 描画比較：`outputs/material-texture-fix/{before,decoded,after}/`。旧初期化・直接復号だけの変更・合成率調整後を区別する。
- 実画面：`outputs/material-texture-fix/screens/{mac,ipad,iphone}-{yakusugi,urushi}.png`。Macの修正前も同階層に保存。SimulatorとMacの資料・選択状態は異なるため、画面全体の厳密な差分比較ではない。
- 11:07 JST、Mira/Vesperaへ上書き更新・起動成功。MacもApplications更新・署名検証・起動成功。資料/認証/設定の初期化なし。本人の実機での最終評価は未実施。
- ログ：`/private/tmp/material-texture-{shared-tests,mac-tests,mac-build,ipad-tests,iphone-tests,device-build,ipad-install,ipad-launch,iphone-install,iphone-launch}.log`。Mac初回再buildは同時の既存ソース更新で停止し、更新後に回帰検証・再build成功。

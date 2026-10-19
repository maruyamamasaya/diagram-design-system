# グラフィック共通レイアウトの構成例

fixture.cjsは説明用の6構図を返す関数で、座標を入力へ渡さない。素材なしなら文字・図形の4構図を返す。画像2点を渡す場合は、画像台帳assetsを用意してfixture(assets)を使う。図版の出典・利用条件・SHA256は利用する実ファイルで確認し、サンプルの値を流用しない。

```js
const fs = require('node:fs');
const { fixture } = require('./fixture.cjs');
const assets = JSON.parse(fs.readFileSync('<job>/assets.json', 'utf8'));
fs.writeFileSync('<job>/presentation.json', JSON.stringify(fixture(assets), null, 2));
```

`<job>/assets.json`はschema1.3のassets配列。pathは同じjobフォルダからのPNG/JPEG相対パスとする。generatedのpromptは実際に使用した生成プロンプト、originは生成記録の所在、licenseは確認した利用条件を記録する。existingは元の図版/資料の出典と利用条件を保持する。ここに実画像は同梱していない。

```sh
npm run generate:presentation -- --input <job>/presentation.json --source <job>/input.md --output outputs --font <日本語OFLフォント> --browser <Chrome>
```

本文・条件・読みどころを対象資料へ置き換える。例を実在システムの設定や史実として扱わない。1枚だけ作る場合は対応するslideと画像台帳を抽出し、必須参照を残す。制作は[共通描画器](../../docs/graphic-renderer.md)、検証は[TESTING](../../TESTING.md)に従う。

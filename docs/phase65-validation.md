# Phase 6.5：比較・検証記録

2026-10-09。Development Mode。スキルの[採否](presentation-skill-policy.md)を基に、6種の登録v2を追加。v1を維持。SVGをChromeで実レンダリングしてPNGを生成した。AWS操作・外部公開・viewer改修・依存追加なし。

## 変更範囲
src/presentation/engine.cjs、dense.cjs、config/presentation-profile.json、slide-templates.json、presentation.schema.json、6つのtemplates/slides、rules/design/layout/quality、Linux改善版JSON、tests/presentation-v2/presentation、README・AGENTS・CURRENT・CODEMAP、スキル採否・配置仕様・本記録。前フェーズや並行作業の未コミット変更を保持。

## 成果物と比較
改善前：outputs/66666666-6666-4666-8666-666666666666/versions/000002/
改善後：outputs/66666666-6666-4666-8666-666666666666/versions/000004/

各slides/001〜008/slide.svg・slide.png、thumbnails、原資料、構成JSON、metadata.json、validation.json、review.json、comparison.png（左v1/右v2）を保存。outputsはGit対象外。開発確認版3を保持し、最終コードの依存ハッシュを持つ版4を生成した。

全8ページのcontentの深い一致と原資料バイト一致を確認。コマンド、ICMP条件、単位・採取時刻、環境差、機密ログ、変更後確認を維持。AIの内容確認は既存資料との対応確認で、Linux実コマンド試験や新しい外部事実調査ではない。

|ページ|v1の囲い|v2の囲い|v2最小文字サイズ|
|---|---|---|---|
|1|0|0|20|
|2|5|0|20|
|3|12|1|20|
|4|5|0|20|
|5|4|4|20|
|6|4|0|20|
|7|3|0|20|
|8|3|1|20|

囲い合計36→6。罫線はこの囲い数に含めない。タイトル・項目ラベル・結論を強め、比較軸は共通列へ、表は見出し帯だけ面にした。本文24・補足20を保持。表示領域は外周64→48に拡張し、カード内余白24→16。内容量を増やしたという主張はしない。登録上限はBullet5→6、Table6→8、Comparison4→5、Summary3→4となり、実測で収まらなければ分割する。

## 自動検証
- npm run verify -- fast：ルート22/22、viewer API5/5、typecheck、文書リンク16文書欠落0、diff --check合格。
- 新規試験：旧content・参照一致、v1上限維持/v2上限拒否、6型8枚実レンダリング、最小サイズ・囲い数、長い8行の表分割と全セル保持。
- 全8枚：日本語グリフ、文字境界・包含余白・重なり、モノクロ、PNG3200×1800、サムネイル800×450、メタデータ契約合格。
- 最終版PNG8枚が目視した開発版とバイト一致。最終版の自動結果でvisualReview/contentAccuracyはnot_reviewedのまま、AI目視はreview.jsonに分離。

## AI視覚確認
左旧/右新の全8ページ比較と、基本コマンド・調査順序・比較・まとめの大きいPNGを確認。文字切れ・日本語崩れ・意図しない重なりなし。カードの反復が減り、項目と説明、比較軸、結論と行動の区別が読み取れる。短い比較・注意点には余白が残るが、内容の水増しをしない方針に沿う。全ページの意味と順序を保持。囲い数だけで美しさを判定しない。

## 制約・次工程
実iPhone・会議室投影・印刷は未確認。スマホ横向きの全体表示は細部が小さいのでズーム前提。禁則処理、長いラベルの単一項目、図ノード超過は追加検証が必要。SVGは全フォント埋込みで大きいまま。自由配置・自動内容補完は追加していない。

PDF/PPTX設計・実装へ進める基盤はある。ただし形式変換後の日本語・文字位置・編集性は改めて検証する。未実装形式を生成済みとしない。次の候補は「項目名なしの要点を2群に分けるBullet」「比較軸が長い縦積みComparison」「注記・単位を持つTable」。需要のある入力例・スキーマ・境界テスト・視覚確認を揃えて登録する。

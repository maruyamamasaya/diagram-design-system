# Phase 10A：差分検出と更新計画

Development Modeの独立ローカルCLI。生成・保存・AWS・viewerを呼ばず、既存構成と新旧原資料を読み、JSON/Markdown計画だけを書く。追加依存なし。

```sh
npm run plan:presentation -- --input examples/linux-operations/presentation-phase7.json --before examples/linux-operations/sources-before.json --after examples/linux-operations/sources-systemd.json --output outputs/phase10a-systemd-plan
```

before/afterはsourceIdから原資料ファイルへのJSON辞書。パスは辞書ファイル基準。文書追加はafterのみ、削除はbeforeのみ。出力先は新規ディレクトリ必須、既存を上書きしない。Node APIは`src/update/plan.cjs`のcreateUpdatePlan(presentation, beforeSources, afterSources)。SourcesはsourceId→テキスト。

## 追跡と判定

- sourceIdは文書識別子。sourceVersionは文書実バイトのSHA256。旧原資料は全sourceReferencesのハッシュと一致させ、不一致・欠落は停止する。
- slideIdは論理スライド識別子。分割pageIdごとには計画しない。旧構成のsourceReferencesを使う。現行contentHashは描画後の分割contentのcanonical SHA256なので、原資料ハッシュとも未分割構成とも直接比較しない。原資料だけの変更を検出する本経路では既存contentHashを変更しない。
- 行LCSでadded/modified/deletedを分類し、旧行座標と新行座標・本文・sourceId・affectedSlideIdsを保存。参照範囲の重なりで影響判定し、後続の行ずれだけでは更新しない。
- Markdown既存節内の純追加は、直前の見出しから次の見出しまでの旧節へ帰属させる。新見出し・境界の曖昧な追加、非対応locator、範囲不正、参照欠落はreview。未参照の変更はreviewChangesへ残し、新スライドの要否を人間/AIが確認する。
- updateはregenerationRequired=true、keepはfalse、reviewはnull。regenerateSlideIdsにupdateのみを含める。これは次版の推奨で、再生成を実行する承認や処理ではない。JSONのchangedもreviewではnull。
- 文書ハッシュが変わっただけで全スライドを更新しない。CRLF/末尾改行だけの差はunknownとして確認対象。LCSは行数積100万まで、それを超えた資料はunknownとして保留する。

## 検証例

既存Linux8枚とinput.mdを使用。input-systemd.mdでは「障害調査の順序」の末尾にsystemctl statusとjournalctl -uの説明を1行追加。旧lines:9-10を参照する5枚目（slideId末尾005）のみupdate、1–4/6–8枚目はkeep。後続の行番号がずれても不要な更新なし。計画はoutputs/phase10a-systemd-plan/update-plan.json・update-plan.md。

関連試験は`node --test tests/update-plan.test.cjs`。Linux追加/不変、変更/削除、文書追加/削除、曖昧参照/新節、比較上限、改行差、旧ハッシュ不一致、CLI出力/上書き拒否を確認。

検証結果：関連4件、ルート回帰37件（直列実行）、viewer 9件、型チェック合格。既存描画回帰を含む。文書リンク・diff検査も合格。AWS通信・新資料の実再生成は未実施。

## 制約

意味推論、見出しIDによる対応、文書間の間接依存、図入力・テンプレート・フォント依存の差分は未対応。繰り返し行の対応はLCSの決定的な選択であり意味的な移動判定ではない。入力参照の正確性が前提で、誤った参照による欠落は自動補完しない。表紙・まとめへの意味的波及は内容レビューで判断する。単一図解、実再生成、分割再編成、S3最小manifestだけからの計画は未対応。ローカル原資料・構成JSONを保持する。

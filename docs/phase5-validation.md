# Phase 5検証記録

2026-10-09。登録テンプレート方式の設計・スキーマ・内容検査を追加した。AWS操作と既存CLI/ストレージ/ビューアーのコード変更は行っていない。

## 今回の変更
- schemas/presentation.schema.json：全体と6種contentのdraft-07契約、未知フィールド拒否、templateId/typeの束縛、数量・文字数制限。
- config/slide-templates.json：6種の設計登録。rendererImplemented=false、visualValidation=not_run。
- templates/slides/：title、bullet、two-column-comparison、diagram、table、summary。使用条件、入力契約、固定配置・余白・文字・超過分割・検査を定義。
- rules/presentation.md、docs/presentation-design.md、prompts/presentation.md：AI/レンダラー責務、選択、共通トークン、図解統合、出力・移行・次工程。
- src/presentation/validate.cjs、tests/presentation.test.cjs：構造と意味の一部を検査する独立モジュール。描画機能ではない。
- examples/linux-presentation/source.json：6ページ設計例。READMEとAGENTSに専用経路を追加。

## 実行結果
ルートnpm test：15/15合格。既存11件＋Phase 5の4検証群。型/ID不一致、未知レイアウト、文字・項目超過、出典不明、ID重複、表の矩形性、危険パスを拒否。未実装図解型は設計データとして検証できるが描画成功を意味しない。

初回はPlaywright付属ブラウザが未配置のため既存レンダリング試験が失敗。既存のDIAGRAM_BROWSER設定にインストール済みChromeを指定した再実行で、日本語・原文コマンド・XMLエスケープ・境界・超過を含む実レンダリング試験が合格した。エンジンのコードは変更していない。

```powershell
$env:DIAGRAM_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe'
npm test
cd viewer
npm test
npm run typecheck
```

Phase 4のAPI試験5/5とTypeScript型検査も合格。ビューアーはローカル専用のまま。

## 未検証と未実装
6スライドテンプレートの描画・視覚品質・文字幅実測・オーバーフロー分割実行は未実装/未検証。今回の寸法は設計値であり実画面品質を保証しない。JSON例の図解参照パスとSHA256は記録したが、参照実体の照合・型検査・読み込み安全境界は次レンダラーの責務。スキーマの合格は資料内容の正確性を保証しない。

プレゼンSVG/PNG/PDF/編集可能PPTX/サムネイル/metadata生成、マイグレーション、S3保存、Web/iOSの複数スライド対応は未実装。既存単一Roadmap SVG/PNG生成とS3経路は維持。品質確認済みテンプレートの標準化は次フェーズで全6種の実描画証跡を登録してから行う。

作業開始時から存在したAgent Creation Mode関連の他の変更は保持し、本工程の成果と混同しない。今回のプレゼン経路ではPhase 5の登録済みテンプレート標準を優先する。

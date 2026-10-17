# 資料の複数選択ドラッグ実画面確認と修正

## Request
複数資料を左のフォルダへまとめてドラッグする操作を実画面確認し、不具合を修正。

## Investigation
配置済みアプリで2冊選択は成功したがOSドラッグ後の確認フォルダは0冊。カードの同期イベント待ちとOSセッションへ依存する経路を変更した。画面操作は専用CUAのみ使用。

## Changes / Files Changed
CardDragSurfaceは通常のmouseDown/Dragged/Upで追跡し、開始時の選択IDを固定。FolderDropSurfaceの弱参照行一覧から同一ウインドウの解放位置を判定し、一度だけ保存する。件数カーソル・行強調・キャンセル時クリア。OS受信互換は維持。DragTestsに実ハンドラーの複数ID/解放前保存なし/対象外/キャンセル/クリック回帰を追加。README・CURRENT・CODEMAP更新。

## Validation
- CUA: 2冊を⌘クリック選択→確認フォルダへドラッグ→同フォルダに2冊表示。
- 同じ2冊のもう一方のカードから「技術」へドラッグ→元フォルダ0冊・移動先2冊。
- 配置済みアプリを終了/再起動し「技術」に2冊残ることを確認。
- 画面証跡: mac-app/.build/validation/card-drag/{two-books,after-restart}.png。
- 元の資料分類へUIで復帰し、空の確認用フォルダを解除。library.jsonは検証前の読み取りスナップショットと完全一致。
- Swift20テスト合格、実outputs65冊/152版/注意0。release build・配置・codesign検証成功。

## Result / Remaining Issues
依頼の一括ドラッグ移動を実画面確認済み。65冊と元の分類を保持。iOS/AWS/原本変更なし。複数ウインドウ間移動や外部へのドラッグは対象外。

# Mac本棚MVP

- Request：既存成果物をそのまま読むMacのサムネイル本棚、フォルダ整理、検索、プレビュー。iOS共通化を見据え同期は後回し。
- Investigation：生成側CURRENT/CODEMAP/ARCHITECTURE/TESTING、既存metadata各形式、移動済み別repo Development/zukanのLibraryStore・CloudCollection・まとめ/分類仕様を確認。iOSは読取のみ。
- Changes：mac-appの独立Swift Packageとローカルad-hoc署名.app。Foundationモデル/取込・SwiftUI画面/ブックマークを分離。階層仮想フォルダ、ドラッグ/右クリック分類、タイトル/ID検索、版集約、既存表紙/縮小PNG、PDFKit/Quick Look、元ファイル参照、原子的設定保存。制作時の独自metadata、標準presentationVersion/slides配列、辞書artifacts、旧files参照を扱う。
- Files Changed：mac-app/、README、CURRENT、ARCHITECTURE、CODEMAP、TESTING、OPERATIONS、本記録。
- Validation：Xcode26.6/Swift6.3.3、release build・ad-hoc署名成功。SwiftPMの二重sandbox起動失敗は--disable-sandboxでビルド実行に限定して解決。5 XCTest合格（版/重複探索、標準/辞書、パス逸脱/欠落拒否、保存復元/解除後原本保持、実outputs）。実データ65冊/152版、読込警告0件（検証時点）。テストログ /tmp/bookshelf-tests-final.log。
- UI：ネイティブアプリを実起動。outputs登録、表紙一覧、一枚PDFと30ページPDFの表示、ユビキタス検索で1冊、技術フォルダ作成・右クリック分類・フォルダ絞込1冊、終了/再起動後の登録/分類保持を確認。最終版を開いた状態で納品。UI作成した技術フォルダにはユビキタス図解1冊を分類。ドラッグ動作とPPTX描画の手動検証は未実施。
- Result：原本・iOS・AWSを変更せずMacローカルで整理/閲覧可能。同期/タグ/一般PDF単体取込/自動監視/配布公証は未実装。ハッシュ再照合はせず、metadataと宣言ファイル存在を確認する。詳細はmac-app/README.md。
- 文書検証：git diff --check合格。node scripts/verify.cjs docsは150文書中、既存sessions/2026-10-12-offline-copies.mdの旧Presentation-Viewerパス1件で失敗。今回追加のリンク欠落なし。既存履歴は変更しない。最終画面証跡はmac-app/.build/validation/bookshelf.png。

追加依頼：/Applications/Zukan Bookshelf.appへ配置。既存同名アプリなしを確認しdittoでコピー、署名検証合格。開発フォルダ版を終了後、配置先を実起動し65冊・保存場所・技術フォルダの保持を確認。

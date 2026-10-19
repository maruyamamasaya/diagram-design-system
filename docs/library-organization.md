> 2026-10-19：操作上は「まとめ」をフォルダへ統合。旧collectionsは所属・順番の互換データとして保持する。[最新仕様](unified-library-folders.md)。以下の「相互変換しない」は統合前の設計記録。

# 整理機能の共通データ仕様 v1

2026-10-17。実装の正本は `packages/LibraryOrganization`。Foundationのみ、macOS 14/iOS 17以上。同期・通信・アカウント管理は含まない。

## 意味と識別

資料IDは版に依存しない所属キー。版はまとめのオフライン用スナップショットに残す。タイトルやパスでは資料を同一視しない。既存IDの文字列・大文字小文字を移行時に書き換えない。将来ローカル/クラウドを照合する際は出所とIDの対応を確認する。非UUIDのMac資料も保持する。

フォルダは置き場所（資料につき最大1個）、タグは横断分類、まとめは読む順番。相互変換しない。フォルダはUUID/name/parentID/任意iconFile、folderOrderは任意のUUID列。初期は階層パス順、手動変更後は指定順で未登録フォルダを後ろへ追加。解除は子孫フォルダの分類だけ外し、資料原本を変更しない。未整理は所属なしで、実体フォルダや並べ替え対象ではない。

分類はgroup（既存互換の仕事/私用/その他）と順序付きtags。編集時は前後空白・空文字・大文字小文字だけ異なる重複を除去する。読込/移行では既存の表記をそのまま保持。

まとめはUUID/title/membersの順序付き配列。ReadingCollection<Member>のMemberは各アダプターが所有するCodable/Equatable/Sendableのスナップショット。iOSは既存CloudDiagramをそのまま使用し、資料ID・版・タイトル・形式・ページ数・タグ・typeを保持。件数・タイトル制限・重複ID検査は共通のvalidateStructureで行い、iOSは従来どおり大文字小文字を同一視するIDを渡す。PNG/PDF対応・資料内容の検証・非表示の除外・最新版の解決は既存iOSアダプターが担当する。共通層が閲覧仕様を拡張するものではない。

## 共通状態と端末固有状態

OrganizationStateはschemaVersion=1、folders、任意folderOrder、assignments、classifications、collectionsを持つ。未知版・破損JSONは例外で返し、空の成功結果として扱わない。アカウントの保存領域は呼出側が分離する。Macの実パス/bookmark、iOSの認証/キャッシュ/保存コピー、端末内非表示は含めない。iconFileは既存ローカル画像の参照名であり、画像本体の共有・同期は未実装。

## 既存データの引継ぎ

今回、稼働中の保存ファイルを新しい1ファイルへ書き換えない。MacのLibrarySettings/sources/schemaVersion=1を維持し、フォルダ型・並べ替え・移動・子孫/解除処理を共通層に委譲。iOSのclassifications.json/collections.jsonは共有型のtypealiasから従来のJSONを読書きする。既存利用者別保存・保護属性・原子的保存を維持する。まとめの順番/UUID/スナップショットを変更しない。

将来の状態統合向けimporting(macSettings:classifications:collections:)は渡された旧JSONを読み、OrganizationStateを返す純粋変換。出所ファイルの書換え・自動端末間マージをしない。同一利用者/出所の確認とバックアップ後に呼出側が保存する。再実行で既存状態へ追記しないため同じ入力の重複は生じない。既存の不正参照や循環を自動修復せず、現状互換で保持する。新規入力の包括的な整合性検査、同期時の衝突解決/削除記録は次段階。

## 導入

Mac SwiftPMは ../packages/LibraryOrganization、iOS Xcodeは ../diagram-design-system/packages/LibraryOrganization を参照する。両リポジトリを同じ親ディレクトリに配置する。コードのコピーを増やさず、現段階はローカルパッケージ参照。独立配布/CIには将来バージョン固定したGitパッケージ化が必要。

テスト: `CLANG_MODULE_CACHE_PATH="$PWD/mac-app/.build/clang-cache" swift test --disable-sandbox --package-path packages/LibraryOrganization --cache-path "$PWD/mac-app/.build/cache"`。既存両アプリのテストも実施する。共通化後、iOSにはフォルダ/複数選択UIを追加済み（zukan/docs/library-folders.md）。Macのタグ/まとめUIと互換保存は[Mac本棚](../mac-app/README.md#グループタグと図解のまとめ)を参照。同期は未実装。

# iOSカードを正方形に統一

本人依頼：カード型を正方形の同サイズにし、タイトルは最大2行・収まらない分は省略。

元zukanのDocumentTile.swiftにSquareLibraryCardを置き、クラウドのCloudCoverとローカルのDocumentTileで共用。まとめもCloudCover経由で同じ枠。カード全体を1:1とし、画像は余白内にscaledToFit、タイトルは2行分を常に予約して末尾省略、補足は1行。サムネイルの元画像や資料タイトルそのものは変更しない。画面幅に合わせて列幅を調整し、同一グリッド内のカードを統一する。

72 XCTest失敗0、署名付き実機build/codesign成功。iPhone/iPad Simulatorの横向き画面で正方形外枠・2行タイトルを目視。ログ/画像はoutputs/ios-square-card-*とoutputs/square-card-*。Vespera更新/起動成功。Miraへも同じ既存bundleを更新。AWS変更なし。先行の左本棚・素材テーマ・ゴミ箱・閲覧改修を保持。

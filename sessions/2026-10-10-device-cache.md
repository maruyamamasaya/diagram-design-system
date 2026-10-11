# 端末キャッシュ優先

- Request：同じ端末のキャッシュを優先し、新しい版だけ取得する実装。
- Investigation：別repo Presentation-Viewerのオンラインopen/thumbnailは毎回ダウンロードしていた。一時成果物はSHA256付き名称で保存済み。既存APIのID/版/ハッシュを利用できる。
- Changes：同repoで永続保存→検証済み一時キャッシュ→取得の順へ変更。版別詳細キャッシュと並行詳細要求の共有、アクティブ復帰の一覧更新を追加。保存済み旧版・利用者別領域を維持。AWS/API操作なし。
- Files Changed：Presentation-ViewerのCloudFiles.swift、CloudLibraryStore.swift、CloudLibraryView.swift、CloudLibraryTests.swift、仕様/検証/CURRENT/README。既存未コミット変更は維持。
- Validation：iOS26.5 Simulatorのbuild・XCTest37件失敗0。構造検査・diffチェック合格。再生成したstoreで同版の追加通信0、新版の追加取得、破損/キャッシュ削除の再取得、永続保存/オフライン/領域分離をモックで確認。
- Result：実装完了。仕様・証跡は../Presentation-Viewer/docs/cloud-library.mdとcache-validation.md（別repo）。
- Remaining Issues：実S3通信回数と実機速度・操作未検証、端末インストール未実施。容量上限/LRU・一覧永続化は対象外。

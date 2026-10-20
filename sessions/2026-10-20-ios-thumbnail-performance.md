# iPhone/iPadの資料一覧表紙の軽量化

## Request / Investigation

表紙縮小・背景処理・メモリキャッシュを依頼。対象は隣接zukanのCloudLibraryStore/CloudLibraryView。MainActorの原寸画像読込・PDF描画と再表示時の再処理を確認。

## Changes / Files Changed

zukanでImageIO長辺640px縮小、専用actorでの直列生成、ストア別NSCache、削除時失効とキャンセル後の反映防止を実装。閲覧用ページ一覧も縮小処理を共有。原本・API・AWSは変更なし。このrepoはCURRENTと本記録のみ更新。

## Validation

iPhone 17 Pro/iPad Pro M5（iOS 26.5 Simulator）で各77 XCTest全件合格。詳細は隣接zukan/sessions/2026-10-20-library-thumbnails.md。npm run verify -- docs（247文書・欠落0）と両repoのdiff検査合格。初回署名なし試験はKeychain試験で認証エラー、Simulatorローカル署名で再検証。旧構造検査は既存共有パッケージを拒否する条件で失敗し、変更していない。

## Result / Remaining Issues

本人の追加依頼で2026-10-20 01:11 JSTまでにMira/Vesperaへ既存Team/Bundle IDのRelease署名版を上書きインストール・起動成功。codesign検証合格。実機スクロール比較は未実施。通信量と一覧計算の最適化は今回の対象外。

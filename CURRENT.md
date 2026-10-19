# 現在地

更新日：2026-10-19。依頼の分岐は[作業経路](docs/work-routes.md)、実装の責務は[構成](ARCHITECTURE.md)、所在は[CODEMAP](CODEMAP.md)。過去のPhase文書はその時点の検証証跡であり、現在の未実装一覧として読まない。

## 資料制作

- 原資料の意味理解・調査・構成はAIが担当する。CLIの自動自然言語解析は未実装。
- 通常プレゼンは登録6種のv2が標準。v1明示指定は保持。SVG共通配置からPNG/PDF/編集可能PPTXを生成し、一括制作の標準納品では内部SVGを削除する。[生成契約](docs/presentation-engine.md)、[一括制作](docs/phase12-workflow.md)。
- グラフィック版は資料専用の意味入力契約・固定レイアウト登録・サンプル検証を含む制作運用。任意の関係図や画像を標準エンジンが自動処理する機能ではない。[運用](docs/presentation-graphic-mode.md)、[レイアウト選択](docs/presentation-layout-policy.md)。
- 独立一枚図はsvg/hybrid/imageで制作しPNG/PDFを納品。PPTXは対象外。[制作仕様](docs/illustration-workflow.md)。旧定型単一図解CLIは直列RoadmapのSVG/PNGのみ。
- 登録プレゼンの差分計画・部分再生成・旧ページ再利用に対応。専用グラフィックパッケージの自動差分更新は保証しない。[差分更新](docs/phase10b-partial-update.md)。
- 通常表の列幅は従来等幅を保持し、説明・例・条件の役割に応じた固定プロファイルを追加。[v2配置](docs/presentation-layout-v2.md)。認定範囲はサンプルと[今回の検証記録](sessions/2026-10-19-document-routes-layout-update.md)に限定する。

## 保存・閲覧・アプリ

- 非公開S3とCognito OIDC認証付き公開APIは配備済み。本人のログイン・実資料の取得実績あり。[公開API](docs/phase11b2-deployment.md)、[本人確認](docs/phase11b3-validation.md)。ローカルNext.js viewerは別の検証・閲覧経路として維持する。
- 通常のMac/iOS本棚はS3正本。Macはこのrepoのmac-app、iPhone/iPadは隣接zukan。端末の閲覧キャッシュと制作原本を区別する。[S3専用本棚](docs/s3-only-bookshelf.md)。
- フォルダ・タグ・読む順番の共通層、認証付き整理同期は実装・本番接続済み。フォルダ統合はローカル実装済みで、全端末の配布・実同期確認は完了していない。iPadの全資料一覧/種類別親フォルダはMiraへ更新済み、本人手操作は未確認。[整理同期](docs/organization-sync-live-clients.md)、[フォルダ統合](docs/unified-library-folders.md)。
- 共通ゴミ箱は本番有効。合成資料の移動/復元/全削除と既存catalog保持を検証済み。本人の実資料操作は別確認。[配備証跡](docs/shared-trash-deployment.md)。
- Macの読込・キャッシュ保持を改善。表紙が本文30版枠を消費する修正はローカル検証済み、Applications反映・修正後速度比較は未実施。[最新記録](sessions/2026-10-19-mac-preview-cache-quota.md)。
- 全版S3容量取得は本番適用済み。今月請求の配賦表示は無効flagで配備済み、CEタグ反映待ちで有料金額照会は未実施。[容量](docs/s3-storage-capacity.md)、[請求](docs/monthly-billing.md)。

## 制約・今後の扱い

標準登録エンジンの図解は直列Roadmap。Architecture・分岐Flowchartなどは専用登録制作で対応し、標準描画対応と混同しない。PPTXは書体非埋込み、接続線は独立線分。実PowerPoint・別端末・投影の確認範囲は資料ごとの証跡に従う。大規模資料の自動解析・Git自動解析は保留。AWS変更は料金試算と本人の明示承認後、資料送信も別承認。

過去の実装・配布経緯は[sessions](sessions/README.md)と[整理前スナップショット](sessions/2026-10-19-current-before-reorganization.md)に保持する。ここへ作業履歴を追記せず、現行状態を更新する。

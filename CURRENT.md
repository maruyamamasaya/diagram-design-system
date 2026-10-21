2026-10-20：月内AWS費用は3回目の確認でProject値がCEへ反映。Active最終確認・承認済みtemplate/policy照合後、2フラグ有効化はUPDATE_COMPLETE。ただしLambda実コードSHAが承認候補と不一致でverify-enabled失敗。初回費用照会/iPad更新を行わず自動化を停止。[記録](sessions/2026-10-19-monthly-billing-deployment.md)。

# 現在地

更新日：2026-10-20。依頼の分岐は[作業経路](docs/work-routes.md)、実装の責務は[構成](ARCHITECTURE.md)、所在は[CODEMAP](CODEMAP.md)。過去のPhase文書はその時点の検証証跡であり、現在の未実装一覧として読まない。

## 資料制作

- 人物・もの・PC・サーバー等の汎用線画とAWS/Azure公式の[共通アイコン集](assets/icons/README.md)を保持。制作時に用途で選択して素材台帳へ引き継ぐ。既存レンダラーへの自動配置は追加しない。

- 原資料の意味理解・調査・構成はAIが担当する。CLIの自動自然言語解析は未実装。
- 通常プレゼンは登録6種のv2が標準。v1明示指定は保持。SVG共通配置からPNG/PDF/編集可能PPTXを生成し、一括制作の標準納品では内部SVGを削除する。[生成契約](docs/presentation-engine.md)、[一括制作](docs/phase12-workflow.md)。
- グラフィック版は共通描画器の6種（構成・手順・原因分岐・比較・大きい図版・図版比較）へ対応。PNG/JPEGの既存/生成素材を台帳付きで埋込み、PNG/PDF/編集可能PPTXを出力。未対応の構成は専用固定登録を使用する。[共通描画器](docs/graphic-renderer.md)。[運用](docs/presentation-graphic-mode.md)、[レイアウト選択](docs/presentation-layout-policy.md)。
- 独立一枚図はsvg/hybrid/imageで制作しPNG/PDFを納品。PPTXは対象外。[制作仕様](docs/illustration-workflow.md)。旧定型単一図解CLIは直列RoadmapのSVG/PNGのみ。
- 登録プレゼンの差分計画・部分再生成・旧ページ再利用に対応。画像付き共通グラフィックと専用パッケージの部分再生成は未対応で、新版全体生成を使う。[差分更新](docs/phase10b-partial-update.md)。
- 通常表の列幅は従来等幅を保持し、説明・例・条件の役割に応じた固定プロファイルを追加。[v2配置](docs/presentation-layout-v2.md)。認定範囲はサンプルと[今回の検証記録](sessions/2026-10-19-document-routes-layout-update.md)に限定する。

## 保存・閲覧・アプリ

- 非公開S3とCognito OIDC認証付き公開APIは配備済み。本人のログイン・実資料の取得実績あり。[公開API](docs/phase11b2-deployment.md)、[本人確認](docs/phase11b3-validation.md)。ローカルNext.js viewerは別の検証・閲覧経路として維持する。
- 通常のMac/iOS本棚はS3正本。Macはこのrepoのmac-app、iPhone/iPadは隣接zukan。端末の閲覧キャッシュと制作原本を区別する。[S3専用本棚](docs/s3-only-bookshelf.md)。
- フォルダ・タグ・読む順番の共通層、認証付き整理同期は実装・本番接続済み。フォルダ統合と種類の親/分類先の区別を修正してMac/Mira/Vesperaへ配布。作成/移動/未整理の回帰を確認し、本番の全整理情報の双方向一致は未確認。iPadの全資料一覧/種類別親フォルダはMiraへ更新済み、本人手操作は未確認。[整理同期](docs/organization-sync-live-clients.md)、[フォルダ統合](docs/unified-library-folders.md)。
- 共通ゴミ箱は本番有効。合成資料の移動/復元/全削除と既存catalog保持を検証済み。本人の実資料操作は別確認。[配備証跡](docs/shared-trash-deployment.md)。
- iPhone/iPadの一覧表紙を長辺640pxへ縮小し、専用actorで生成・ストア別メモリ再利用するローカル改修を実施。Mira/VesperaへRelease署名版を更新・起動済み。実機速度比較は未実施。[記録](sessions/2026-10-20-ios-thumbnail-performance.md)。
- 資料取得障害を本番修復。保存/読取の検証器共有・公開前fingerprint一致・不正な1版の隔離を追加。両アプリの閲覧キャッシュは10GB。Mac再起動後のPDF再利用、Mira/Vesperaの実取得・PDF描画・通信なし再表示を確認。[仕様・配布と検証](docs/library-fetch-repair.md)。
- 全版S3容量取得は本番適用済み。今月請求の配賦表示は無効flagで配備済み、CEタグ反映待ちで有料金額照会は未実施。[容量](docs/s3-storage-capacity.md)、[請求](docs/monthly-billing.md)。

## 制約・今後の扱い

標準登録エンジンの図解は直列Roadmap。グラフィック共通描画器は固定の直列構成・2分岐等に対応するが、任意のArchitecture/Flowchartを自動配置する機能ではない。PPTXは書体非埋込み、接続線は独立線分。実PowerPoint・別端末・投影の確認範囲は資料ごとの証跡に従う。大規模資料の自動解析・Git自動解析は保留。AWS変更は料金試算と本人の明示承認後、資料送信も別承認。

過去の実装・配布経緯は[sessions](sessions/README.md)と[整理前スナップショット](sessions/2026-10-19-current-before-reorganization.md)に保持する。ここへ作業履歴を追記せず、現行状態を更新する。

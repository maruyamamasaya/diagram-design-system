# LibraryOrganization

Mac/iOS向け、Foundationのみの整理モデルと処理。仕様は[共通データ仕様](../../docs/library-organization.md)。

- OrganizationFolder：UUID・階層・アイコン参照
- LibraryClassification / LibraryGroup：分類・タグ正規化
- ReadingCollection：順序付きのアダプター所有スナップショットと構造検証
- OrganizationState：フォルダ順序・一括分類・解除・既存JSONの純粋な取込

既存アプリは各保存形式を維持する互換アダプターを使う。ネットワーク・同期・UI・認証・画像本体は含まない。

ローカル同期検証用のOrganizationSyncClient/LocalOrganizationSyncServer、初回ImportPlanとloopback HTTPハーネスを追加。アプリの自動同期・本番認証は未接続。[同期仕様・実行](../../docs/organization-sync-local.md)。

`LibraryOrganization`はFoundationのコア、`LibraryOrganizationUI`は独立したSwiftUIの検証画面/チェックポイントセッション。Mac/iOSで検証コピーだけを同期する。[画面と運用](../../docs/organization-sync-ui.md)。

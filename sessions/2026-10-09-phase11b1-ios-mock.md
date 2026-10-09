# Phase 11B-1：既存iOS図解ライブラリ

- Request：Presentation-ViewerをモックAPIで拡張。生成システムとは分離。
- Investigation：既存SwiftUI・保存・各表示コンポーネントと最新共通APIを照合。API詳細はContent-Typeを持たず、取得grantはミリ秒ISO期限を持つため対応した。
- Changes：iOS側にCloudLibrary API/model/store/UI、永続保存actor、モック資源とテスト。生成側はCURRENTと現在地記録のみ。
- Validation：Mac Simulator build、既存13＋新規6＝19 XCTest合格。iOS 17.4で一覧・PDF保存／表示・PNG・PPTXを確認。
- Result：モック統合と保存機能を実装。本番API／AWS変更なし。
- Remaining Issues：PPTX Quick Look折り返し差、SVG UI、実機オフライン、公開OIDC／Keychain／実HTTPS。[現在地](../docs/phase11b1-status.md)。

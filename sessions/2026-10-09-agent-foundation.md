# AI開発基盤と探索導線の整備

## Request
基本の現在地・構成・探索・検証・運用文書を整備し、整合確認後に階層AGENTS、検索優先、Fast/Full検証を追加する。追加条件は同じ資料から資料作成・システム改修・文書更新を判別して範囲を制御すること。

## Investigation
ルートとviewerのpackage、CLI・生成・保存・プレゼン・API/auth/store、スキーマ・登録表・テスト・運用証跡を検索で照合。DB/ORMとCI/CD workflowはない。既存文書は責務別に存在するが、横断的な現在地と探索入口がなかった。調査中に別作業のPhase 6コード・テスト・登録状態が更新され、設計時点の未実装説明と差分が生じていた。

## Changes
入力資料と作業指示を分けて依頼を3種類に判別。共通入口から必要な領域だけ読み、検索・定義・参照・設定・データ・テストへ進む。viewerは独立スタック/テスト、uploadは外部書込契約、presentationは独立描画/保存契約のため子AGENTSを設置。既存Phase 4/5規則は移動し、共通承認・品質要件を維持。CURRENTは状態、sessionsは履歴、数値・仕様は既存正本に分離。

## Files Changed
新規：CURRENT、ARCHITECTURE、CODEMAP、TESTING、OPERATIONS、decisions/READMEと0001、sessions/READMEと本記録、viewer/AGENTS、src/upload/AGENTS、src/presentation/AGENTS、scripts/check-docs.cjs、scripts/verify.cjs。
更新：ルートAGENTS、README、package.json（verifyのみ）、docs/presentation-design、prompts/presentation（固定された古い状態説明を現況照合へ）。他の既存差分と並行作業はこの工程の成果に含めない。

## Validation
入口文書14件のリンク先存在とgit diff --checkは合格。最初のFull実行はルート18件中16合格・2失敗で停止（プレゼンrealpath EPERM、表見出し境界）。独立viewer API5件と型検査は合格。制限内viewer buildはWindows canonicalizeのアクセス拒否で失敗。

許可された制限外Full再実行はルート18/18、viewer API5/5、typecheck、buildが全て合格。並行描画コードの更新があったため、初回の文字境界失敗まで権限制限だけが原因と断定しない。この整備では描画コードを修正していない。8スライド・全6種、表分割、ハッシュ・版衝突の試験を含むが、目視・実AWS・viewerブラウザーE2Eは今回未実施。

## Result
標準`npm run verify`はFull（文書導線、diff check、ルートtest、viewer test/typecheck/build）。`-- fast`はbuildを省略、`-- docs`は文書導線とdiffのみ。依存追加なし、実AWS/E2E/目視は分離。Semantic Searchが利用可能なら概念検索に使用し、正確なsymbol判明後はexact/referencesへ切替。この環境ではCODEMAPとrgが基本。

## Remaining Issues
描画登録表の証跡リンク先docs/phase6-validation.mdは最終照合時に未存在。並行工程の完了後に証跡を照合する必要がある。自動リンク検査は入口文書中心でアンカーと内容の意味までは確認しない。巨大コード索引、semanticサービス、CI導入は行っていない。将来必要なら導線の鮮度検査とCIでの既存verify実行を追加する。秘密値・実AWS操作・別アプリ変更はこの整備で実施していない。

推奨フロー：依頼判別 → root AGENTS/CURRENT → 必要なCODEMAP/設計 → 概念/コード検索 → 対象/子AGENTS → 呼出元・依存・設定・テスト → 変更 → 関連Fast/Full → 条件に応じた文書更新 → session。

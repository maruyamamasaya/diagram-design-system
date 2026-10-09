# プレゼン構成設計プロンプト

入力：原資料、対象読者、目的、必須項目、希望ページ数/形式。

AGENTS.md、共通rules、rules/presentation.md、docs/presentation-design.md、config/slide-templates.jsonを読む。原資料を読み、未読範囲・不明点・仮定を記録する。必須入力→slideIdの対応を作り、主張順を設計する。6登録テンプレートから目的で選び、選んだtemplates/slides/だけを読む。未登録配置は禁止。内容過多は意味単位で分割し条件を残す。

schemas/presentation.schema.jsonに適合するsource.jsonを作り、src/presentation/validate.cjsで構造・意味を検査する。図解は型・参照ID・版・相対パス・ハッシュを固定し対応能力を確認する。notesへ重要な表示情報を隠さない。選択理由・入力対応・未実装/未検証を記録する。

登録テンプレートの実装・認定状況はCURRENT.md、登録表、最新検証記録とコードで確認する。設計段階・実装済み・検証済みを区別し、未実装形式や未検証品質の成功を捏造しない。JSON例はexamples/linux-presentation/source.json。対応する描画経路で全ページの実測・再レンダリング・形式検査と目視確認後に成果物を提示する。S3保存は対応能力と別承認を確認する。

## Phase 6 Creation Modeの実行
上のPhase 5未実装説明は当時の記録。現在はdocs/presentation-engine.mdに沿い、対応6種・直列Roadmapの構成をJSONへ保存する。AIが読取範囲と重要入力→slideId/sourceReferencesの対応を確認する。追加追跡情報はschemaVersion=1.1、slideVersionとsourceReferences(sourceId/sourceVersion/locator)を使う。原資料を--sourceで渡すとsourceVersionは実バイト列SHA256と照合される。既存1.0を無断書換えしない。

generate:presentationでSVG/PNG/サムネイル/JSONを作り、全ページを実表示で確認する。自動のcontentAccuracy/visualReviewはnot_reviewedのままなので別途AI/人間のreview記録を残す。オーバーフローで停止した単一項目は意味を保持してページへ分割し構成JSONの改訂版を生成する。未対応図解型やPDF/PPTXを成功と報告しない。AWS操作やWeb公開を生成と同時に実施しない。

## Phase 7の標準
新規JSONでは登録v2（slide.<type>.v2）を使用する。旧資料の明示v1を移行しない。標準CLIはSVG/PNG/PDF/PPTXを出力する。全ページの形式別検証・目視を行う。必要な実行環境がなければSVG/PNGを保持し、PDF/PPTXの未生成・未検証を明示する。

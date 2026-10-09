# Phase 7.5：実資料生成・実用性評価

2026-10-09 JST。Creation Modeで3資料26枚の生成・Level 1/2評価を完了。登録v2、モノクロ16:9、SVG/PNG/PDF/PPTXを使用。共通実装はCreation工程で変更していない。構成図・分岐Flowchartは未登録なので表・直列Roadmapで代替し、その図解能力の評価は未完了として残す。

## 成果物

Git管理外のリポジトリ相対パス。各版にdocument.pdf、presentation.pptx、各スライドのSVG/PNG・サムネイル、source・metadata・validation・export-validation・reviewを保存。

|資料|枚数|保存先|
|---|---:|---|
|RAG技術解説|8|outputs/phase75-rag/b290c3e5-9e2f-4abc-9193-d937859e9af6/versions/000001/|
|AWSセキュリティアーキテクチャ|10|outputs/phase75-aws-security/38921949-961b-4b66-b649-e9164f4bfedd/versions/000001/|
|Kubernetes運用と障害調査|8|outputs/phase75-kubernetes/e2b6aca1-39e2-468e-a532-d3dcf2c6c16a/versions/000001/|

原資料は公式資料を参照してAIが作成した解説用ダイジェスト。外部資料をそのまま読み込んだものではない。入力はoutputs/phase75-inputs配下、版内sourceにも内容・構成・設計対応を同梱。slideId、原資料アンカー、参照ハッシュ、図依存、版を保持。各節・PPTXノートに公式出典URLを記録し、仮想設計例・運用提案を区別した。実環境・対象バージョンは特定していない。

主な出典：[AWS RAG](https://docs.aws.amazon.com/prescriptive-guidance/latest/retrieval-augmented-generation-options/what-is-rag.html)、[Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-how-it-works.html)、[AWS責任共有](https://aws.amazon.com/compliance/shared-responsibility-model/)、[IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)、[VPC](https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html)、[Kubernetes構成](https://kubernetes.io/docs/concepts/overview/components/)、[Pod調査](https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/)。全出典は各原資料を参照。

## 検証・簡易評価

3資料とも生成成功・指定枚数一致。PDF全ページをPopplerで描画し、PDF/PPTX表示文字照合の欠落0。ネイティブPPTX形式検査に合格し、PowerPoint 16.112.4でそれぞれ開いて全スライド一覧を確認した。PDF/PNG一覧で重大な文字欠け・重なり・過密なし。原本PDF/PPTXの確認前後SHA256一致。各reviewにstandard-checks.json、pdf/source-overview.png、powerpoint-overview.png、ai-review.jsonを保存。自動validationとAIの内容・目視確認は別記録。

|資料|評価|
|---|---|
|RAG|概念から構成・工程・評価・安全・運用へ自然に進む。取り込み/検索の直列図と検索/回答品質の比較が有効。情報量・文字階層は適切。構成表は接続の直感性が弱いが、PDF/PPTXは解説に利用可能。|
|AWS|責任・権限・境界・通信・監査・暗号化の順序は適切。SG/NACLとCloudTrail/CloudWatchの比較が有効。情報量と可読性は適切だが表・行の繰り返しが多い。仮想構成例の境界図は不足。PDF/PPTXは入門説明に利用可能。|
|Kubernetes|基本構造から監視・調査・コマンドへ進む。コマンドを省略せず可読、対象名が例であることを明記。前半の表はやや単調。調査順序図は入口として有用だが原因別分岐は未対応。PDF/PPTXは初動調査の説明に利用可能。|

関連回帰は[Phase 7](phase7-validation.md)でルート24/24・変換3/3合格。その後に共通コードを変更せず、重複実行しない。代表文字・表・図形の実編集証跡もPhase 7を再利用。今回の3資料の全要素編集、編集後保存・再読込、詳細な全ページ画像比較、別端末・投影は未検証。PPTX書体非埋込みによる字面差が残る。実AWSやクラスタでの動作・コマンド実行は行っていない。

## 改善フィードバック

|資料・スライド|問題|分類|改善案|優先度|
|---|---|---|---|---|
|RAG2、AWS3/8、Kubernetes1/3|構成・境界・接続を表で代替|共通の登録描画能力|別Development課題でArchitectureを登録し、関係保持と既存回帰を確認|高|
|Kubernetes6|原因別の分岐判断を直列図で表せない|共通の登録描画能力|別Development課題でFlowchartを登録。現資料は推奨順序に用途限定|高|
|AWS5|長い行見出しが折り返される|資料固有|次版で見出しを短くし、本文の意味を維持|低|
|AWS全体、Kubernetes1〜3|表・行配置が続く|共通テンプレートの範囲|構成図追加後に用途で使い分け、不要なカードを増やさない|中|
|全PPTX|非埋込み書体による端末間字面差|共通出力制約|書体を案内し、不具合報告時に対象環境で重点確認|中|

重大な資料固有不具合はなく追加修正を反復していない。生成・簡易評価は完了、未対応図解の評価は共通改善として残す。次はPhase 8（大規模資料解析・階層的要約）、9（Git解析）、10（差分更新・部分再生成）、11（S3・Web・iOS拡張）。ID・参照・ハッシュ・不変版を維持する。S3・viewer変更、AWS操作・アップロードなし。

ユーザー指定による後処理：3資料の生成SVG26個を削除済み。PDF/PPTX/PNGはハッシュ不変。SVG生成と目視の過去記録は保持し、現在SVGを納品可能とは扱わない。各版local-retention.jsonを参照。

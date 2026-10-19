# 成果物パッケージと保存

## 所有範囲と互換性
本書はパッケージ・状態・再生成・完成判定の所有元。ファイル名と形式別条件は[export.md](export.md)、検査方法は[quality.md](quality.md)、既存S3 CLIと安全設定は[保存仕様](../docs/s3-storage.md)を参照する。

現行Phase 2はinput.json・SVG・PNG・validation.json、Phase 3は[metadata 1.0](../schemas/metadata.schema.json)と固定許可リストを使用する。この経路を維持し、既存データを改名・書換えしない。現行のcatalog完了は旧4ファイルの保存完了を意味し、全形式・目視確認完了を意味しない。

[metadata-package 2.0](../schemas/metadata-package.schema.json)は将来実装用の設計スキーマ。現行upload CLIへ渡さない。ローカルパッケージはoutputs/<diagramId>/versions/<6桁版>/を標準とし、1.0の生成フォルダーも引き続き利用できる。新経路では生成開始前にUUID v4と版を固定する。版は1から始め、修正時は同じIDの次の版、createdAtを継承する。

## メタデータと状態
2.0は保存先なしでもローカル作成できる。標準成果物の全項目とvalidation.jsonをartifactsに記録する。新形式対応時はexport.mdの表とスキーマの必須一覧を更新し、対象集合へ自動的に含める設計とする。targetNamesは当該実行の対象集合のスナップショット。明示指定があってもsource.json・metadata.json・validation.jsonはパッケージ管理用の必須対象とする。

各項目のsupportはsupported / unsupported、statusはpending / generated / verified / failed / unsupported / not_requested。generatedは出力成功・検証未完了、verifiedは必要検査が全て合格した状態。未検証・不合格をverifiedにしない。対象外・未対応・失敗にはreasonを記録する。成功した実ファイルにはsizeBytesと実バイト列のsha256を記録し、欠落・失敗・対象外には架空のサイズやハッシュを付けない。失敗した中間ファイルは診断用に隔離し、成果物一覧と送信対象から除外する。

metadata.json自身は自己参照ハッシュを持たずintegrity=externalとする。その確定バイト列のサイズ・SHA256はローカルpackage-integrity.jsonまたはS3取得証跡に記録する。この補助ファイルは自身をハッシュ対象にせず、標準送信対象にも含めない。ほかのファイルはintegrity=sha256。認証情報・署名付きURLはメタデータに保存しない。

packageStatusはincomplete / complete。全targetNamesがverifiedのときだけcompleteにする。標準選択では未対応を対象集合から除くが一覧には残す。明示指定の未対応形式は対象集合に残り、incompleteとなる。completeでもunsupportedが残る場合は「対応済み対象の完成」と報告し、全形式対応済みと報告しない。JSON Schemaだけでは一覧の一意性・対象集合との一致・ハッシュ実測・状態集約を保証できないため、実装時に意味検査を必須とする。

## 不足分の検知と再生成（設計、CLI未実装）
1. targetNames、ファイルの存在、サイズ・SHA256、検証記録、入力・ルール・フォント・レンダラーの依存ハッシュを照合する。依存はdependencySha256として各項目に記録する。
2. 対象のpending / failed / 欠落・不一致、generatedの検証待ちを抽出する。unsupportedは対応後まで再試行せず、not_requestedも生成しない。
3. 入力と依存が不変なら不足ファイルだけ一時ファイルへ再生成し、検証後に置き換える。既存verifiedファイルは保持する。検証待ちはまず検証し、検証失敗時に再生成する。
4. sourceや依存が変わった場合は同じ版を修復せず新しい版とし、影響する派生形式を生成・再検証する。メタデータと状態集約を更新する。

ローカル作業中のメタデータは更新できる。S3保存計画の確定後はメタデータ・バイト列を固定し、同じID・版への異なる内容は拒否する。保存後に成果物を追加する場合も新しい版を使う。

## S3保存（2.0は未実装）
承認済み保存先と資料送信の許可は別々に確認する。専用ロール、非公開、公開アクセスブロック、SSE-S3、TLS、最小権限・短期認証を維持する。詳細な安全設定・上限・費用は既存保存仕様と[コスト方針](../docs/cost-policy.md)を参照し、AWS設定や予算を自動変更しない。

キーは既存の<prefix>/diagrams/<diagramId>/versions/<6桁版>/<成果物名>を継承する。送信はexport.mdの許可リストと検証済みファイルの積集合のみとし、任意の追加ファイルを走査して送らない。metadataはスキーマ・意味検査後に送信する。全PUTは条件付き、直後のGETでサイズ・SHA256・Content-Type・暗号化を照合する。

未完成はローカルに保持し、途中で保存された検証済みオブジェクトはdiagrams配下のみで管理する。incompleteのmetadataはcatalogへ掲載しない。全対象のGET検証とcompleteの不変metadata保存後、最後に同じmetadataをcatalogへ保存し完成を公開する。生成状態とリモート保存状態は別に管理し、通信失敗を生成失敗と混同しない。失敗時はローカルを残し、同一内容の保存再開だけを許す。残骸・旧版の削除は別承認。

## 実装移行条件
1.0の読取・作成・既存CLIとAPIを維持する。2.0は明示的な別経路として実装し、source.jsonとinput.jsonの対応、対象決定、状態集約、部分生成再開、2.0許可リスト、ビューアーのスキーマ分岐を検証してから有効化する。既存例・既存catalogを2.0完了へ自動昇格しない。衝突・通信失敗・再実行・安全設定のモックとPhase 2実レンダリングを回帰確認する。

## Agent Creation Modeのローカル運用
共通設計をsource.jsonへ記録する。既存Roadmapスキーマへの適合は不要だが、使用する型・必須項目・意味検査をvalidation.jsonに記録する。原資料の複製または参照とハッシュ、描画ソース、生成・変換手順を併置して再生成可能にする。機密情報を含む原資料の送信を自動化しない。

2.0の自動オーケストレーションは未実装でも、エージェントがローカルでパッケージを作成し、スキーマと意味検査を実施できる。実施できない管理・検証は未実施と記録し、completeにしない。図解ID・版を固定し、形式別状態と実ファイルのサイズ・SHA256を記録する。

現行2.0スキーマのdiagramTypeは既存4タイプに限る。独自タイプを偽って登録しない。スキーマに適合できない構成はID・版フォルダーとvalidation.jsonにローカル管理記録を保持し、2.0 metadata未対応と明記する。スキーマ拡張は別の保守作業とする。

Phase 7.6ではpresentation-package-1.0に限り、upload CLIが専用の不変保存manifest経路へ分岐する。既存1.0経路を保持し、元metadata.jsonを変更しない。詳細は[保存仕様](../docs/s3-storage.md#phase-76プレゼン保存)を参照。一般の独自SVG・HTML・PDF・PPTXや2.0パッケージは引き続き現行CLIへ直接渡さない。ビューアーは旧metadataに加えpresentation-s3-1.0とillustration-s3-1.0の対応済みmanifestを正規化する。一般2.0や任意の独自契約を受理するものではない。適合しない成果物はローカルに保持し、S3保存・閲覧連携の未対応を報告する。許可リストの拡張や既存catalogの自動移行を生成作業に混ぜない。

illustration-package-1.0とillustration-s3-1.0は独立一枚図専用の対応済み経路。一般2.0とは別。[契約](../docs/illustration-workflow.md)。

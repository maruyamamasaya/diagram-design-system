# 生成音声資料：仕組みの図解改訂 v3

## 依頼と変更
歴史の挿絵を保持し、関連図・処理・仕組みを詳しくわかりやすくする。30枚構成を維持し、11〜19・22・28ページの11図を改訂。文章と声条件の合流、声質のみとICLの二段処理、参照長の比較条件、CustomVoice/Baseの入力経路、VoiceDesignからの参照再利用、学習の誤差帰還、学習・評価の分離、音声と文字の対応、Macの計算負荷を図示した。

## 制作と検証
プレゼン編集スキル、Agent Creation Mode・グラフィック版を継承。共通6構図では表せない合流・帰還をパッケージ専用固定登録にし、意味入力に座標を持たせていない。システム実装変更なし。Qwen公式README・技術報告3.1/3.3・追加学習手順を再確認。

標準Level 1＋2。図の実測境界・文字重なり・矢印と文字の交差0。未改訂19ページは旧PNGとSHA256完全一致。全30枚のPDFをPoppler、PPTXをArtifact Toolで再描画し、各一覧と変更図の代表詳細を目視。表示文字欠落0、PDF960×540pt・日本語自己完結、PPTXネイティブ表9・図形791・写真2。6回の具体的改善はproduction/improvements.md。

## 成果物
- 正本：outputs/b8e65cb0-4fba-4c9c-9ee4-60d62c85b8d3/versions/000003/
- 読みやすい納品名：outputs/speech-synthesis-history-v3/
- 再生成用作業原本：outputs/speech-history-v3-work/

## 保存・表示
従来の資料送信先を継承し、専用ローダーから既存の非公開S3保存処理へ接続。34オブジェクト・14,859,359 bytes。保管約0.06円/月の既存条件試算を提示。reader-contract照合、preflight、条件付きPUT、GETのSHA256照合、catalog最後掲載を経てcomplete。AWS構成・権限・保存承認フラグの変更なし。

Macの本棚でv3・30ページと新しい11・12ページを実表示確認。旧版を保持。iOS実機は今回未確認。

## 制約
PowerPoint本体での表示・編集は未検証。PPTXはNoto Sans JP/Mono非埋込みで、接続線はノード移動へ追従しない。音声生成・追加学習・SonicForge変更は行っていない。

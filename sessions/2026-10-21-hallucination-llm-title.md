# ハルシネーション資料 第9版・表紙のLLM表記

## Request / Changes
表紙の「ChatGPTで学ぶ」を「LLMで学ぶ」に変更。上部もLLM / AI LEARNINGへ統一。全36ページ、目次と本文35ページは第8版を維持。制作ルール・実装・AWSの変更なし。

## Validation
表紙の文言、意味入力、文字境界、再描画、旧ページ保持を確認。文字境界・重なり・曲線の文字干渉なし。PDF/PPTXを36ページ再描画し表紙を目視、残る35ページは第8版とピクセル一致。元PNGも35件のSHA256一致。36ページ・出典ノート36件・ネイティブ図形4335・ラスター0。内部SVGは当版の明示計画36件だけ整理し、完成版・入力・PNG・フォントをハッシュ照合。

## Output
outputs/hallucination-llm-title/deliverables、versions/000009。ローカル納品。PPTXのフォント非埋込みとPowerPoint実アプリでの編集操作未検証は従来どおり。

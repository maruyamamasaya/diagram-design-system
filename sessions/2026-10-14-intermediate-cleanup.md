# 不要な中間SVGの清掃

- Request：削減可能量を確認し、安全な不要中間ファイルはそのまま削除してよいとの本人指示。
- Investigation：outputsの通常ファイルは6,722,924,311 bytes。SVGは464個、5,472,799,825 bytes。編集元SVGと生成中間SVGを区別した。
- Changes：対応PNGが残るPhase 6/6.5/7テスト生成SVG149個と、原資料・scenes.json・描画スクリプト・納品PDF/PPTX/PNGの存在を確認したbuild/rendered配下SVG62個を削除。元のartwork SVG、原資料、スクリプト、素材、検証画像、各版と全非SVGは保持。
- Files Changed：outputs内の中間SVG211個、outputs/cleanup-record/2026-10-14-intermediate-cleanup.json、本記録。実装・AWS操作なし。
- Validation：削除前のサイズ・SHA256を記録。削除対象の消失と、保持ファイル3,755個すべてのSHA256一致を確認。再生成・再レンダリングは今回未実施。
- Result：2,825,183,263 bytes（約2.83 GB / 2.63 GiB）削減。清掃直後のoutputsは記録追加込み3,898,351,158 bytes（約3.90 GB / 3.63 GiB）。
- Remaining Issues：SVGを用いた直接再変換には再描画が必要。元metadataは生成時証跡として維持し、現存状態は清掃記録で補足。編集元か判断できないSVGは保持。

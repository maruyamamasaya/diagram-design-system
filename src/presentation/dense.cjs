"use strict";
const { validateInput } = require("../model.cjs");
async function drawDense({
  slide,
  t,
  c,
  text,
  measure,
  card,
  body,
  diagram,
  profile: p,
}) {
  const s = slide.content,
    m = t.margin,
    w = t.width - 2 * m;
  const line = (id, y, x = m, width = w) =>
    body.push(
      `<path id="${id}" d="M${x} ${y}h${width}" stroke="${c.line}" stroke-width="${t.stroke}" fill="none"/>`,
    );
  const height = (z) =>
    z.lines.length * Math.max(t.bodySize * t.lineHeight, z.glyphHeight);
  const snap = (n) => Math.ceil(n / t.grid) * t.grid;
  if (slide.slideType === "title") {
    await text("heading", s.heading, m, p.heroTop, w, p.heroSize, 2, true);
    if (s.subtitle)
      await text("subtitle", s.subtitle, m, p.subtitleTop, w, t.headingSize, 3);
    return;
  }
  await text("heading", s.heading, m, m, w, t.titleSize, 1, true);
  switch (slide.slideType) {
    case "bullet": {
      let y = p.bodyTop;
      for (let i = 0; i < s.items.length; i++) {
        const raw = s.items[i],
          at = raw.indexOf("："),
          label = at > 0 ? raw.slice(0, at) : null,
          detail = at > 0 ? raw.slice(at + 1) : raw;
        const x = label ? m + p.labelWidth : m,
          tw = label ? w - p.labelWidth : w;
        const z = await measure(detail, tw, t.bodySize);
        const labelMetrics = label
          ? await measure(label, p.labelWidth - t.gap, t.headingSize, true)
          : null;
        const rh = snap(
          Math.max(
            p.rowMinimum,
            height(z) + 2 * t.padding,
            labelMetrics
              ? labelMetrics.lines.length *
                  Math.max(
                    t.headingSize * t.lineHeight,
                    labelMetrics.glyphHeight,
                  ) +
                  2 * t.padding
              : 0,
          ),
        );
        if (y + rh > p.bodyBottom) throw Error("OVERFLOW:items-height");
        if (label)
          await text(
            "label-" + i,
            label,
            m,
            y + t.padding,
            p.labelWidth - t.gap,
            t.headingSize,
            2,
            true,
          );
        await text("item-" + i, detail, x, y + t.padding, tw, t.bodySize, 3);
        if (i < s.items.length - 1) line("row-" + i, y + rh);
        y += rh;
      }
      break;
    }
    case "summary": {
      let y = p.bodyTop;
      for (let i = 0; i < s.takeaways.length; i++) {
        const z = await measure(
          s.takeaways[i],
          w - p.indexWidth,
          t.headingSize,
          true,
        );
        const rh = snap(
          Math.max(
            p.summaryMinimum,
            z.lines.length *
              Math.max(t.headingSize * t.lineHeight, z.glyphHeight) +
              2 * t.padding,
          ),
        );
        if (y + rh > (s.nextAction ? p.actionTop - t.gap : p.bodyBottom))
          throw Error("OVERFLOW:items-height");
        await text(
          "index-" + i,
          String(i + 1).padStart(2, "0"),
          m,
          y + t.padding,
          p.indexWidth - t.gap,
          t.noteSize,
          1,
        );
        await text(
          "item-" + i,
          s.takeaways[i],
          m + p.indexWidth,
          y + t.padding,
          w - p.indexWidth,
          t.headingSize,
          3,
          true,
        );
        y += rh;
      }
      if (s.nextAction) {
        card(
          "action-group",
          m,
          p.actionTop,
          w,
          p.actionHeight,
          t.padding,
          false,
        );
        await text(
          "action-label",
          "次の行動",
          m + t.padding,
          p.actionTop + t.padding,
          w - 2 * t.padding,
          t.noteSize,
          1,
          true,
        );
        await text(
          "action",
          s.nextAction,
          m + t.padding,
          p.actionTop + t.padding + p.actionLabelGap,
          w - 2 * t.padding,
          t.bodySize,
          2,
        );
      }
      break;
    }
    case "two-column-comparison": {
      const axis = p.axisWidth,
        col = (w - axis - t.gap) / 2;
      await text(
        "leftLabel",
        s.leftLabel,
        m + axis,
        p.bodyTop,
        col,
        t.headingSize,
        1,
        true,
      );
      await text(
        "rightLabel",
        s.rightLabel,
        m + axis + col + t.gap,
        p.bodyTop,
        col,
        t.headingSize,
        1,
        true,
      );
      let y = p.bodyTop + p.comparisonHeader;
      line("header-line", y);
      for (let i = 0; i < s.rows.length; i++) {
        const z = await Promise.all(
          ["left", "right"].map((k) =>
            measure(s.rows[i][k], col - t.padding, t.bodySize),
          ),
        );
        const rh = snap(
          Math.max(p.rowMinimum, ...z.map((x) => height(x) + 2 * t.padding)),
        );
        if (y + rh > p.bodyBottom) throw Error("OVERFLOW:comparison-height");
        await text(
          "axis-" + i,
          s.rows[i].axis,
          m,
          y + t.padding,
          axis - t.gap,
          t.noteSize,
          2,
          true,
        );
        for (const [side, x] of [
          ["left", m + axis],
          ["right", m + axis + col + t.gap],
        ])
          await text(
            `value-${side}-${i}`,
            s.rows[i][side],
            x,
            y + t.padding,
            col - t.padding,
            t.bodySize,
            3,
          );
        y += rh;
        line("comparison-row-" + i, y);
      }
      break;
    }
    case "table": {
      const cw = w / s.columns.length;
      card("table-header", m, p.bodyTop, w, p.tableHeader, t.padding, false);
      for (let j = 0; j < s.columns.length; j++)
        await text(
          "column-" + j,
          s.columns[j],
          m + j * cw + t.padding,
          p.bodyTop + t.padding,
          cw - 2 * t.padding,
          t.headingSize,
          1,
          true,
        );
      let y = p.bodyTop + p.tableHeader;
      for (let i = 0; i < s.rows.length; i++) {
        const z = await Promise.all(
          s.rows[i].map((v) => measure(v, cw - 2 * t.padding, t.bodySize)),
        );
        const rh = snap(
          Math.max(
            p.tableRowMinimum,
            ...z.map((x) => height(x) + 2 * t.padding),
          ),
        );
        if (y + rh > p.bodyBottom) throw Error("OVERFLOW:table-height");
        for (let j = 0; j < s.columns.length; j++)
          await text(
            `value-${i}-${j}`,
            s.rows[i][j],
            m + j * cw + t.padding,
            y + t.padding,
            cw - 2 * t.padding,
            t.bodySize,
            6,
          );
        y += rh;
        line("table-row-" + i, y);
      }
      break;
    }
    case "diagram": {
      if (!diagram || s.diagramType !== "roadmap")
        throw Error("Unsupported diagram renderer: " + s.diagramType);
      validateInput(diagram, "roadmap");
      const cw =
          (w - (diagram.steps.length - 1) * t.gap) / diagram.steps.length,
        iw = cw - 2 * t.padding;
      const layouts = [];
      for (const step of diagram.steps) {
        const fields = [
          ["step", "STEP", t.noteSize, 1, false],
          ["title", step.title, t.headingSize, 2, true],
          ["purpose", step.purpose, t.bodySize, 3, false],
          ...step.items.map((x, i) => [
            "item-" + i,
            x.text,
            t.bodySize,
            3,
            false,
          ]),
          ...(step.outcome
            ? [["outcome", step.outcome, t.bodySize, 3, true]]
            : []),
        ];
        let total = 2 * t.padding;
        for (const f of fields) {
          const z = await measure(f[1], iw, f[2], f[4]);
          total +=
            z.lines.length * Math.max(f[2] * t.lineHeight, z.glyphHeight) +
            p.nodeFieldGap;
        }
        layouts.push({ fields, total });
      }
      const nh = snap(Math.max(p.nodeMinimum, ...layouts.map((x) => x.total)));
      if (nh > p.nodeMaximum) throw Error("OVERFLOW:diagram-node");
      for (let i = 0; i < diagram.steps.length; i++) {
        const x = m + i * (cw + t.gap);
        card(
          "node-" + diagram.steps[i].id,
          x,
          p.nodeTop,
          cw,
          nh,
          t.padding,
          false,
        );
        let y = p.nodeTop + t.padding;
        for (const [key, raw, size, maxLines, bold] of layouts[i].fields) {
          const value = key === "step" ? `STEP ${i + 1}` : raw;
          y +=
            (await text(
              `node-${i}-${key}`,
              value,
              x + t.padding,
              y,
              iw,
              size,
              maxLines,
              bold,
            )) + p.nodeFieldGap;
        }
      }
      for (let i = 0; i < diagram.relations.length; i++) {
        const rel = diagram.relations[i],
          a = diagram.steps.findIndex((x) => x.id === rel.from),
          b = diagram.steps.findIndex((x) => x.id === rel.to);
        if (b !== a + 1) throw Error("Unsupported roadmap edge");
        const x = m + (a + 1) * cw + a * t.gap;
        body.push(
          `<path id="edge-${i}" d="M${x} ${p.nodeTop + nh / 2}h${t.gap - 4}m-8 -6l8 6 -8 6" fill="none" stroke="${c.ink}" stroke-width="${t.stroke}"/>`,
        );
        await text(
          "edge-label-" + i,
          rel.label,
          x - t.padding,
          p.nodeTop + nh + t.padding,
          t.gap + 2 * t.padding,
          t.noteSize,
          3,
        );
      }
      if (s.caption)
        await text(
          "caption",
          s.caption,
          m,
          Math.min(p.bodyBottom - p.captionReserve, p.nodeTop + nh + 104),
          w,
          t.bodySize,
          2,
        );
      break;
    }
    default:
      throw Error("Unregistered dense template");
  }
}
module.exports = { drawDense };

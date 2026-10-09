"use strict";
const fs = require("node:fs/promises"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { PNG } = require("pngjs");
const { validatePresentation } = require("./validate.cjs");
const { validateInput } = require("../model.cjs");
const { loadRules } = require("../rules.cjs");
const { loadFont } = require("../font.cjs");
const { openBrowser, prepare } = require("../browser.cjs");
const { escape } = require("../engine.cjs");
const { drawDense } = require("./dense.cjs");
const profile = require("../../config/presentation-profile.json");
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
const canonical = (o) =>
  JSON.stringify(o, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v,
  );
async function renderSlide(
  slide,
  {
    context,
    font,
    codeFont,
    rules,
    diagram = null,
    pageNumber = 1,
    referenceLabel = "",
  },
) {
  const dense = slide.templateId.endsWith(".v2");
  const t = dense ? { ...rules.tokens, ...profile.tokens } : rules.tokens,
    c = rules.colors,
    page = await context.newPage();
  try {
    await prepare(page, font.css + codeFont.css);
    const blocks = [],
      shapes = [],
      body = [];
    async function measure(text, width, size, bold = false) {
      const code = /^[A-Za-z][A-Za-z0-9_-]*(?: [A-Za-z0-9_-]+)*(?:：|$)/.test(
        text,
      );
      font.ensureGlyphs(text);
      return page.evaluate(
        ({ text, width, size, bold, code }) => {
          const ctx = document.createElement("canvas").getContext("2d");
          ctx.font = `${bold ? 700 : 400} ${size}px ${code ? "DiagramMono,DiagramJP" : "DiagramJP"}`;
          const lines = [];
          for (const para of text.split("\n")) {
            let line = "";
            for (const char of para) {
              if (ctx.measureText(char).width > width)
                throw Error("Unbreakable text");
              if (line && ctx.measureText(line + char).width > width) {
                lines.push(line);
                line = "";
              }
              line += char;
            }
            lines.push(line);
          }
          const ns = "http://www.w3.org/2000/svg",
            svg = document.createElementNS(ns, "svg"),
            probe = document.createElementNS(ns, "text");
          probe.setAttribute(
            "font-family",
            code ? "DiagramMono,DiagramJP" : "DiagramJP",
          );
          probe.setAttribute("font-size", size);
          probe.setAttribute("font-weight", bold ? 700 : 400);
          probe.textContent = text;
          svg.append(probe);
          document.body.append(svg);
          const b = probe.getBBox();
          svg.remove();
          return {
            lines,
            ascent: -b.y,
            glyphHeight: b.height,
            leftBearing: b.x,
            code,
          };
        },
        { text, width, size, bold, code },
      );
    }
    async function text(id, value, x, y, w, size, maxLines = 2, bold = false) {
      const measured = await measure(value, w, size, bold),
        lines = measured.lines;
      if (lines.length > maxLines)
        throw Error(`OVERFLOW:${id}: ${lines.length} lines > ${maxLines}`);
      const lh = Math.max(size * t.lineHeight, measured.glyphHeight),
        h = lines.length * lh;
      blocks.push({ id, original: value, lines, x, y, w, h, size });
      body.push(
        `<text id="${id}" font-family="${measured.code ? "DiagramMono,DiagramJP" : "DiagramJP"}" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="${c.ink}">${lines.map((l, i) => `<tspan x="${x - Math.min(measured.leftBearing, 0)}" y="${y + measured.ascent + i * lh}">${escape(l)}</tspan>`).join("")}</text>`,
      );
      return h;
    }
    function card(id, x, y, w, h, padding = t.padding, outline = true) {
      shapes.push({ id, x, y, w, h, padding });
      body.push(
        `<rect id="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${t.radius}" fill="${c.panel}" stroke="${outline ? c.line : "none"}" stroke-width="${t.stroke}"/>`,
      );
    }
    const m = t.margin,
      w = t.width - 2 * m,
      s = slide.content;
    if (dense) {
      await drawDense({
        slide,
        t,
        c,
        text,
        measure,
        card,
        body,
        diagram,
        profile,
      });
    } else if (slide.slideType === "title") {
      await text("heading", s.heading, m, 280, w, t.titleSize, 2, true);
      if (s.subtitle)
        await text("subtitle", s.subtitle, m, 424, w, t.bodySize, 3);
    } else {
      await text("heading", s.heading, m, m, w, t.titleSize, 1, true);
      switch (slide.slideType) {
        case "bullet":
        case "summary": {
          const items = s.items || s.takeaways;
          let y = 168;
          for (let i = 0; i < items.length; i++) {
            const measured = await measure(
              items[i],
              w - 2 * t.padding,
              t.bodySize,
            );
            const h =
              Math.ceil(
                Math.max(
                  slide.slideType === "summary" ? 112 : 96,
                  measured.lines.length *
                    Math.max(t.bodySize * t.lineHeight, measured.glyphHeight) +
                    2 * t.padding,
                ) / t.grid,
              ) * t.grid;
            if (y + h > (slide.slideType === "summary" ? 600 : 736))
              throw Error("OVERFLOW:items-height");
            card("card-" + i, m, y, w, h);
            await text(
              "item-" + i,
              items[i],
              m + t.padding,
              y + t.padding,
              w - 2 * t.padding,
              t.bodySize,
              2,
            );
            y += h + (slide.slideType === "summary" ? 24 : 16);
          }
          if (s.nextAction)
            await text("action", s.nextAction, m, 624, w, t.bodySize, 2);
          break;
        }
        case "two-column-comparison": {
          const col = (w - t.gap) / 2;
          await text(
            "leftLabel",
            s.leftLabel,
            m,
            168,
            col,
            t.headingSize,
            1,
            true,
          );
          await text(
            "rightLabel",
            s.rightLabel,
            m + col + t.gap,
            168,
            col,
            t.headingSize,
            1,
            true,
          );
          let comparisonY = 224;
          for (let i = 0; i < s.rows.length; i++) {
            const measurements = await Promise.all(
              ["left", "right"].map((side) =>
                measure(s.rows[i][side], col - 2 * t.padding, t.bodySize),
              ),
            );
            const rh =
              Math.ceil(
                Math.max(
                  104,
                  ...measurements.map(
                    (z) =>
                      40 +
                      z.lines.length *
                        Math.max(t.bodySize * t.lineHeight, z.glyphHeight) +
                      t.padding,
                  ),
                ) / t.grid,
              ) * t.grid;
            const y = comparisonY;
            if (y + rh > 736) throw Error("OVERFLOW:comparison-height");
            for (const [side, x] of [
              ["left", m],
              ["right", m + col + t.gap],
            ]) {
              card(`${side}-${i}`, x, y, col, rh, 8);
              await text(
                `axis-${side}-${i}`,
                s.rows[i].axis,
                x + t.padding,
                y + 8,
                col - 2 * t.padding,
                t.noteSize,
                1,
                true,
              );
              await text(
                `value-${side}-${i}`,
                s.rows[i][side],
                x + t.padding,
                y + 40,
                col - 2 * t.padding,
                t.bodySize,
                3,
              );
            }
            comparisonY += rh + 8;
          }
          break;
        }
        case "table": {
          const cw = w / s.columns.length;
          for (let j = 0; j < s.columns.length; j++) {
            card(`head-${j}`, m + j * cw, 168, cw, 88);
            await text(
              `column-${j}`,
              s.columns[j],
              m + j * cw + t.padding,
              192,
              cw - 2 * t.padding,
              t.headingSize,
              1,
              true,
            );
          }
          let rowY = 256;
          for (let i = 0; i < s.rows.length; i++) {
            const measured = await Promise.all(
              s.rows[i].map((v) => measure(v, cw - 2 * t.padding, t.bodySize)),
            );
            const rh = Math.max(
              80,
              ...measured.map(
                (x) =>
                  x.lines.length *
                    Math.max(t.bodySize * t.lineHeight, x.glyphHeight) +
                  2 * t.padding,
              ),
            );
            if (rowY + rh > 736) throw Error("OVERFLOW:table-height");
            for (let j = 0; j < s.columns.length; j++) {
              card(`cell-${i}-${j}`, m + j * cw, rowY, cw, rh);
              await text(
                `value-${i}-${j}`,
                s.rows[i][j],
                m + j * cw + t.padding,
                rowY + t.padding,
                cw - 2 * t.padding,
                t.bodySize,
                6,
              );
            }
            rowY += rh;
          }
          break;
        }
        case "diagram": {
          if (!diagram || s.diagramType !== "roadmap")
            throw Error("Unsupported diagram renderer: " + s.diagramType);
          validateInput(diagram, "roadmap");
          const steps = diagram.steps,
            cw = (w - (steps.length - 1) * t.gap) / steps.length;
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i],
              x = m + i * (cw + t.gap);
            card("node-" + step.id, x, 224, cw, 448);
            await text(
              "step-" + i,
              `STEP ${i + 1}`,
              x + t.padding,
              248,
              cw - 2 * t.padding,
              t.noteSize,
              1,
            );
            await text(
              "node-title-" + i,
              step.title,
              x + t.padding,
              288,
              cw - 2 * t.padding,
              t.headingSize,
              2,
              true,
            );
            let y = 376;
            y +=
              (await text(
                "purpose-" + i,
                step.purpose,
                x + t.padding,
                y,
                cw - 2 * t.padding,
                t.bodySize,
                2,
              )) + 16;
            for (let k = 0; k < step.items.length; k++) {
              y +=
                (await text(
                  `node-item-${i}-${k}`,
                  step.items[k].text,
                  x + t.padding,
                  y,
                  cw - 2 * t.padding,
                  t.bodySize,
                  2,
                )) + 8;
            }
            if (y > 656) throw Error("OVERFLOW:diagram-node");
            if (step.outcome)
              throw Error(
                "OVERFLOW: diagram outcome requires additional slide; cannot omit",
              );
          }
          for (let i = 0; i < diagram.relations.length; i++) {
            const r = diagram.relations[i],
              a = steps.findIndex((x) => x.id === r.from),
              b = steps.findIndex((x) => x.id === r.to);
            if (b !== a + 1) throw Error("Unsupported roadmap edge");
            const x = m + (a + 1) * cw + a * t.gap;
            body.push(
              `<path id="edge-${i}" d="M${x} 440 h${t.gap - 5} m-8 -6 l8 6 -8 6" fill="none" stroke="${c.ink}" stroke-width="${t.stroke}"/>`,
            );
            await text(
              "edge-label-" + i,
              r.label,
              x - t.padding,
              696,
              t.gap + 2 * t.padding,
              t.noteSize,
              3,
            );
          }
          if (s.caption)
            await text("caption", s.caption, m, 760, w, t.bodySize, 1);
          break;
        }
        default:
          throw Error("Unregistered renderer");
      }
    }
    if (referenceLabel)
      await text(
        "reference",
        referenceLabel,
        t.margin,
        800,
        t.width - 2 * t.margin - 112,
        t.noteSize,
        1,
      );
    await text(
      "page",
      String(pageNumber),
      t.width - m - 80,
      800,
      80,
      t.noteSize,
      1,
    );
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${t.width}" height="${t.height}" viewBox="0 0 ${t.width} ${t.height}"><style>${font.css + codeFont.css}</style><rect width="100%" height="100%" fill="#FFFFFF"/>${body.join("")}</svg>`;
    await page.setContent(svg);
    await page.evaluate(() => document.fonts.ready);
    const bounds = await page.locator("text").evaluateAll((els) =>
      els.map((e) => {
        const b = e.getBBox();
        return { id: e.id, x: b.x, y: b.y, w: b.width, h: b.height };
      }),
    );
    const intersects = (a, b) =>
      a.x < b.x + b.w - 0.1 &&
      b.x < a.x + a.w - 0.1 &&
      a.y < b.y + b.h - 0.1 &&
      b.y < a.y + a.h - 0.1;
    for (const b of bounds) {
      if (
        b.x < m - 0.1 ||
        b.y < m - 0.1 ||
        b.x + b.w > t.width - m + 0.1 ||
        b.y + b.h > t.height - m + 0.1
      )
        throw Error("Text out of canvas " + JSON.stringify(b));
      const block = blocks.find((x) => x.id === b.id);
      if (
        b.x < block.x - 0.5 ||
        b.x + b.w > block.x + block.w + 0.5 ||
        b.y < block.y - 0.5 ||
        b.y + b.h > block.y + block.h + 0.5
      )
        throw Error(
          "Text outside reserved bounds " +
            JSON.stringify({ actual: b, reserved: block }),
        );
      for (const q of shapes)
        if (
          intersects(b, q) &&
          !(
            b.x >= q.x + q.padding - 0.1 &&
            b.y >= q.y + q.padding - 0.1 &&
            b.x + b.w <= q.x + q.w - q.padding + 0.1 &&
            b.y + b.h <= q.y + q.h - q.padding + 0.1
          )
        )
          throw Error("Text crosses shape " + b.id);
    }
    for (let i = 0; i < bounds.length; i++)
      for (let j = i + 1; j < bounds.length; j++)
        if (intersects(bounds[i], bounds[j]))
          throw Error("Text overlap " + bounds[i].id + "/" + bounds[j].id);
    for (let i = 0; i < shapes.length; i++)
      for (let j = i + 1; j < shapes.length; j++)
        if (intersects(shapes[i], shapes[j])) throw Error("Shape overlap");
    const imagePage = await context.newPage();
    let png, thumbnail;
    try {
      await imagePage.setViewportSize({ width: 1600, height: 900 });
      await imagePage.setContent(
        '<img style="display:block;width:1600px;height:900px"/>',
      );
      await imagePage.locator("img").evaluate(async (el, s) => {
        el.src = "data:image/svg+xml;base64," + s;
        await el.decode();
      }, Buffer.from(svg).toString("base64"));
      png = await imagePage.locator("img").screenshot();
      await imagePage.locator("img").evaluate((e) => {
        e.style.width = "400px";
        e.style.height = "225px";
      });
      thumbnail = await imagePage.locator("img").screenshot();
    } finally {
      await imagePage.close();
    }
    const p = PNG.sync.read(png);
    if (p.width !== 3200 || p.height !== 1800) throw Error("PNG dimensions");
    for (let i = 0; i < p.data.length; i += 4)
      if (
        p.data[i] !== p.data[i + 1] ||
        p.data[i] !== p.data[i + 2] ||
        p.data[i + 3] !== 255
      )
        throw Error("Non-monochrome PNG");
    if (blocks.some((b) => b.size < 20)) throw Error("Font below minimum size");
    return {
      svg: Buffer.from(svg),
      png,
      thumbnail,
      report: {
        bounds,
        blocks,
        shapes,
        designQuality: {
          minimumFontSize: Math.min(...blocks.map((b) => b.size)),
          enclosedGroups: shapes.length,
          enclosedAreaRatio:
            shapes.reduce((n, s) => n + s.w * s.h, 0) / (t.width * t.height),
          subjectiveReview: "not_reviewed",
        },
        checks: {
          schema: "passed",
          glyphs: "passed",
          textBounds: "passed",
          overlaps: "passed",
          monochrome: "passed",
          pngDimensions: "passed",
          contentAccuracy: "not_reviewed",
          visualReview: "not_reviewed",
        },
      },
    };
  } finally {
    await page.close();
  }
}
async function generatePresentation(
  input,
  {
    root = path.resolve(__dirname, "../.."),
    output = path.join(root, "outputs"),
    fontPath = process.env.DIAGRAM_FONT || "C:/Windows/Fonts/NotoSansJP-VF.ttf",
    browserPath = process.env.DIAGRAM_BROWSER,
    sourceFiles = {},
    allowUnreviewedTemplates = false,
    exportFormats = ["pdf", "pptx"],
  } = {},
) {
  if (
    !Array.isArray(exportFormats) ||
    new Set(exportFormats).size !== exportFormats.length ||
    exportFormats.some((f) => !["pdf", "pptx"].includes(f))
  )
    throw Error("Invalid export formats");
  input = require("./defaults.cjs").applyTemplateDefaults(input);
  validatePresentation(input);
  const registry = require("../../config/slide-templates.json");
  for (const slide of input.slides) {
    const template = registry.templates.find(
      (t) => t.templateId === slide.templateId,
    );
    if (
      !template.rendererImplemented ||
      (!allowUnreviewedTemplates &&
        template.visualValidation !== "sample_reviewed")
    )
      throw Error("Unverified template: " + slide.templateId);
  }
  const rules = await loadRules(root);
  for (const name of [
    "rules/presentation.md",
    "config/presentation-profile.json",
    "src/presentation/dense.cjs",
    "src/presentation/export.cjs",
    "src/presentation/normalize-pptx.py",
    "src/presentation/normalize-pdf.py",
    "src/presentation/defaults.cjs",
    "config/slide-templates.json",
    ...input.slides.map((x) => "templates/slides/" + x.slideType + ".md"),
  ]) {
    rules.hashes[name] = hash(await fs.readFile(path.join(root, name)));
  }
  const font = await loadFont(fontPath, [canonical(input)]),
    codeFont = await loadFont(
      path.join(root, "assets/fonts/NotoSansMono-Regular.ttf"),
      ["M"],
      "DiagramMono",
    ),
    { browser, context } = await openBrowser(browserPath);
  const directory = path.join(
    output,
    input.presentationId,
    "versions",
    String(input.version).padStart(6, "0"),
  );
  const metadata = {
    schemaVersion: "presentation-package-1.0",
    presentationId: input.presentationId,
    presentationVersion: input.version,
    generatedAt: new Date().toISOString(),
    slides: [],
    formats: {
      svg: "generated",
      png: "generated",
      thumbnailPng: "generated",
      pdf: "not_requested",
      pptx: "not_requested",
      webSvg: "unsupported",
      webp: "unsupported",
    },
    font: font.info,
    codeFont: codeFont.info,
    ruleHashes: rules.hashes,
  };
  const reports = [];
  let created = false;
  try {
    await fs.mkdir(path.dirname(directory), { recursive: true });
    await fs.mkdir(directory);
    created = true;
    await fs.mkdir(path.join(directory, "source"));
    await fs.writeFile(
      path.join(directory, "source/presentation.json"),
      JSON.stringify(input, null, 2),
    );
    const sources = [];
    for (const [id, file] of Object.entries(sourceFiles)) {
      const bytes = await fs.readFile(file);
      const name = id + ".md";
      if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id))
        throw Error("Unsafe sourceId");
      await fs.writeFile(path.join(directory, "source", name), bytes);
      sources.push({
        sourceId: id,
        sourceVersion: hash(bytes),
        path: "source/" + name,
        sha256: hash(bytes),
      });
    }
    metadata.sources = sources;
    for (const slide of input.slides)
      for (const ref of slide.sourceReferences || []) {
        const src = sources.find((x) => x.sourceId === ref.sourceId);
        if (!src || src.sourceVersion !== ref.sourceVersion)
          throw Error("Source reference version mismatch");
      }
    for (const slide of input.slides) {
      let diagram = null;
      if (slide.slideType === "diagram") {
        const base = await fs.realpath(root),
          file = await fs.realpath(
            path.resolve(root, slide.content.diagram.sourcePath),
          );
        if (!file.startsWith(base + path.sep))
          throw Error("Diagram outside source root");
        const b = await fs.readFile(file);
        if (hash(b) !== slide.content.diagram.sha256)
          throw Error("Diagram hash mismatch");
        await fs.mkdir(path.join(directory, "source/diagrams"), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(
            directory,
            "source/diagrams",
            slide.content.diagram.diagramId + ".json",
          ),
          b,
        );
        diagram = JSON.parse(b);
        if (diagram.type !== slide.content.diagramType)
          throw Error("Diagram type mismatch");
      }
      const fragments = [slide];
      let part = 0;
      for (let n = 0; n < fragments.length; n++) {
        const current = fragments[n];
        let rendered;
        try {
          rendered = await renderSlide(current, {
            context,
            font,
            codeFont,
            rules,
            diagram,
            pageNumber: metadata.slides.length + 1,
            referenceLabel: current.references
              .map(
                (id) =>
                  input.references.find((r) => r.referenceId === id).label,
              )
              .join(" / "),
          });
        } catch (e) {
          const key = current.content.items
            ? "items"
            : current.content.takeaways
              ? "takeaways"
              : current.content.rows
                ? "rows"
                : null;
          if (
            !e.message.startsWith("OVERFLOW:") ||
            !key ||
            current.content[key].length < 2
          )
            throw e;
          const half = Math.ceil(current.content[key].length / 2);
          const a = structuredClone(current),
            b = structuredClone(current);
          a.content[key] = current.content[key].slice(0, half);
          b.content[key] = current.content[key].slice(half);
          if (key === "takeaways") delete a.content.nextAction;
          fragments.splice(n, 1, a, b);
          n--;
          continue;
        }
        const index = String(metadata.slides.length + 1).padStart(3, "0"),
          dir = path.join(directory, "slides", index);
        await fs.mkdir(dir, { recursive: true });
        await fs.mkdir(path.join(directory, "thumbnails"), { recursive: true });
        const files = [
          ["slides/" + index + "/slide.svg", rendered.svg],
          ["slides/" + index + "/slide.png", rendered.png],
          ["thumbnails/" + index + ".png", rendered.thumbnail],
        ];
        for (const [name, bytes] of files)
          await fs.writeFile(path.join(directory, name), bytes);
        metadata.slides.push({
          pageId: slide.slideId + "-part-" + (part + 1),
          slideId: slide.slideId,
          slideVersion: slide.slideVersion || 1,
          part: ++part,
          templateId: slide.templateId,
          contentHash: hash(canonical(current.content)),
          sourceReferences:
            slide.sourceReferences ||
            slide.references.map((id) => ({
              sourceId: id,
              sourceVersion:
                sources.find((x) => x.sourceId === id)?.sourceVersion ||
                "unverified",
              locator:
                input.references.find((x) => x.referenceId === id)?.locator ||
                "",
            })),
          generatedAt: metadata.generatedAt,
          artifacts: files.map(([name, bytes]) => ({
            path: name,
            sizeBytes: bytes.length,
            sha256: hash(bytes),
          })),
        });
        reports.push({ slideId: slide.slideId, part, report: rendered.report });
      }
    }
    metadata.status = "generated";
    metadata.dependencyHash = hash(
      canonical({
        rules: rules.hashes,
        font: font.info.sha256,
        codeFont: codeFont.info.sha256,
        engine: hash(await fs.readFile(__filename)),
      }),
    );
    const validMetadata = new (require("ajv"))({ strict: true }).compile(
      require("../../schemas/presentation-metadata.schema.json"),
    );
    if (!validMetadata(metadata))
      throw Error("Metadata contract: " + JSON.stringify(validMetadata.errors));
    await fs.writeFile(
      path.join(directory, "metadata.json"),
      JSON.stringify(metadata, null, 2),
    );
    await fs.writeFile(
      path.join(directory, "validation.json"),
      JSON.stringify(
        {
          slides: reports,
          contentAccuracy: "not_reviewed",
          visualReview: "not_reviewed",
        },
        null,
        2,
      ),
    );
    if (exportFormats.length) {
      await require("./export.cjs").exportPresentation(directory, {
        browserPath,
        formats: exportFormats,
      });
      Object.assign(
        metadata,
        JSON.parse(
          await fs.readFile(path.join(directory, "metadata.json"), "utf8"),
        ),
      );
    }
    return { directory, metadata };
  } catch (e) {
    if (created)
      await fs.writeFile(
        path.join(directory, "validation.json"),
        JSON.stringify({ status: "failed", message: e.message }),
      );
    throw e;
  } finally {
    await browser.close();
  }
}
module.exports = { renderSlide, generatePresentation, canonical, hash };

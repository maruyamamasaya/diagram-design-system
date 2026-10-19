"use strict";
const fs = require("node:fs/promises"),
  path = require("node:path"),
  os = require("node:os"),
  crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { openBrowser } = require("../browser.cjs");
const digest = (b) => crypto.createHash("sha256").update(b).digest("hex");
function sourceGlyphAliases(svg, lines) {
  const expected = new Set(lines.join(""));
  const candidates = new Map();
  for (const family of ["DiagramJP", "DiagramMono"]) {
    const match = svg.match(
      new RegExp(
        "font-family:" +
          family +
          ";src:url\\(data:font/[a-z]+;base64,([^)]*)\\)",
      ),
    );
    if (!match) throw Error("Missing embedded export font " + family);
    const font = require("fontkit").create(Buffer.from(match[1], "base64"));
    const used = new Map();
    for (const char of expected)
      if (font.hasGlyphForCodePoint(char.codePointAt(0))) {
        const id = font.glyphForCodePoint(char.codePointAt(0)).id;
        if (!used.has(id)) used.set(id, new Set());
        used.get(id).add(char);
      }
    for (const cp of font.characterSet) {
      const old = String.fromCodePoint(cp);
      if (expected.has(old)) continue;
      const matches = used.get(font.glyphForCodePoint(cp).id);
      if (matches?.size === 1) {
        if (!candidates.has(old)) candidates.set(old, new Set());
        candidates.get(old).add([...matches][0]);
      }
    }
  }
  return Object.fromEntries(
    [...candidates]
      .filter(([, v]) => v.size === 1)
      .map(([k, v]) => [k, [...v][0]]),
  );
}
function artifactPath() {
  if (process.env.DIAGRAM_ARTIFACT_TOOL)
    return path.resolve(process.env.DIAGRAM_ARTIFACT_TOOL);
  try {
    return require.resolve("@oai/artifact-tool");
  } catch {
    return path.join(
      os.homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs",
    );
  }
}
async function readScene(svg, page) {
  if (
    /<script|<foreignObject|\son\w+\s*=|(?:href|url\()\s*["']?https?:/i.test(
      svg,
    )
  )
    throw Error("Unsafe export SVG");
  await page.setContent(svg);
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() =>
    [...document.querySelector("svg").children]
      .filter((e) => e.tagName !== "style")
      .map((e) => {
        const a = Object.fromEntries(
          [...e.attributes].map((a) => [a.name, a.value]),
        );
        if (e.tagName === "text")
          return {
            kind: "text",
            ...a,
            lines: [...e.querySelectorAll("tspan")].map((l) => {
              const b = l.getBBox();
              return {
                value: l.textContent,
                x: +l.getAttribute("x"),
                baseline: +l.getAttribute("y"),
                top: b.y,
                height: b.height,
                width: b.width,
              };
            }),
          };
        if (e.tagName === "image") {
          if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(a.href || "")) throw Error("Unsafe embedded image");
          return {kind:"image", ...a};
        }
        if (!["rect", "path"].includes(e.tagName))
          throw Error("Unsupported SVG element " + e.tagName);
        return { kind: e.tagName, ...a };
      }),
  );
}
function segments(d) {
  if (/[^0-9eE.,+\-\sMmLlHhVv]/.test(d)) throw Error("Unsupported SVG path");
  const a = d.match(/[MmHhLlVv]|-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) || [];
  let x = 0,
    y = 0,
    i = 0,
    cmd;
  const out = [];
  while (i < a.length) {
    if (/^[MmHhLlVv]$/.test(a[i])) cmd = a[i++];
    const relative = cmd === cmd.toLowerCase();
    let nx = x,
      ny = y;
    if (cmd.toLowerCase() === "h") nx = (relative ? x : 0) + Number(a[i++]);
    else if (cmd.toLowerCase() === "v") ny = (relative ? y : 0) + Number(a[i++]);
    else if (["m", "l"].includes(cmd.toLowerCase())) {
      nx = (relative ? x : 0) + Number(a[i++]);
      ny = (relative ? y : 0) + Number(a[i++]);
    } else throw Error("Unsupported SVG path");
    if (cmd.toLowerCase() !== "m") out.push({ x, y, nx, ny });
    x = nx;
    y = ny;
    if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
  }
  return out;
}
function styleText(shape, node, size) {
  shape.text.style = {
    fontSize: size,
    typeface: node["font-family"].startsWith("DiagramMono")
      ? "Noto Sans Mono"
      : "Noto Sans JP",
    bold:
      !node["font-family"].startsWith("DiagramMono") &&
      +node["font-weight"] >= 700,
    color: node.fill || "#111111",
    insets: 0,
    autoFit: "none",
    wrap: "none",
    verticalAlignment: "top",
    alignment: "left",
    lineSpacing: 1,
  };
}
function addNativeTable(slide, scene, v2) {
  const columns = scene
    .filter((n) => n.kind === "text" && /^column-\d+$/.test(n.id))
    .sort((a, b) => +a.id.split("-")[1] - +b.id.split("-")[1]);
  if (!columns.length) return new Set();
  const cells = scene.filter(
    (n) => n.kind === "text" && /^value-\d+-\d+$/.test(n.id),
  );
  const rows = 1 + Math.max(...cells.map((n) => +n.id.split("-")[1] + 1));
  const cw = columns[1].lines[0].x - columns[0].lines[0].x,
    padding = (v2 ? 16 : 24) * 0.8,
    left = columns[0].lines[0].x - padding,
    top = columns[0].lines[0].top - padding;
  const lineY = scene
    .filter((n) => n.kind === "path" && /^table-row-/.test(n.id))
    .map((n) => segments(n.d)[0].y);
  const headers = scene.find((n) => n.id === "table-header");
  const tableWidth = headers ? +headers.width : cw * columns.length;
  const columnWidths = columns.map((column, i) =>
    i + 1 < columns.length
      ? columns[i + 1].lines[0].x - column.lines[0].x
      : left + tableWidth - (column.lines[0].x - padding),
  );
  const heights = [headers ? +headers.height : 88 * 0.8];
  if (v2)
    for (let i = 0; i < rows - 1; i++)
      heights.push(lineY[i] - (i ? lineY[i - 1] : top + heights[0]));
  else
    for (let i = 0; i < rows - 1; i++) {
      const node = scene.find(
        (n) => n.kind === "rect" && n.id === `cell-${i}-0`,
      );
      heights.push(node ? +node.height : 80 * 0.8);
    }
  const values = Array.from({ length: rows }, () =>
    Array(columns.length).fill(""),
  );
  const nodes = [
    columns,
    ...Array.from({ length: rows - 1 }, (_, i) =>
      cells
        .filter((n) => +n.id.split("-")[1] === i)
        .sort((a, b) => +a.id.split("-")[2] - +b.id.split("-")[2]),
    ),
  ];
  nodes.forEach((row, i) =>
    row.forEach(
      (n, j) => (values[i][j] = n.lines.map((l) => l.value).join("\n")),
    ),
  );
  const table = slide.tables.add({
    rows,
    columns: columns.length,
    left,
    top,
    width: tableWidth,
    height: heights.reduce((a, b) => a + b, 0),
    columnWidths,
    values,
  });
  table.styleOptions = {
    headerRow: false,
    bandedRows: false,
    bandedColumns: false,
  };
  table.borders.assign({ fill: "none", width: 0 });
  for (let i = 0; i < rows; i++) {
    table.rows[i].height = heights[i];
    for (let j = 0; j < columns.length; j++) {
      const n = nodes[i][j],
        cell = table.getCell(i, j);
      cell.fill = i === 0 || !v2 ? "#F2F2F2" : "#FFFFFF";
      styleText(cell, n, +n["font-size"]);
      table.cells
        .block({ row: i, column: j, rowCount: 1, columnCount: 1 })
        .assign({
          margins: {
            top:
              padding +
              Number(n["font-size"]) *
                (n["font-family"].startsWith("DiagramMono") ? 0.12 : 0.2),
            bottom:
              padding -
              Number(n["font-size"]) *
                (n["font-family"].startsWith("DiagramMono") ? 0.12 : 0.2),
            left: padding,
            right: padding,
          },
          anchor: "top",
          horizontalOverflow: "clip",
        });
    }
  }
  // Keep only the existing horizontal rules, rather than adding a grid.
  return new Set(
    scene
      .filter((n) =>
        /^column-|^value-|^cell-|^head-|^table-header$/.test(n.id || ""),
      )
      .map((n) => n.id),
  );
}
async function exportPptx(pages, directory) {
  const { Presentation, PresentationFile } = await import(
    pathToFileURL(artifactPath()).href
  );
  const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  pages = pages.map((info) => ({
    ...info,
    scene: info.scene.map((n) => {
      const v = { ...n };
      for (const k of [
        "x",
        "y",
        "width",
        "height",
        "rx",
        "font-size",
        "stroke-width",
      ])
        if (v[k] !== undefined) v[k] = Number(v[k]) * 0.8;
      if (v.lines)
        v.lines = v.lines.map((l) =>
          Object.fromEntries(
            Object.entries(l).map(([k, x]) => [k, k === "value" ? x : x * 0.8]),
          ),
        );
      if (v.d)
        v.d = v.d.replace(
          /-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi,
          (x) => Number(x) * 0.8,
        );
      return v;
    }),
  }));
  for (const info of pages) {
    const s = p.slides.add();
    s.background.fill = "#FFFFFF";
    s.speakerNotes.text = info.notes || "";
    const omitted =
      info.slideType === "table"
        ? addNativeTable(s, info.scene, info.templateId.endsWith(".v2"))
        : new Set();
    for (const n of info.scene) {
      if (omitted.has(n.id) || !n.id) continue;
      if (n.kind === "text")
        for (const [i, l] of n.lines.entries()) {
          const sh = s.shapes.add({
            name: n.id + "-line-" + i,
            geometry: "textbox",
            position: {
              left: l.x,
              top:
                l.top +
                Number(n["font-size"]) *
                  (n["font-family"].startsWith("DiagramMono") ? 0.12 : 0.2),
              width: Math.max(l.width + 8, 16),
              height: l.height + 8,
            },
            fill: "none",
            line: { fill: "none", width: 0 },
          });
          sh.text = l.value;
          styleText(sh, n, +n["font-size"]);
        }
      else if (n.kind === "image") {
        const [header, encoded] = n.href.split(",");
        s.images.add({
          blob: new Uint8Array(Buffer.from(encoded, "base64")),
          contentType: header.slice(5, header.indexOf(";")),
          alt: n["aria-label"] || n.id, fit: "contain",
          position: {left:+n.x, top:+n.y, width:+n.width, height:+n.height},
        });
      } else if (n.kind === "rect")
        s.shapes.add({
          name: n.id,
          geometry: +n.rx ? "roundRect" : "rect",
          borderRadius: +n.rx || 0,
          position: {
            left: +n.x,
            top: +n.y,
            width: +n.width,
            height: +n.height,
          },
          fill: n.fill,
          line: { fill: n.stroke || "none", width: +n["stroke-width"] || 0 },
        });
      else if (n.kind === "path")
        for (const [i, l] of segments(n.d).entries())
          s.shapes.add({
            name: n.id + "-segment-" + i,
            // SVG paths are independent editable segments, not attached connectors.
            geometry: "line",
            fill: "none",
            position: {
              left: Math.min(l.x, l.nx),
              top: Math.min(l.y, l.ny),
              width: Math.abs(l.nx - l.x),
              height: Math.abs(l.ny - l.y),
              verticalFlip: (l.ny - l.y) * (l.nx - l.x) < 0,
            },
            line: { fill: n.stroke, width: +n["stroke-width"] || 1 },
          });
    }
  }
  const candidate = path.join(directory, "export-validation", "candidate.pptx");
  await fs.mkdir(path.dirname(candidate), { recursive: true });
  await (await PresentationFile.exportPptx(p)).save(candidate);
  // Canvas scaling is uniform: 1600 SVG units to 13 1/3 inches. No text shrinking.
  // Artifact Tool exports native objects; validation against PowerPoint is a separate step.
  await require("node:util").promisify(require("node:child_process").execFile)(
    process.env.DIAGRAM_PYTHON ||
      path.join(
        os.homedir(),
        ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
      ),
    [
      path.join(__dirname, "normalize-pptx.py"),
      candidate,
      path.join(directory, "export-validation/normalized.pptx"),
      pages
        .flatMap((p, i) =>
          p.slideType === "table" && p.templateId.endsWith(".v1")
            ? [i + 1]
            : [],
        )
        .join(","),
    ],
  );
  const skill =
    process.env.DIAGRAM_PRESENTATIONS_SKILL ||
    path.join(
      os.homedir(),
      ".codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations",
    );
  process.env.RUNTIME_NODE_MODULES ||= path.join(
    os.homedir(),
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
  );
  const { finalizePresentation } = await import(
    pathToFileURL(path.join(skill, "container_tools/artifact_tool_utils.mjs"))
      .href
  );
  await fs.mkdir(path.join(directory, "export-validation/final"), {
    recursive: true,
  });
  await finalizePresentation({
    workspaceDir: directory,
    candidatePath: path.join(directory, "export-validation/normalized.pptx"),
    finalPath: path.join(
      directory,
      "export-validation/final/presentation.pptx",
    ),
    pythonExecutable:
      process.env.DIAGRAM_PYTHON ||
      path.join(
        os.homedir(),
        ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
      ),
    integrityValidatorPath: path.join(
      skill,
      "container_tools/inspect_presentation_package_integrity.py",
    ),
    layoutValidatorPath: path.join(
      skill,
      "container_tools/inspect_presentation_layout_geometry.py",
    ),
    layoutArgs: [
      "--expected-slide-size-emu",
      "12192000,6858000",
      "--validate-heading-fit",
      ...pages.flatMap((p, i) =>
        p.slideType === "table"
          ? ["--require-native-table-slide", String(i + 1)]
          : [],
      ),
    ],
    explicitTotalSlideCount: pages.length,
    requiredNativeTableOwnerSlides: pages.flatMap((p, i) =>
      p.slideType === "table" ? [i + 1] : [],
    ),
    fontPolicy: {
      basis: "design",
      families: ["Noto Sans JP", "Noto Sans Mono"],
    },
    verifyArtifactToolImport: true,
    receiptPath: path.join(directory, "export-validation/pptx-validation.json"),
  });
  await fs.copyFile(
    path.join(directory, "export-validation/final/presentation.pptx"),
    path.join(directory, "presentation.pptx"),
    require("node:fs").constants.COPYFILE_EXCL,
  );
  return {
    library: "@oai/artifact-tool",
    editableObjects: true,
    fontEmbedding: "not_embedded",
    rendered: "not_reviewed",
  };
}
async function exportPresentation(
  directory,
  { browserPath = process.env.DIAGRAM_BROWSER, formats = ["pdf", "pptx"] } = {},
) {
  directory = path.resolve(directory);
  const meta = JSON.parse(
    await fs.readFile(path.join(directory, "metadata.json"), "utf8"),
  );
  if (
    formats.includes("pptx") &&
    (meta.font.family !== "Noto Sans JP" ||
      meta.codeFont.family !== "Noto Sans Mono")
  )
    throw Error(
      "PPTX export requires the verified Noto Sans JP / Noto Sans Mono fonts",
    );
  for (const format of formats)
    if (!["pdf", "pptx"].includes(format))
      throw Error("Unsupported export format " + format);
  for (const format of formats)
    try {
      await fs.access(
        path.join(
          directory,
          format === "pdf" ? "document.pdf" : "presentation.pptx",
        ),
      );
      throw Error("Export already exists: " + format);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  const { browser, context } = await openBrowser(browserPath);
  const page = await context.newPage();
  const pages = [];
  let lease;
  try {
    lease = await fs.open(path.join(directory, ".export.lock"), "wx");
  } catch (e) {
    await browser.close();
    throw e;
  }
  try {
    const source = JSON.parse(
      await fs.readFile(
        path.join(directory, "source/presentation.json"),
        "utf8",
      ),
    );
    for (const slide of meta.slides) {
      const a = slide.artifacts.find((a) => a.path.endsWith("/slide.svg"));
      if (!a) throw Error("Missing SVG");
      const full = path.resolve(directory, a.path);
      if (!full.startsWith(directory + path.sep))
        throw Error("Unsafe artifact path");
      const b = await fs.readFile(full);
      if (digest(b) !== a.sha256) throw Error("SVG integrity mismatch");
      const svg = b.toString("utf8");
      pages.push({
        svg,
        scene: await readScene(svg, page),
        slideType: source.slides.find((s) => s.slideId === slide.slideId)
          .slideType,
        templateId: slide.templateId,
        notes:
          source.slides.find((s) => s.slideId === slide.slideId).notes +
          "\n" +
          source.slides
            .find((s) => s.slideId === slide.slideId)
            .references.map((id) => {
              const ref = source.references.find((r) => r.referenceId === id);
              return ref.label + ": " + ref.source;
            })
            .join("\n") +
          (source.assets || []).filter(a => {
            const content = source.slides.find(s => s.slideId === slide.slideId).content;
            return (content.images || (content.image ? [content.image] : [])).some(im => im.assetId === a.assetId);
          }).map(a => `\nImage ${a.assetId}: ${a.origin}\nLicense: ${a.license}\nSHA256: ${a.sha256}${a.kind === "generated" ? "\nGenerated illustration, not documentary evidence. Prompt: " + a.prompt : ""}`).join(""),
      });
    }
    const report = { pdf: "not_requested", pptx: "not_requested" };
    await fs.mkdir(path.join(directory, "export-validation"), {
      recursive: true,
    });
    if (formats.includes("pdf")) {
      await page.setContent(
        "<style>@page{size:960pt 540pt;margin:0}html,body{margin:0}section{width:1280px;height:720px;break-after:page}section:last-child{break-after:auto}svg{display:block;width:1280px;height:720px}</style>" +
          pages[0].svg.match(/<style>[\s\S]*?<\/style>/)[0] +
          pages
            .map(
              (p) =>
                "<section>" +
                p.svg.replace(/<style>[\s\S]*?<\/style>/g, "") +
                "</section>",
            )
            .join(""),
      );
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({
        path: path.join(directory, "export-validation/candidate.pdf"),
        preferCSSPageSize: true,
        printBackground: true,
      });
      const pdfLines = pages.flatMap((p) =>
        p.scene
          .filter((n) => n.kind === "text")
          .flatMap((n) => n.lines.map((l) => l.value)),
      );
      await fs.writeFile(
        path.join(directory, "export-validation/pdf-text.json"),
        JSON.stringify({
          lines: pdfLines,
          aliases: sourceGlyphAliases(pages[0].svg, pdfLines),
        }),
      );
      const fixed = await require("node:util").promisify(
        require("node:child_process").execFile,
      )(
        process.env.DIAGRAM_PYTHON ||
          path.join(
            os.homedir(),
            ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
          ),
        [
          path.join(__dirname, "normalize-pdf.py"),
          path.join(directory, "export-validation/candidate.pdf"),
          path.join(directory, "document.pdf"),
          path.join(directory, "export-validation/pdf-text.json"),
        ],
      );
      report.pdf = {
        unicodeMap: JSON.parse(fixed.stdout),
        renderer: "Chromium",
        vector: "text_and_shapes",
        visualReview: "not_reviewed",
      };
    }
    if (formats.includes("pptx"))
      report.pptx = await exportPptx(pages, directory);
    const artifacts = [];
    for (const f of formats) {
      const name = f === "pdf" ? "document.pdf" : "presentation.pptx",
        b = await fs.readFile(path.join(directory, name));
      artifacts.push({ path: name, sizeBytes: b.length, sha256: digest(b) });
      meta.formats[f] = "generated";
    }
    meta.deckArtifacts = [...(meta.deckArtifacts || []), ...artifacts];
    await fs.writeFile(
      path.join(directory, "export-validation.json"),
      JSON.stringify(report, null, 2),
    );
    await fs.writeFile(
      path.join(directory, "metadata.json"),
      JSON.stringify(meta, null, 2),
    );
    return { directory, pages: pages.length, report };
  } catch (e) {
    await fs.writeFile(
      path.join(directory, "export-failure.json"),
      JSON.stringify(
        { status: "failed", message: e.message, localArtifactsPreserved: true },
        null,
        2,
      ),
    );
    throw e;
  } finally {
    await browser.close();
    await lease.close();
    await fs.unlink(path.join(directory, ".export.lock"));
  }
}
module.exports = { exportPresentation, readScene, segments, artifactPath };

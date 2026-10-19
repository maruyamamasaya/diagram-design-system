"use strict";
const fs = require("node:fs/promises"),
  path = require("node:path");
const { generatePresentation } = require("./engine.cjs");
async function main() {
  const args = process.argv.slice(2),
    options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (
      ![
        "--input",
        "--output",
        "--font",
        "--browser",
        "--source",
        "--formats",
      ].includes(args[i]) ||
      !args[i + 1]
    )
      throw Error(
        "Use --input JSON [--output directory] [--source Markdown] [--font TTF] [--browser executable]",
      );
    options[args[i].slice(2)] = args[i + 1];
  }
  if (!options.input) throw Error("--input required");
  const input = JSON.parse(await fs.readFile(options.input, "utf8"));
  const result = await generatePresentation(input, {
    output: options.output && path.resolve(options.output),
    fontPath: options.font,
    assetRoot: path.dirname(path.resolve(options.input)),
    browserPath: options.browser || process.env.DIAGRAM_BROWSER,
    exportFormats:
      options.formats === "svg,png"
        ? []
        : options.formats
          ? options.formats
              .split(",")
              .filter((f) => !["svg", "png"].includes(f))
          : undefined,
    sourceFiles: options.source ? { input: options.source } : {},
  });
  console.log(
    JSON.stringify({
      directory: result.directory,
      slides: result.metadata.slides.length,
    }),
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

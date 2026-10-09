"use strict";
const { exportPresentation } = require("./export.cjs");
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--input")
  throw Error("Use --input presentation-package-directory");
exportPresentation(args[1])
  .then((r) => console.log(JSON.stringify(r)))
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });

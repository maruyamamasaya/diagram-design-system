"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const dir = path.resolve(__dirname, "..");
const password = crypto.randomBytes(24).toString("base64url");
const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto.scryptSync(password, salt, 64).toString("hex");
fs.mkdirSync(path.join(dir, ".local"), { recursive: true });
fs.writeFileSync(
  path.join(dir, ".env.local"),
  `VIEWER_ORIGIN=http://127.0.0.1:3000\nVIEWER_STORAGE=mock\nVIEWER_OWNER=local-owner\nVIEWER_PASSWORD_HASH=${salt}:${hash}\nVIEWER_SECRET=${crypto.randomBytes(32).toString("hex")}\nVIEWER_S3_ROLE_ARN=arn:aws:iam::676643701781:role/diagram-design-system-uploader\nVIEWER_AWS_SOURCE_PROFILE=default\n`,
  { flag: "wx", mode: 0o600 },
);
fs.writeFileSync(path.join(dir, ".local", "login.txt"), password + "\n", {
  flag: "wx",
  mode: 0o600,
});
console.log(
  "Local credentials initialized. Read viewer/.local/login.txt; do not publish or commit it.",
);

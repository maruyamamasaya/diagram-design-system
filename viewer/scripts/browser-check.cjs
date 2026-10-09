"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { chromium } = require("../../node_modules/playwright");
const root = path.resolve(__dirname, "../..");
const origin = process.env.VIEWER_TEST_ORIGIN || "http://127.0.0.1:3000";
async function main() {
  const output = path.join(root, "outputs/phase4-validation");
  await fs.mkdir(output, { recursive: true });
  const password = (
    await fs.readFile(path.join(root, "viewer/.local/login.txt"), "utf8")
  ).trim();
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const errors = [];
  const report = {
    mode: process.env.VIEWER_STORAGE || "mock",
    checks: [],
    screenshots: [],
    consoleErrors: errors,
  };
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && !m.text().includes("401"))
        errors.push(m.text().replace(/ticket=[^\s]+/g, "ticket=[REDACTED]"));
    });
    assert.equal(
      (await context.request.get(origin + "/v1/diagrams")).status(),
      401,
    );
    report.checks.push("anonymous API 401");
    await page.goto(origin);
    await page.getByLabel("パスワード", { exact: true }).fill(password);
    await page.getByRole("button", { name: "ログイン", exact: true }).click();
    await page.getByRole("heading", { name: "保存した図解" }).waitFor();
    await page.locator(".thumbnail img").waitFor();
    await page.waitForFunction(
      () => document.querySelector(".thumbnail img")?.naturalWidth > 0,
    );
    await page.screenshot({
      path: path.join(output, "desktop-list.png"),
      fullPage: true,
    });
    report.screenshots.push("desktop-list.png");
    await page.getByLabel("タイトル・タグ検索").fill("コマンド");
    await page.waitForTimeout(400);
    assert.equal(await page.locator(".card").count(), 1);
    await page.getByLabel("図解タイプ").selectOption("architecture");
    await page.getByText("該当する図解がありません。").waitFor();
    await page.getByLabel("図解タイプ").selectOption("roadmap");
    await page.locator(".card").waitFor();
    report.checks.push("tag search and type filter");
    await page.locator(".card").click();
    await page.locator(".canvas img").waitFor();
    await page.waitForFunction(
      () => document.querySelector(".canvas img")?.naturalWidth > 0,
    );
    await page.getByRole("button", { name: "拡大", exact: true }).click();
    assert.equal(await page.getByLabel("ズーム倍率").textContent(), "125%");
    await page.getByRole("button", { name: "全体表示", exact: true }).click();
    await page.screenshot({
      path: path.join(output, "desktop-detail.png"),
      fullPage: true,
    });
    report.screenshots.push("desktop-detail.png");
    await page.getByRole("button", { name: "全画面", exact: true }).click();
    assert.equal(await page.locator(".expanded").count(), 1);
    await page.getByRole("button", { name: "全画面終了" }).click();
    report.checks.push("zoom reset and fullscreen");
    for (const format of ["PNG", "SVG"]) {
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", { name: format + "をダウンロード", exact: true })
        .click();
      const download = await pending;
      const destination = path.join(
        output,
        "downloaded-diagram." + format.toLowerCase(),
      );
      await download.saveAs(destination);
      const expected = await fs.readFile(
        path.join(
          root,
          "outputs/linux-roadmap-final/diagram." + format.toLowerCase(),
        ),
      );
      const bytes = await fs.readFile(destination);
      assert.equal(
        crypto.createHash("sha256").update(bytes).digest("hex"),
        crypto.createHash("sha256").update(expected).digest("hex"),
      );
    }
    report.checks.push("PNG/SVG downloads SHA256");
    await page.getByRole("button", { name: "SVG表示（約13 MB）" }).click();
    await page.waitForFunction(
      () => document.querySelector(".canvas img")?.naturalWidth === 1600,
    );
    report.checks.push("SVG isolated img preview");
    await page.getByRole("button", { name: "ログアウト" }).click();
    await page.getByRole("heading", { name: "ライブラリにログイン" }).waitFor();
    assert.equal(
      (await context.request.get(origin + "/api/web/diagrams")).status(),
      401,
    );
    report.checks.push("logout revokes cookie access");
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const phone = await mobile.newPage();
    await phone.goto(origin);
    await phone.getByLabel("パスワード", { exact: true }).fill(password);
    await phone.getByRole("button", { name: "ログイン", exact: true }).click();
    await phone.locator(".card").waitFor();
    await phone.locator(".thumbnail").scrollIntoViewIfNeeded();
    await phone.waitForFunction(
      () => document.querySelector(".thumbnail img")?.naturalWidth > 0,
    );
    await phone.evaluate(() => scrollTo(0, 0));
    assert.ok(
      await phone.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await phone.screenshot({
      path: path.join(output, "iphone-portrait.png"),
      fullPage: true,
    });
    report.screenshots.push("iphone-portrait.png");
    await phone.locator(".card").click();
    await phone.locator(".canvas img").waitFor();
    await phone.setViewportSize({ width: 844, height: 390 });
    await phone.waitForFunction(
      () => document.querySelector(".canvas img")?.naturalWidth > 0,
    );
    await phone.screenshot({
      path: path.join(output, "iphone-landscape.png"),
      fullPage: true,
    });
    report.screenshots.push("iphone-landscape.png");
    const cdp = await mobile.newCDPSession(phone);
    const rect = await phone.locator(".canvas").boundingBox();
    await phone.locator(".canvas").scrollIntoViewIfNeeded();
    const r = await phone.locator(".canvas").boundingBox();
    const y = r.y + Math.min(r.height / 2, 100),
      x = r.x + r.width / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: x - 40, y, id: 1 },
        { x: x + 40, y, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 50, y, id: 1 },
        { x: x + 50, y, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 90, y, id: 1 },
        { x: x + 90, y, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.notEqual(await phone.getByLabel("ズーム倍率").textContent(), "100%");
    report.checks.push("iPhone-equivalent portrait/landscape and pinch");
    assert.equal(errors.length, 0, errors.join("\n"));
    report.passed = true;
  } finally {
    await browser.close();
    await fs.writeFile(
      path.join(output, `browser-${report.mode}.json`),
      JSON.stringify(report, null, 2) + "\n",
    );
  }
  console.log(
    JSON.stringify(
      { passed: report.passed, checks: report.checks.length, output },
      null,
      2,
    ),
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

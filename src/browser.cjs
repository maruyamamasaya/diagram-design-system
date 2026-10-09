'use strict';
const {chromium} = require('playwright');
async function openBrowser(executablePath) {
  const browser = await chromium.launch({headless: true, args: ['--force-color-profile=srgb','--disable-lcd-text'], ...(executablePath ? {executablePath} : {})});
  const context = await browser.newContext({viewport: {width: 1600, height: 900}, deviceScaleFactor: 2});
  await context.route('**/*', route => route.abort()); // No external resources.
  return {browser, context};
}
async function prepare(page, css) {
  await page.setContent(`<html><head><style>${css}html,body{margin:0;background:white}</style></head><body></body></html>`);
  await page.evaluate(async () => { await document.fonts.load('24px DiagramJP'); await document.fonts.load('24px DiagramMono'); await document.fonts.load('700 28px DiagramJP'); await document.fonts.ready; });
}
module.exports = {openBrowser, prepare};

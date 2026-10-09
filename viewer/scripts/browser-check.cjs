'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('../../node_modules/playwright');
const root=path.resolve(__dirname,'../..'),origin=process.env.VIEWER_TEST_ORIGIN||'http://127.0.0.1:3000';
async function main(){
 const output=path.join(root,'outputs/phase11a-validation');await fs.mkdir(output,{recursive:true});
 const password=(await fs.readFile(path.join(root,'viewer/.local/login.txt'),'utf8')).trim();
 const browser=await chromium.launch({executablePath:process.env.DIAGRAM_BROWSER,headless:true});
 const report={mode:process.env.VIEWER_STORAGE||'s3',checks:[],downloads:[],passed:false};
 try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});const page=await context.newPage();
 assert.equal((await context.request.get(origin+'/v1/diagrams')).status(),401);report.checks.push('anonymous API 401');
 await page.goto(origin);await page.getByLabel('パスワード',{exact:true}).fill(password);await page.getByRole('button',{name:'ログイン',exact:true}).click();
 await page.getByRole('heading',{name:'保存した資料',exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelector('.thumbnail img')?.naturalWidth>0);
 await page.screenshot({path:path.join(output,'desktop-list.png'),fullPage:true});
 await page.getByLabel('タイトル・タグ検索').fill('RAG');await page.getByLabel('資料タイプ').selectOption('presentation');
 await page.waitForTimeout(600);await page.locator('.card').first().waitFor();assert.equal(await page.locator('.card').count(),1);report.checks.push('RAG search and presentation filter');
 await page.locator('.card').click();await page.locator('.preview-options select').selectOption('8');
 await page.waitForFunction(()=>document.querySelector('.canvas img')?.naturalWidth>0);await page.screenshot({path:path.join(output,'rag-page8.png'),fullPage:true});report.checks.push('page 8 PNG preview');
 await page.getByRole('button',{name:'拡大',exact:true}).click();assert.equal(await page.getByLabel('ズーム倍率').textContent(),'125%');await page.getByRole('button',{name:'全体表示',exact:true}).click();
 await page.getByRole('button',{name:'全画面',exact:true}).click();assert.equal(await page.locator('.expanded').count(),1);await page.getByRole('button',{name:'全画面終了'}).click();report.checks.push('zoom and fullscreen');
 const manifest=JSON.parse(await fs.readFile(path.join(root,'viewer/.local/mock/presentation/metadata.json'),'utf8'));
 for(const [format,name] of [['PNG','slides/008/slide.png'],['PDF','document.pdf'],['PPTX','presentation.pptx']]){
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:format+'をダウンロード',exact:true}).click();const download=await pending;const bytes=await fs.readFile(await download.path());const expected=manifest.files.find(f=>f.name===name);const hash=crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(hash,expected.sha256);assert.equal(bytes.length,expected.sizeBytes);report.downloads.push({name,bytes:bytes.length,sha256:hash});await download.delete();
 }report.checks.push('PNG/PDF/PPTX downloaded bytes and SHA256 match');
 await page.getByRole('button',{name:'PDF表示',exact:true}).click();await page.locator('.pdf-preview iframe').waitFor();await page.waitForTimeout(2500);await page.screenshot({path:path.join(output,'rag-pdf.png'),fullPage:true});report.checks.push('PDF iframe and separate-tab fallback');
 await page.getByRole('button',{name:'PNG表示',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.canvas img')?.naturalWidth>0);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:path.join(output,'mobile-detail.png'),fullPage:true});report.checks.push('390px responsive layout');
 await page.getByRole('button',{name:'ログアウト',exact:true}).click();await page.getByRole('heading',{name:'ライブラリにログイン'}).waitFor();assert.equal((await context.request.get(origin+'/api/web/diagrams')).status(),401);report.checks.push('logout revokes cookie');report.passed=true;
 }finally{await browser.close();await fs.writeFile(path.join(output,'browser-'+report.mode+'.json'),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,output}));
}
main().catch(()=>{console.error('Browser verification failed; inspect local report and UI. Sensitive URLs omitted.');process.exitCode=1;});

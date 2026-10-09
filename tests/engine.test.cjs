'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {validateInput}=require('../src/model.cjs');
const {loadRules}=require('../src/rules.cjs');
const {loadFont}=require('../src/font.cjs');
const {openBrowser}=require('../src/browser.cjs');
const {generate}=require('../src/engine.cjs');
const {saveArtifacts}=require('../src/storage.cjs');
const sample=require('../examples/linux-roadmap/input.json');

test('schema rejects unknown fields, empty/duplicate IDs, broken/inferred relations and controls',()=>{
  assert.equal(validateInput(sample),sample);
  for(const mutate of [x=>x.unrecognized=true,x=>x.title=' ',x=>x.steps[1].id=x.steps[0].id,x=>x.relations=[],x=>x.relations[0].to='unknown',x=>x.relations[0].to='L3',x=>x.relations[1]=x.relations[0],x=>x.title='bad\u0001',x=>x.steps.push(x.steps[0])]) {
    const input=structuredClone(sample);mutate(input);assert.throws(()=>validateInput(input));
  }
  assert.throws(()=>validateInput(sample,'architecture'),/Unsupported/);
});

test('storage is pluggable and generation artifacts stay independent of paths',async()=>{
  const written=new Map();
  await saveArtifacts({svg:Buffer.from('<svg/>'),png:Buffer.from('test'),input:sample,report:{}},{async write(name,bytes){written.set(name,bytes);}});
  assert.deepEqual([...written.keys()],['diagram.svg','diagram.png','input.json','validation.json']);
  assert.deepEqual(JSON.parse(written.get('input.json')),sample);
});

test('real SVG rendering: Japanese, original commands, XML escaping, bounds and overflow',async()=>{
  const fontPath=process.env.DIAGRAM_FONT||(process.platform==='win32'?'C:/Windows/Fonts/NotoSansJP-VF.ttf':null);
  assert.ok(fontPath,'Set DIAGRAM_FONT to an OFL Japanese TTF/OTF');
  const rules=await loadRules(path.resolve(__dirname,'..'));
  const font=await loadFont(fontPath,['日本語検証基本操作関連項目到達条件<>&"']);
  const codeFont=await loadFont(path.resolve(__dirname,'../assets/fonts/NotoSansMono-Regular.ttf'),['pwd / ls / cd mkdir mv chmod chown ps top unbreakable_command_'],'DiagramMono');
  const {browser,context}=await openBrowser(process.env.DIAGRAM_BROWSER);
  try {
    const input=structuredClone(sample);input.title='<日本語 & SVG> "検証"';
    const artifacts=await generate(input,{rules,font,codeFont,context});
    assert.match(artifacts.svg.toString(),/&lt;日本語 &amp; SVG&gt;/);
    assert.match(artifacts.svg.toString(),/pwd \/ ls \/ cd/);
    assert.deepEqual(artifacts.report.dimensions.png,[3200,1800]);
    assert.equal(artifacts.report.checks.renderedTextBounds,'合格');
    assert.equal(artifacts.report.checks.visualReview,'未検証');
    assert.equal(artifacts.report.mapping.length,4);
    const dense=structuredClone(sample);dense.steps[0].purpose='とても長い入力'.repeat(150);
    await assert.rejects(()=>generate(dense,{rules,font,codeFont,context}),/exceeds canvas/);
    const token=structuredClone(sample);token.steps[0].items[0].text='unbreakable_command_'.repeat(20);
    await assert.rejects(()=>generate(token,{rules,font,codeFont,context}),/Unbreakable token/);
    const single=structuredClone(sample);single.steps=single.steps.slice(0,1);single.relations=[];
    assert.equal((await generate(single,{rules,font,codeFont,context})).report.mapping.length,1);
    await assert.rejects(()=>loadFont(fontPath,['\u{10ffff}']),/missing glyphs/);
  } finally {await browser.close();}
});

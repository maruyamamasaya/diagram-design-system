'use strict';
const {validateInput} = require('./model.cjs');
const {prepare} = require('./browser.cjs');
const {PNG} = require('pngjs');
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const round = n => Math.round(n * 100) / 100;

// Produces only in-memory artifacts. No path, filesystem or storage dependency.
async function generate(input, {template = 'roadmap', rules, font, codeFont, context}) {
  validateInput(input, template);
  const t = rules.tokens, c = rules.colors;
  const page = await context.newPage();
  try {
    await page.setViewportSize({width: t.width, height: t.height});
    if(!codeFont) throw new Error('An OFL code font is required.');
    await prepare(page, font.css+codeFont.css);
    const blocks = [], cards = [], edges = [], body = [];
    const snap = n => Math.ceil(n / t.grid) * t.grid;
    const columnWidth = Math.floor(((t.width - 2*t.margin - (input.steps.length-1)*t.gap) / input.steps.length) / t.grid)*t.grid;
    const innerWidth = columnWidth - 2*t.padding;
    async function wrap(text, width, size, bold = false, code = false) {
      return page.evaluate(({text,width,size,bold,code}) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `${bold?'700':'400'} ${size}px ${code?'DiagramMono':'DiagramJP'}`;
        const cell = code ? ctx.measureText('M').width : 0;
        const measure = s => code ? Array.from(s).length * cell : ctx.measureText(s).width;
        const lines = [];
        for (const paragraph of text.split('\n')) {
          let line = '';
          // Code wraps only at spaces: commands/options remain intact.
          const units = code ? paragraph.match(/\S+\s*|\s+/gu) || [''] : Array.from(paragraph);
          for (const unit of units) {
            if (measure(unit) > width) throw new Error('Unbreakable token exceeds available width; split input or shorten with explicit user approval.');
            if (line && measure(line+unit) > width) { lines.push(line); line = ''; }
            line += unit;
          }
          lines.push(line);
        }
        const ns='http://www.w3.org/2000/svg';
        const svg=document.createElementNS(ns,'svg');
        const probe=document.createElementNS(ns,'text');
        probe.setAttribute('font-family',code?'DiagramMono':'DiagramJP');probe.setAttribute('font-size',String(size));probe.setAttribute('font-weight',bold?'700':'400');
        probe.textContent=text.replace(/\n/g,' ')||'国';svg.append(probe);document.body.append(svg);
        const bounds=probe.getBBox();const ascent=-bounds.y;const glyphHeight=bounds.height;svg.remove();
        return {lines, cell, ascent, glyphHeight};
      }, {text,width,size,bold,code});
    }
    async function block(id, text, x, y, width, size, {bold=false, code=false, owner=null, muted=false}={}) {
      (code?codeFont:font).ensureGlyphs(text);
      const layout = await wrap(text,width,size,bold,code);
      const lineHeight = Math.max(size*t.lineHeight,layout.glyphHeight+t.grid/2);
      const height = layout.lines.length * lineHeight;
      blocks.push({id, original:text, lines:layout.lines, x, y, width, height, owner, size, lineHeight});
      const spans = layout.lines.map((line,i) => {
        const xs = code ? Array.from(line).map((_,j)=>round(x+j*layout.cell)).join(' ') : round(x);
        return `<tspan x="${xs}" y="${round(y+layout.ascent+i*lineHeight)}">${escape(line)}</tspan>`;
      }).join('');
      body.push(`<text id="${escape(id)}" class="${code?'code':'prose'}" font-size="${size}" font-weight="${bold?700:400}" fill="${muted?c.muted:c.ink}" xml:space="preserve">${spans}</text>`);
      return height;
    }
    const titleHeight = await block('title',input.title,t.margin,t.margin,t.width-2*t.margin,t.titleSize,{bold:true});
    if (titleHeight > t.titleHeight) throw new Error('Title exceeds reserved title area.');
    let headerY = t.margin+t.titleHeight+t.titleGap;
    const headerWidth=(t.width-2*t.margin-t.gap)/2;
    const purposeHeight=await block('purpose',`目的：${input.purpose}`,t.margin,headerY,headerWidth,t.noteSize,{muted:true});
    const audienceHeight=await block('audience',`対象：${input.audience}`,t.margin+headerWidth+t.gap,headerY,headerWidth,t.noteSize,{muted:true});
    headerY += Math.max(purposeHeight,audienceHeight);
    const cardY = snap(headerY+t.padding);
    const extent=(layout,size)=>layout.lines.length*Math.max(size*t.lineHeight,layout.glyphHeight+t.grid/2);
    const maxima={title:0,purpose:0,items:0,outcome:0};
    for(const s of input.steps) {
      maxima.title=Math.max(maxima.title,extent(await wrap(s.title,innerWidth,t.headingSize,true),t.headingSize));
      maxima.purpose=Math.max(maxima.purpose,extent(await wrap(s.purpose,innerWidth,t.bodySize),t.bodySize));
      let itemHeight=0;
      for(const item of s.items) itemHeight+=extent(await wrap(item.text,innerWidth,t.bodySize,false,item.kind==='code'),t.bodySize);
      maxima.items=Math.max(maxima.items,itemHeight);
      if(s.outcome) maxima.outcome=Math.max(maxima.outcome,extent(await wrap(s.outcome,innerWidth,t.bodySize),t.bodySize));
    }
    const cardParts = [];
    let maxHeight = 0;
    for (const [i,s] of input.steps.entries()) {
      const x = t.margin+i*(columnWidth+t.gap), owner = `step-${s.id}`;
      let y = cardY+t.padding;
      const startIndex = body.length;
      y += await block(`${owner}-number`,`STEP ${String(i+1).padStart(2,'0')}`,x+t.padding,y,innerWidth,t.noteSize,{owner,muted:true});
      y += t.grid;
      await block(`${owner}-title`,s.title,x+t.padding,y,innerWidth,t.headingSize,{owner,bold:true});
      y += maxima.title;
      y += t.padding;
      await block(`${owner}-purpose`,s.purpose,x+t.padding,y,innerWidth,t.bodySize,{owner});
      y += maxima.purpose;
      y += t.padding;
      y += await block(`${owner}-items-label`,'関連項目',x+t.padding,y,innerWidth,t.noteSize,{owner,muted:true});
      const itemsY=y;
      for (const [j,item] of s.items.entries()) y += await block(`${owner}-item-${j}`,item.text,x+t.padding,y,innerWidth,t.bodySize,{owner,code:item.kind==='code'});
      y=itemsY+maxima.items;
      if (s.outcome) {
        y += t.padding;
        y += await block(`${owner}-outcome-label`,'到達条件',x+t.padding,y,innerWidth,t.noteSize,{owner,muted:true});
        await block(`${owner}-outcome`,s.outcome,x+t.padding,y,innerWidth,t.bodySize,{owner});
        y += maxima.outcome;
      }
      maxHeight = Math.max(maxHeight,snap(y-cardY+t.padding));
      cards.push({id:owner,inputId:s.id,x,y:cardY,width:columnWidth,height:0});
      cardParts.push(body.splice(startIndex));
    }
    for (const [i,card] of cards.entries()) {
      card.height = maxHeight;
      body.push(`<rect id="${card.id}" x="${card.x}" y="${card.y}" width="${card.width}" height="${card.height}" rx="${t.radius}" fill="${c.panel}" stroke="${c.line}" stroke-width="${t.stroke}"/>`,...cardParts[i]);
    }
    let labelHeight = 0;
    for (const [i,r] of input.relations.entries()) {
      const from = cards[input.steps.findIndex(s=>s.id===r.from)], to = cards[input.steps.findIndex(s=>s.id===r.to)];
      const x1=from.x+from.width, x2=to.x, y=cardY+maxHeight/2;
      body.push(`<path id="relation-${i}" d="M ${x1} ${y} L ${x2} ${y}" fill="none" stroke="${c.ink}" stroke-width="${t.stroke}" marker-end="url(#arrow)"/>`);
      edges.push({id:`relation-${i}`, ...r, x1,x2,y});
      const labelWidth=columnWidth-t.padding;
      const center=(x1+x2)/2;
      labelHeight=Math.max(labelHeight,await block(`relation-${i}-label`,r.label,center-labelWidth/2,cardY+maxHeight+t.clearance,labelWidth,t.bodySize,{muted:true}));
    }
    let footerY=snap(cardY+maxHeight+t.clearance+labelHeight+t.grid);
    const noteLines=[...input.notes,...(input.sources||[]).map(s=>`出典：${s.label} — ${s.reference}`)];
    for (const [i,n] of noteLines.entries()) footerY += await block(`note-${i}`,n,t.margin,footerY,t.width-2*t.margin,t.noteSize,{muted:true});
    if (footerY > t.height-t.margin || cards.some(card=>card.y+card.height > t.height-t.margin-t.footerReserve)) throw new Error(`Content exceeds canvas; split input into pages. Nothing was omitted or shrunk. (cardY=${cardY}, height=${maxHeight}, footer=${footerY})`);
    const licenses=escape(JSON.stringify({prose:font.info,code:codeFont.info}));
    const svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${t.width}" height="${t.height}" viewBox="0 0 ${t.width} ${t.height}" role="img" aria-labelledby="svg-title"><title id="svg-title">${escape(input.title)}</title><metadata>${licenses}</metadata><defs><style>${font.css}${codeFont.css}text{font-family:DiagramJP;white-space:pre}text.code{font-family:DiagramMono}</style><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L8 4 L0 8 Z" fill="${c.ink}"/></marker></defs><rect width="${t.width}" height="${t.height}" fill="#FFFFFF"/>${body.join('')}</svg>`;

    // Render the actual standalone SVG as an image; measure the same SVG inline.
    await page.setContent(`<style>body{margin:0;background:white}</style>${svg.replace(/^<\?xml[^>]+>/,'')}`);
    await page.evaluate(async()=>{await document.fonts.load('24px DiagramJP'); await document.fonts.load('24px DiagramMono');await document.fonts.load('700 28px DiagramJP');await document.fonts.ready;});
    const measured = await page.evaluate(() => Array.from(document.querySelectorAll('text')).map(el=>{const b=el.getBBox();return {id:el.id,text:el.textContent,x:b.x,y:b.y,width:b.width,height:b.height};}));
    const problems=[];
    const within=(a,b,tolerance=0.75)=>a.x>=b.x-tolerance&&a.y>=b.y-tolerance&&a.x+a.width<=b.x+b.width+tolerance&&a.y+a.height<=b.y+b.height+tolerance;
    for (const b of measured) {
      const planned=blocks.find(v=>v.id===b.id);
      if(b.text!==planned.original.replace(/\n/g,'')) problems.push(`${b.id}: input text changed during rendering`);
      const region=planned.owner?cards.find(v=>v.id===planned.owner):{x:t.margin,y:t.margin,width:t.width-2*t.margin,height:t.height-2*t.margin};
      const inner=planned.owner?{x:region.x+t.padding,y:region.y+t.padding,width:region.width-2*t.padding,height:region.height-2*t.padding}:region;
      if (!within(b,inner)) problems.push(`${b.id}: rendered bounds exceed region`);
    }
    const overlaps=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>0.75&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>0.75;
    for(let i=0;i<measured.length;i++) for(let j=i+1;j<measured.length;j++) if(overlaps(measured[i],measured[j])) problems.push(`${measured[i].id} overlaps ${measured[j].id}`);
    for(const card of cards) {
      if(!within(card,{x:t.margin,y:t.margin,width:t.width-2*t.margin,height:t.height-2*t.margin})) problems.push(`${card.id}: card exceeds canvas`);
      for(const b of measured) if(!blocks.find(v=>v.id===b.id).owner&&overlaps(b,card)) problems.push(`${b.id} overlaps ${card.id}`);
    }
    for(let i=0;i<cards.length;i++) for(let j=i+1;j<cards.length;j++) if(overlaps(cards[i],cards[j])) problems.push(`${cards[i].id} overlaps ${cards[j].id}`);
    for(const edge of edges) for(const b of measured) if(overlaps({x:edge.x1,y:edge.y-t.stroke/2,width:edge.x2-edge.x1,height:t.stroke},b)) problems.push(`${edge.id} crosses ${b.id}`);
    const imagePage=await context.newPage();
    let png;
    try {
      await imagePage.setViewportSize({width:t.width,height:t.height});
      await imagePage.setContent('<style>html,body{margin:0;background:white}img{display:block}</style><img alt="Generated SVG"/>');
      await imagePage.locator('img').evaluate(async(el,source)=>{el.src=`data:image/svg+xml;base64,${source}`;await el.decode();},Buffer.from(svg).toString('base64'));
      png=await imagePage.locator('img').screenshot({type:'png',animations:'disabled'});
    } finally { await imagePage.close(); }
    const decoded=PNG.sync.read(png);
    if(decoded.width!==t.width*2||decoded.height!==t.height*2) problems.push('Unexpected PNG size.');
    let monochrome=true;
    for(let i=0;i<decoded.data.length;i+=4) if(decoded.data[i]!==decoded.data[i+1]||decoded.data[i]!==decoded.data[i+2]||decoded.data[i+3]!==255){monochrome=false;break;}
    if(!monochrome) problems.push('PNG is not opaque monochrome.');
    if(problems.length) throw new Error(`Rendered validation failed: ${problems.join('; ')}`);
    const report={generatedAt:new Date().toISOString(),template,schemaVersion:input.schemaVersion,dimensions:{svg:[t.width,t.height],png:[decoded.width,decoded.height]},renderer:`Playwright Chromium ${context.browser().version()}`,font:font.info,codeFont:codeFont.info,ruleHashes:rules.hashes,
      mapping:cards.map(card=>({inputId:card.inputId,elementId:card.id})),relations:edges,layout:{cards,textBounds:measured},
      fieldMapping:blocks.map(b=>({elementId:b.id,original:b.original,renderedLines:b.lines})),
      checks:{schema:'合格',glyphCoverage:'合格',originalTextPreserved:'合格',renderedTextBounds:'合格',textOverlaps:'合格',cardBoundsAndOverlaps:'合格',connectionsAvoidText:'合格',pngDecodeAndDimensions:'合格',opaqueMonochrome:'合格',inputFacts:'未検証',visualReview:'未検証',pptxEditing:'対象外'},
      deviations:[...new Set(blocks.filter(b=>b.lineHeight>b.size*t.lineHeight).map(b=>`Font metrics require line height ${round(b.lineHeight)} for font size ${b.size}; increased from recommended ${round(b.size*t.lineHeight)} to prevent overlaps.`))],
      warnings:blocks.filter(b=>b.owner&&b.size===t.bodySize&&b.lines.length>5).map(b=>`${b.id}: more than five lines; consider splitting`),
      limitations:['Roadmap only; one page, 1–4 sequential steps. Parallel/optional phases unsupported.', 'PDF/PPTX not implemented.', 'Automated checks do not verify factual accuracy or human readability.']};
    return {svg:Buffer.from(svg),png,report,input:structuredClone(input)};
  } finally { await page.close(); }
}
module.exports={generate,escape};

"use strict";
const { escape } = require('../engine.cjs');
const profile = require('../../config/graphic-profile.json');
async function drawGraphic({slide,t,c,text,card,body,assets,imageBoxes,page}) {
  const s=slide.content, m=t.margin, w=t.width-2*m, p=profile;
  const kind=slide.templateId.split('.')[2];
  await text('heading',s.heading,m,m,w,t.titleSize,1,true);
  const label=(id,value,x,y,width,lines=2)=>text(id,value,x,y,width,t.headingSize,lines,true);
  const para=(id,value,x,y,width,lines=4)=>text(id,value,x,y,width,t.bodySize,lines);
  const note=(id,value,x,y,width,lines=2)=>text(id,value,x,y,width,t.noteSize,lines);
  const rule=(id,x,y,width)=>body.push(`<path id="${id}" d="M${x} ${y}h${width}" stroke="${c.line}" stroke-width="1" fill="none"/>`);
  const arrow=(id,x,y,width)=>body.push(`<path id="${id}" d="M${x} ${y}h${width}m-10 -6l10 6 -10 6" stroke="${c.ink}" stroke-width="2" fill="none"/>`);
  async function image(slot,x,y,width,height,id) {
    const asset=assets.get(slot.assetId);
    const uri=`data:${asset.mime};base64,${asset.bytes.toString('base64')}`;
    const size=await page.evaluate(async src=>{const im=new Image();im.src=src;await im.decode();return {width:im.naturalWidth,height:im.naturalHeight};},uri);
    if (!size.width || !size.height || size.width*size.height>40_000_000) throw Error('Invalid image dimensions');
    const scale=Math.min(width/size.width,height/size.height), iw=size.width*scale, ih=size.height*scale;
    const box={id,x:x+(width-iw)/2,y:y+(height-ih)/2,w:iw,h:ih};
    imageBoxes.push(box);
    body.push(`<image id="${id}" x="${box.x}" y="${box.y}" width="${iw}" height="${ih}" href="${uri}" aria-label="${escape(asset.alt)}" preserveAspectRatio="xMidYMid meet"><title>${escape(asset.alt)}</title></image>`);
    return `${asset.kind==='generated'?'生成画像・説明用：':''}${slot.caption} [${asset.referenceId}]`;
  }
  if(kind==='structure') {
    const cw=(w-(s.nodes.length-1)*p.columnGap)/s.nodes.length;
    for(let i=0;i<s.nodes.length;i++) {
      const n=s.nodes[i],x=m+i*(cw+p.columnGap);
      card(`node-${n.id}`,x,p.nodeTop,cw,p.nodeHeight,t.padding,false);
      await note(`boundary-${i}`,n.boundary,x+t.padding,p.nodeTop+t.padding,cw-2*t.padding,1);
      await label(`node-label-${i}`,n.label,x+t.padding,p.nodeTop+52,cw-2*t.padding,1);
      await para(`node-detail-${i}`,n.detail,x+t.padding,p.nodeTop+104,cw-2*t.padding,3);
      if(i<s.connections.length) {
        const edge=s.connections[i];
        arrow(`edge-${i}`,x+cw+8,p.nodeTop+84,p.columnGap-16);
        await label(`edge-label-${i}`,edge.label,x,p.edgeTop,cw,1);
        await para(`edge-condition-${i}`,edge.condition,x,p.edgeTop+52,cw,2);
      }
    }
    await para('context',s.context,m,p.contextTop,w,4);
  } else if(kind==='process') {
    const cw=(w-(s.steps.length-1)*p.columnGap)/s.steps.length;
    for(let i=0;i<s.steps.length;i++) {
      const n=s.steps[i],x=m+i*(cw+p.columnGap);
      await label(`step-${i}`,`${i+1}. ${n.label}`,x,p.bodyTop,cw,1);
      await para(`actor-${i}`,n.actor,x,232,cw,2);
      rule(`step-rule-${i}`,x,306,cw);
      await para(`action-${i}`,n.action,x,330,cw,5);
      await label(`result-label-${i}`,'結果',x,508,cw,1);
      await para(`result-${i}`,n.result,x,560,cw,3);
      if(i<s.steps.length-1) arrow(`edge-${i}`,x+cw+8,190,p.columnGap-16);
    }
    await note('exception',s.exception,m,666,w,2);
  } else if(kind==='cause') {
    const cw=(w-p.columnGap)/2;
    await label('trigger',s.trigger,m,168,w,1);
    // A common trigger splits into two explicit conditions; arrows terminate above branch labels.
    const mid=t.width/2,y=242;
    for(let i=0;i<2;i++) {
      const x=m+i*(cw+p.columnGap),cx=x+cw/2,b=s.branches[i];
      body.push(`<path id="branch-${i}" d="M${mid} 220V${y}H${cx}V276m-6 -10l6 10 6 -10" stroke="${c.ink}" stroke-width="2" fill="none"/>`);
      await label(`condition-${i}`,b.condition,x,296,cw,1);
      await para(`effect-${i}`,b.result,x,354,cw,3);
      rule(`branch-rule-${i}`,x,458,cw);
      await para(`intervention-${i}`,b.intervention,x,482,cw,4);
      await note(`remaining-${i}`,b.remaining,x,622,cw,3);
    }
  } else if(kind==='comparison') {
    const axis=240,cw=(w-axis-p.columnGap)/2;
    await label('left-label',s.leftLabel,m+axis,168,cw,1);
    await label('right-label',s.rightLabel,m+axis+cw+p.columnGap,168,cw,1);
    const rowHeight=104;
    for(let i=0;i<s.axes.length;i++) {
      const row=s.axes[i],y=238+i*rowHeight;
      rule(`axis-rule-${i}`,m,y,w);
      await note(`axis-${i}`,row.axis,m,y+16,axis-24,2);
      await para(`left-${i}`,row.left,m+axis,y+16,cw,2);
      await para(`right-${i}`,row.right,m+axis+cw+p.columnGap,y+16,cw,2);
    }
    await note('conditions',s.conditions,m,676,w,2);
  } else if(kind==='evidence') {
    const cap=await image(s.image,m,p.bodyTop,p.imageWidth,p.imageHeight,'evidence-image');
    await note('image-caption',cap,m,584,p.imageWidth,2);
    await para('image-reading',s.image.reading,m,648,p.imageWidth,2);
    const x=m+p.imageWidth+p.imageGap,cw=w-p.imageWidth-p.imageGap;
    await para('explanation',s.explanation,x,p.bodyTop,cw,12);
    await para('context',s.context,x,568,cw,4);
  } else if(kind==='evidence-pair') {
    const cw=(w-p.pairGap)/2;
    for(let i=0;i<2;i++) {
      const im=s.images[i],x=m+i*(cw+p.pairGap);
      const cap=await image(im,x,p.bodyTop,cw,p.pairImageHeight,`evidence-image-${i}`);
      await note(`image-caption-${i}`,cap,x,p.pairCaptionTop,cw,2);
      await para(`image-reading-${i}`,im.reading,x,p.pairReadingTop,cw,2);
    }
    await para('comparison',s.comparison,m,p.pairComparisonTop,w,2);
    await note('conditions',s.conditions,m,p.pairConditionsTop,w,1);
  } else throw Error('Unregistered graphic layout');
  const takeawayTop=kind==='evidence-pair'?p.pairTakeawayTop:p.takeawayTop;
  rule('takeaway-rule',m,takeawayTop-16,w);
  await para('takeaway',s.takeaway,m,takeawayTop,w,2);
}
module.exports={drawGraphic};

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Ajv=require('ajv');
const schema=require('../schemas/metadata-package.schema.json');
const ajv=new Ajv({strict:true,allErrors:true});
ajv.addFormat('date-time',s=>!Number.isNaN(Date.parse(s)));
const validate=ajv.compile(schema);
const names=schema.properties.artifacts.items.properties.name.enum;
function fixture(){return {schemaVersion:'2.0',diagramId:'12345678-1234-4234-8234-123456789abc',version:1,title:'図解',diagramType:'roadmap',createdAt:'2026-10-09T00:00:00.000Z',updatedAt:'2026-10-09T00:00:00.000Z',selection:'standard',targetNames:['source.json','metadata.json','validation.json','diagram.svg','diagram.png'],packageStatus:'incomplete',artifacts:names.map(name=>({name,support:'supported',status:'pending',integrity:name==='metadata.json'?'external':'sha256'}))};}
test('package design schema enforces inventory, integrity and failure evidence',()=>{
 const m=fixture(); assert.ok(validate(m),JSON.stringify(validate.errors));
 const svg=m.artifacts.find(x=>x.name==='diagram.svg');
 svg.status='verified'; assert.equal(validate(m),false);
 Object.assign(svg,{sizeBytes:42,sha256:'a'.repeat(64),dependencySha256:'b'.repeat(64)}); assert.ok(validate(m));
 for(const mutate of [x=>x.artifacts.pop(),x=>x.artifacts[0]=x.artifacts[1],x=>x.artifacts.find(a=>a.name==='metadata.json').sha256='a'.repeat(64),x=>x.artifacts[0].status='failed',x=>x.targetNames=['diagram.svg','diagram.png','metadata.json']]){
  const bad=structuredClone(m);mutate(bad);assert.equal(validate(bad),false);
 }
 const failed=fixture();Object.assign(failed.artifacts[0],{status:'failed',reason:'renderer unavailable'});assert.ok(validate(failed));
 const unsupported=fixture();Object.assign(unsupported.artifacts[0],{support:'unsupported',status:'unsupported',reason:'not implemented'});assert.ok(validate(unsupported));
});

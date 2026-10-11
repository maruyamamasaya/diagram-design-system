'use strict';
const {createIllustration}=require('./create.cjs');
(async()=>{
 const args=process.argv.slice(2),opts={};
 for(let i=0;i<args.length;i++){if(!['--input','--out','--font','--browser'].includes(args[i])||!args[i+1])throw Error('Use --input job.json [--out outputs] [--font font.ttf] [--browser chromium]');opts[args[i].slice(2)]=args[++i];}
 if(!opts.input)throw Error('--input required; see prompts/illustration.md');
 const result=await createIllustration(opts.input,{out:opts.out,fontPath:opts.font,browserPath:opts.browser});console.log(JSON.stringify({directory:result.directory,checks:result.validation.checks}));
})().catch(e=>{console.error(e.message);process.exitCode=1});

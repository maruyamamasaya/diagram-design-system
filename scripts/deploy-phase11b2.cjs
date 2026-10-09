'use strict';
// Explicitly invoked deployment of the reviewed Phase 11B-2 stack. Never log credentials/parameters.
const fs=require('node:fs/promises'),crypto=require('node:crypto');
const {fromNodeProviderChain}=require('@aws-sdk/credential-providers');
const {SignatureV4}=require('@smithy/signature-v4');
const {S3Client,PutObjectCommand}=require('@aws-sdk/client-s3');
class Hash{constructor(algorithm,secret){this.algorithm=algorithm;this.secret=secret;this.reset();}reset(){this.hash=this.secret?crypto.createHmac(this.algorithm,this.secret):crypto.createHash(this.algorithm);}update(x){this.hash.update(x);}async digest(){return this.hash.digest();}}
const credentials=fromNodeProviderChain({profile:'diagram-design-system-signin'}),region='ap-northeast-1';
async function query(service,values){const hostname=`${service}.${region}.amazonaws.com`,body=new URLSearchParams(values).toString();const signed=await new SignatureV4({credentials,region,service,sha256:Hash.bind(null,'sha256')}).sign({method:'POST',protocol:'https:',hostname,path:'/',headers:{host:hostname,'content-type':'application/x-www-form-urlencoded'},body});const r=await fetch(`https://${hostname}/`,{method:'POST',headers:signed.headers,body});const text=await r.text();if(!r.ok)throw Error(text.match(/<Code>([^<]+)/)?.[1]||'AWSRequestFailed');return text;}
async function main(){const mode=process.argv[2];await fs.mkdir('outputs/phase11b2',{recursive:true});
if(mode==='delete-failed'){
 const xml=await query('cloudformation',{Action:'DescribeStacks',Version:'2010-05-15',StackName:'diagram-library-api'});if(!xml.includes('<StackStatus>ROLLBACK_COMPLETE</StackStatus>'))throw Error('CleanupRequiresRollbackComplete');
 await query('cloudformation',{Action:'DeleteStack',Version:'2010-05-15',StackName:'diagram-library-api'});console.log('Failed new stack cleanup submitted.');
}else if(mode==='create'){
 const identity=await query('sts',{Action:'GetCallerIdentity',Version:'2011-06-15'});if(!identity.includes('<Account>676643701781</Account>'))throw Error('AccountMismatch');
 const template=await fs.readFile('infra/phase11b2-api.proposed.json','utf8');await query('cloudformation',{Action:'ValidateTemplate',Version:'2010-05-15',TemplateBody:template});
 const bytes=await fs.readFile('outputs/phase11b2/lambda.zip'),hash=crypto.createHash('sha256').update(bytes).digest('hex'),key=`deployments/api/${hash}.zip`;
 const s3=new S3Client({region,credentials});await s3.send(new PutObjectCommand({Bucket:'diagram-design-system-676643701781-apne1',ExpectedBucketOwner:'676643701781',Key:key,Body:bytes,ServerSideEncryption:'AES256',IfNoneMatch:'*'})).catch(e=>{if(e.name!=='PreconditionFailed')throw e;});s3.destroy();
 const values={Action:'CreateStack',Version:'2010-05-15',StackName:'diagram-library-api',TemplateBody:template,'Capabilities.member.1':'CAPABILITY_IAM','Parameters.member.1.ParameterKey':'CodeKey','Parameters.member.1.ParameterValue':key,'Parameters.member.2.ParameterKey':'CursorSecret','Parameters.member.2.ParameterValue':crypto.randomBytes(48).toString('hex'),'Tags.member.1.Key':'Project','Tags.member.1.Value':'diagram-design-system'};
 const result=await query('cloudformation',values);await fs.writeFile('outputs/phase11b2/deployment.json',JSON.stringify({region,account:'676643701781',stackName:'diagram-library-api',stackId:result.match(/<StackId>([^<]+)/)?.[1],codeKey:key,owner:'UNCONFIGURED',createdAt:new Date().toISOString()},null,2));console.log('Stack creation submitted; owner remains deny-all.');
}else if(mode==='status'){
 const xml=await query('cloudformation',{Action:'DescribeStacks',Version:'2010-05-15',StackName:'diagram-library-api'});const status=xml.match(/<StackStatus>([^<]+)/)?.[1];const outputBlock=xml.match(/<Outputs>([\s\S]*?)<\/Outputs>/)?.[1]||'';const outputs={};for(const member of outputBlock.matchAll(/<member>([\s\S]*?)<\/member>/g)){const k=member[1].match(/<OutputKey>([^<]+)/)?.[1],v=member[1].match(/<OutputValue>([^<]+)/)?.[1];if(k&&v)outputs[k]=v;}
 await fs.writeFile('outputs/phase11b2/deployment-status.json',JSON.stringify({checkedAt:new Date().toISOString(),status,outputs},null,2));console.log(JSON.stringify({status,outputs}));
 if(status?.includes('FAILED')||status?.includes('ROLLBACK')){const events=await query('cloudformation',{Action:'DescribeStackEvents',Version:'2010-05-15',StackName:'diagram-library-api'});for(const m of events.matchAll(/<member>([\s\S]*?)<\/member>/g)){if(m[1].includes('CREATE_FAILED'))console.log(m[1].match(/<LogicalResourceId>([^<]+)/)?.[1],m[1].match(/<ResourceStatusReason>([^<]+)/)?.[1]);}}
}else throw Error('Use create or status');}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

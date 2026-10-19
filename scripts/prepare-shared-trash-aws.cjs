'use strict';
// Offline only: consumes reviewed read-only snapshots, writes unapplied proposals.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),input=path.join(root,'outputs/shared-trash-readiness'),out=path.join(root,'infra');
const bucket='diagram-design-system-676643701781-apne1',arn=`arn:aws:s3:::${bucket}`;
const lambda='arn:aws:iam::676643701781:role/diagram-library-api-Role-kKDOVnaoMyam',uploader='arn:aws:iam::676643701781:role/diagram-design-system-uploader';
const read=name=>JSON.parse(fs.readFileSync(path.join(input,name),'utf8'));
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
const bucketPolicy=read('bucket-policy-before.json');
const overwrite=bucketPolicy.Statement.find(s=>s.Sid==='DenyLibraryOverwrites');
if(overwrite?.Condition?.ArnNotEquals?.['aws:PrincipalArn']!==lambda)throw Error('Unexpected existing overwrite policy');
overwrite.Condition.ArnNotEquals['aws:PrincipalArn']=[lambda,uploader];
const cas=bucketPolicy.Statement.find(s=>s.Sid==='DenyOrganizationCASOutsideFixedKey');
if(typeof cas?.NotResource!=='string'||!cas.NotResource.includes('/library/organization/v1/')||!cas.NotResource.endsWith('/state.json'))throw Error('Unexpected organization key');
const fixedOrganizationKey=cas.NotResource;
cas.NotResource=[fixedOrganizationKey,`${arn}/library/lifecycle/*`,`${arn}/library/document-locks/*`];
bucketPolicy.Statement.push(
 {Sid:'DenyUploaderCASOutsideDocumentLocks',Effect:'Deny',Principal:{AWS:uploader},Action:'s3:PutObject',NotResource:`${arn}/library/document-locks/*`,Condition:{Null:{'s3:if-none-match':'true'}}},
 {Sid:'DenyUnconditionalLifecycleWrites',Effect:'Deny',Principal:{AWS:[lambda,uploader]},Action:'s3:PutObject',Resource:[`${arn}/library/lifecycle/*`,`${arn}/library/document-locks/*`],Condition:{Null:{'s3:if-none-match':'true','s3:if-match':'true'}}}
);
const policy=Statement=>({Version:'2012-10-17',Statement});
const lambdaPolicy=policy([
 {Effect:'Allow',Action:'s3:GetBucketVersioning',Resource:arn},
 {Effect:'Allow',Action:'s3:ListBucket',Resource:arn,Condition:{StringLike:{'s3:prefix':['library/lifecycle/*','library/document-locks/*','library/diagrams/*']}}},
 {Effect:'Allow',Action:['s3:GetObject','s3:PutObject'],Resource:[`${arn}/library/lifecycle/*`,`${arn}/library/document-locks/*`]},
 {Effect:'Allow',Action:'s3:DeleteObject',Resource:[`${arn}/library/diagrams/*`,`${arn}/library/catalog/*`]}
]);
const uploaderPolicy=policy([
 {Effect:'Allow',Action:'s3:ListBucket',Resource:arn,Condition:{StringLike:{'s3:prefix':['library/lifecycle/*','library/state/*','library/document-locks/*']}}},
 {Effect:'Allow',Action:'s3:GetObject',Resource:[`${arn}/library/lifecycle/*`,`${arn}/library/state/*`,`${arn}/library/document-locks/*`]},
 {Effect:'Allow',Action:'s3:PutObject',Resource:`${arn}/library/document-locks/*`}
]);
write('shared-trash-bucket-policy.proposed.json',bucketPolicy);
write('shared-trash-lambda-policy.proposed.json',lambdaPolicy);
write('shared-trash-uploader-policy.proposed.json',uploaderPolicy);
const original=read('template-before.json').TemplateBody;
if(typeof original!=='object'||!original.Resources?.Role||original.Resources.Function?.Properties?.MemorySize!==256||original.Resources.Function?.Properties?.Timeout!==20)throw Error('Unexpected deployment baseline');
const next=structuredClone(original);
if(next.Parameters.LibraryLifecycleEnabled)throw Error('Feature parameter already exists');
next.Parameters.LibraryLifecycleEnabled={Type:'String',Default:'false',AllowedValues:['true','false']};
next.Resources.Role.Properties.Policies.push({PolicyName:'SharedLibraryLifecycle',PolicyDocument:lambdaPolicy});
next.Resources.Function.Properties.Environment.Variables.VIEWER_LIFECYCLE_ENABLED={Ref:'LibraryLifecycleEnabled'};
// Full live template stays in ignored outputs; the tracked plan exposes no secrets.
fs.writeFileSync(path.join(input,'template-proposed.json'),JSON.stringify(next,null,2)+'\n');
write('shared-trash-change-plan.proposed.json',{
 status:'NOT_APPLIED',checkedDate:'2026-10-19',region:'ap-northeast-1',stack:'diagram-library-api',
 resourcesToModify:['Role','Function'],indirectReferenceUpdate:['Integration'],newAWSResources:[],replacementOrDeletion:[],
 lambda:{runtime:'nodejs22.x',memoryMB:256,timeoutSeconds:20,logRetentionDays:14,newParameter:'LibraryLifecycleEnabled',initialValue:'false',reviewedValidationThenFinalValue:'true',newInlinePolicy:'shared-trash-lambda-policy.proposed.json',code:'New local bundle; new CodeKey under the existing approved code bucket/prefix, previous CodeKey retained for rollback'},
 uploader:{role:uploader,newInlinePolicy:'shared-trash-uploader-policy.proposed.json',localConfigAfterApproval:{lifecycleProtection:true},mustUseUpdatedCLI:true},
 bucket:{name:bucket,policy:'shared-trash-bucket-policy.proposed.json',preservedOrganizationKey:fixedOrganizationKey,versioningChange:false,publicAccessChange:false,encryptionChange:false},
 clients:{afterServerValidation:'Enable LibraryLifecycleEnabled in iOS and Mac bundles, build/test and update existing installations',removeLocalCopies:'Only after a durable deleted notification; offline devices process it at next connection',macSourceFolders:'Preserve production originals'},
 excluded:['Budgets changes','Cognito changes','new KMS/WAF/VPC/DB resources','automatic expiry or blanket cleanup','delete existing user documents during validation'],
 approvalRequired:['policies and Lambda deployment','temporary server enable for synthetic-only validation, retain on success or disable on failure','synthetic test object upload/trash/restore/permanent deletion','client enable and updates']
});
console.log('Unapplied policies, change plan and local-only CloudFormation template prepared.');

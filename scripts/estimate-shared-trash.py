#!/usr/bin/env python3
"""Offline, conservative incremental envelope. No AWS or credentials."""
import json
from decimal import Decimal as D
from pathlib import Path
root = Path(__file__).resolve().parent.parent
cfg = json.loads((root/'docs/shared-trash-aws-rates.json').read_text())
r = {k:D(v['usd']) for k,v in cfg['rates'].items()}
fx = D(cfg['fxJPYPerUSD'])*D(cfg['taxMultiplier']); gib = D(1024)**3
cases = [
    dict(name='normal',devices=2,refreshPerDeviceDay=10,stateRecords=50,legacyRecords=0,catalogManifests=53,moves=25,deletes=5,objectsPerDelete=12,uploads=10,accessExtra=800,seconds=2,responseKiB=64,attempts=1),
    dict(name='heavy',devices=2,refreshPerDeviceDay=60,stateRecords=300,legacyRecords=0,catalogManifests=400,moves=200,deletes=50,objectsPerDelete=24,uploads=100,accessExtra=5000,seconds=5,responseKiB=400,attempts=1),
    dict(name='normal_three_attempts',devices=2,refreshPerDeviceDay=10,stateRecords=50,legacyRecords=0,catalogManifests=53,moves=25,deletes=5,objectsPerDelete=12,uploads=10,accessExtra=800,seconds=5,responseKiB=64,attempts=3),
]
result = dict(checkedDate=cfg['checkedDate'],region=cfg['region'],fxJPYPerUSD=cfg['fxJPYPerUSD'],taxMultiplier=cfg['taxMultiplier'],fixedAdditionalMonthlyUSD='0',note='Includes complete lifecycle snapshots in both feed and catalog calls; all cold catalog scans conservatively included. Existing artifact storage/download, organization sync and one existing owner MAU are separate. No API/Lambda/S3/log free tier or credits assumed.',scenarios=[])
money=lambda x:str(x.quantize(D('0.000001')))
for c in cases:
    refresh=c['devices']*c['refreshPerDeviceDay']*30; snapshots=refresh*2
    scans=refresh+c['moves']+c['deletes']*2
    http=snapshots+c['moves']+c['deletes']*2
    gets=snapshots*(c['stateRecords']+c['legacyRecords'])+scans*(c['catalogManifests']+5)+c['moves']*8+c['deletes']*(15+c['objectsPerDelete'])+c['uploads']*5+c['accessExtra']
    lists=snapshots*2+scans+c['moves']*8+c['deletes']*20+c['uploads']*8+c['accessExtra']
    puts=c['moves']*3+c['deletes']*4+c['uploads']*2
    a=c['attempts'];http*=a;gets*=a;lists*=a;puts*=a
    delete_requests=c['deletes']*c['objectsPerDelete']*a
    outgoing=D(snapshots*c['responseKiB']+(c['moves']+c['deletes']*2)*8)*1024*a/gib
    logs=D(http)*2048/gib
    # State stores confirmed delete plans as well as summaries; locks and durable
    # tombstones remain. No artifact or local backup is newly copied to S3.
    storage=D(c['stateRecords']*8192+max(100,c['stateRecords'])*1024)/gib
    costs=dict(api=D(http)*r['http_request'],lambdaRequests=D(http)*r['lambda_request'],lambdaCompute=D(http)*D('.25')*D(c['seconds'])*r['lambda_gb_second'],s3Get=D(gets)*r['s3_get'],s3PutList=D(puts+lists)*r['s3_put'],s3Storage=storage*r['s3_gb_month'],logsIngest=logs*r['logs_ingest_gb'],logsStorage=logs*D(14)/30*r['logs_store_gb_month'])
    base=sum(costs.values()); transfer=outgoing*r['egress_gb']
    result['scenarios'].append(dict(**c,refreshes=refresh,httpRequests=http,s3GetAttempts=gets,s3ListAttempts=lists,s3PutAttempts=puts,deleteRequests=delete_requests,outgoingGiB=money(outgoing),monthlyJPYWithAvailable100GiBTransfer=money((base+max(D(0),outgoing-100)*r['egress_gb'])*fx),monthlyJPYNoFreeTransfer=money((base+transfer)*fx),alreadyExistingOneOwnerMAUJPY=money(D(cfg['cognitoEssentialsUSDPerMAU'])*fx),costsJPY={k:money(v*fx) for k,v in {**costs,'noFreeTransfer':transfer}.items()}))
# Tiny synthetic-only deployment smoke test; repeated API/S3 paths budgeted above
# their expected size. This excludes the already-authorized read-only investigation.
one = (D(100)*r['http_request']+D(100)*r['lambda_request']+D(100)*D('.25')*20*r['lambda_gb_second']+D(1000)*r['s3_get']+D(500)*r['s3_put']+D(1)/1024*r['s3_gb_month']+D(1)/1024*r['egress_gb']+D(100)*2048/gib*r['logs_ingest_gb'])
result['oneTimeSyntheticValidationJPY']=money(one*fx)
print(json.dumps(result,ensure_ascii=False,indent=2))

#!/usr/bin/env python3
"""Offline quota-aware estimate; no credentials, AWS SDK or network calls."""
import json
from decimal import Decimal as D
from pathlib import Path
root = Path(__file__).resolve().parent.parent
config = json.loads((root/'docs/organization-sync-aws-rates.json').read_text())
r = {k:D(v['usd']) for k,v in config['rates'].items()}
fx = D(config['fxJPYPerUSD'])*D(config['taxMultiplier'])
gib = D(1024)**3
# Sessions are OWNER totals across both devices. Extra sessions require consent each time.
cases = [
 dict(name='normal', retryData=120, retryControl=240, sessions=1200, extraSessions=0, dataPerSession=1, sends=1, denied=30, bootstrap=60, casAttempts=1, seconds='0.3', responseKiB=100, stateMiB=5),
 dict(name='five_per_hour', sessions=3600, extraSessions=0, dataPerSession=1, sends=1, denied=60, bootstrap=60, casAttempts=1, seconds='0.3', responseKiB=500, stateMiB=16),
 dict(name='five_per_hour_all_retried', sessions=3600, extraSessions=0, dataPerSession=1, sends=3, denied=60, bootstrap=60, casAttempts=3, seconds='1', responseKiB=500, stateMiB=16),
 dict(name='normal_plus_consent', retryData=150, retryControl=330, sessions=1200, extraSessions=300, dataPerSession=1, sends=1, denied=30, bootstrap=60, casAttempts=1, seconds='0.3', responseKiB=100, stateMiB=5),
 dict(name='protocol_stress', sessions=3600, extraSessions=0, dataPerSession=12, sends=3, denied=60, bootstrap=60, casAttempts=3, seconds='1', responseKiB=2048, stateMiB=16),
]
result = dict(checkedDate=config['checkedDate'],region=config['region'],fxJPYPerUSD=config['fxJPYPerUSD'],taxMultiplier=config['taxMultiplier'], note='30 days; no API/Lambda/log/storage free tier or credits; owner totals; parameterized estimate, not a billing ceiling',scenarios=[])
for c in cases:
 s=c['sessions']+c['extraSessions']; a=c['sends']; data=s*c['dataPerSession']*a+c.get('retryData',0)
 # Extra consent adds one denied begin/challenge before the confirmed begin.
 control=(2*s+c['extraSessions']+c['denied'])*a+c.get('retryControl',0)
 bootstrap=c['bootstrap']*a
 n=data+control+bootstrap
 # Upper accounting: control attempts each write ledger, data each writes twice
 # (request budget before work, authority+receipt after); GET once per PUT/CAS attempt.
 puts=(control+2*data)*c['casAttempts']; gets=puts+bootstrap
 outgoing=(D(data)*c['responseKiB']+D(control+bootstrap)*2)*1024/gib
 logs=D(n)*2048/gib # API + Lambda combined 2 KiB per invocation; no payload/token
 costs=dict(httpAPI=D(n)*r['http_request'],lambdaRequests=D(n)*r['lambda_request'],lambdaCompute=D(n)*D('.25')*D(c['seconds'])*r['lambda_gb_second'],s3Get=D(gets)*r['s3_get'],s3Put=D(puts)*r['s3_put'],s3Storage=D(c['stateMiB']+1)/1024*r['s3_gb_month'],logsIngest=logs*r['logs_ingest_gb'],logsStorage=logs*D(14)/30*r['logs_store_gb_month'])
 base=sum(costs.values()); transfer=outgoing*r['egress_gb']; costs['internetTransfer']=transfer
 money=lambda x:str(x.quantize(D('.000001')))
 item=dict(c,httpRequests=n,dataRequests=data,controlRequests=control,bootstrapRequests=bootstrap,s3GetAttempts=gets,s3PutAttempts=puts,outgoingGiB=money(outgoing),monthlyJPYWithFreeTransfer=money((base+max(D(0),outgoing-D(100))*r['egress_gb'])*fx),monthlyJPYNoFreeTransfer=money((base+transfer)*fx),allocatedOneMAUJPY=money(D(config['cognitoEssentialsUSDPerMAU'])*fx),costsJPY={k:money(v*fx) for k,v in costs.items()})
 assert n==data+control+bootstrap
 assert c['sessions']<=5*24*30
 result['scenarios'].append(item)
print(json.dumps(result,ensure_ascii=False,indent=2))

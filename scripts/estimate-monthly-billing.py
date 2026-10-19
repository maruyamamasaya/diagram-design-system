"""Offline incremental estimate. No AWS access or resource changes."""
import json
from decimal import Decimal as D
from pathlib import Path
root = Path(__file__).resolve().parents[1]
rates = json.loads((root / 'docs/shared-trash-aws-rates.json').read_text())
r = {key: D(value['usd']) for key, value in rates['rates'].items()}
fx, tax = D(150), D('1.10')
results = []
# 31 days / 7 day durable minimum => at most five acquisitions in any calendar month.
for name, api, ce, response_bytes in [('normal', 62, 10, 65536), ('heavy', 1240, 10, 65536), ('heavy_retries_and_pagination', 3720, 20, 262144)]:
    s3_get = api * r['s3_get']
    s3_put = 10 * r['s3_put']
    # Cached/API invocations: 2s @256MB. Reserve another 7s per acquisition (9s CE deadline).
    compute = (D(api)*2 + 5*7) * D('0.25') * r['lambda_gb_second']
    # Keep 10 full cache copies as a conservative first-month storage allowance, regardless of versioning.
    cache_storage = D(response_bytes*10)/D(2**30)*r['s3_gb_month']
    logs = D(api*1024)/D(2**30)*(r['logs_ingest_gb'] + r['logs_store_gb_month']*D(14)/30)
    fixed_ce = D(ce)*D('0.01')
    subtotal = fixed_ce + D(api)*(r['http_request']+r['lambda_request']) + s3_get+s3_put+compute+cache_storage+logs
    egress = D(api*response_bytes)/D(2**30)*r['egress_gb']
    results.append({'case':name,'apiRequests':api,'ceRequests':ce,'s3GET':api,'s3PUT':10,'responseBytes':response_bytes,'ceJPY':str(fixed_ce*fx*tax),'withTransferFreeTierJPY':str(subtotal*fx*tax),'withoutTransferFreeTierJPY':str((subtotal+egress)*fx*tax)})
print(json.dumps({'region':'ap-northeast-1 (CE endpoint us-east-1)','exchangeJPYPerUSD':str(fx),'taxMultiplier':str(tax),'rates': 'docs/shared-trash-aws-rates.json + CE 0.01 USD per page (checked 2026-10-19)', 'cases':results},indent=2))

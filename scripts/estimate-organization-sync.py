#!/usr/bin/env python3
"""Offline incremental-cost model. No AWS SDK, credentials, or network calls."""
import json
from decimal import Decimal as D
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = root / 'docs/organization-sync-aws-rates.json'
config = json.loads(source.read_text())
rates = {key: D(value['usd']) for key, value in config['rates'].items()}
convert = D(config['fxJPYPerUSD']) * D(config['taxMultiplier'])
gib = D(1024) ** 3
scenarios = [
    dict(name='normal', devices=2, callsPerDeviceDay=20, requests=1200, changedBatches=300,
         extraCASAttempts=30, meanSeconds='0.3', responseKiB=100, stateMiB=5),
    dict(name='heavy', devices=2, callsPerDeviceDay=200, requests=12000, changedBatches=6000,
         extraCASAttempts=1200, meanSeconds='1.0', responseKiB=500, stateMiB=16),
]
result = {'checkedDate': config['checkedDate'], 'region': config['region'],
          'fxJPYPerUSD': config['fxJPYPerUSD'], 'taxMultiplier': config['taxMultiplier'],
          'note': 'Incremental sync only; existing document reads excluded; no API/Lambda/log credits deducted.', 'scenarios': []}
for case in scenarios:
    n, w, retry = map(D, [case['requests'], case['changedBatches'], case['extraCASAttempts']])
    outgoing = n * D(case['responseKiB']) * 1024 / gib
    log_gb = n * 1024 / gib  # 1 KiB/request; no tokens, titles or operation payload logs
    costs = {
        'httpAPI': n * rates['http_request'],
        'lambdaRequests': n * rates['lambda_request'],
        'lambdaCompute': n * D('0.25') * D(case['meanSeconds']) * rates['lambda_gb_second'],
        's3Get': (n + retry) * rates['s3_get'],
        # Count even failed CAS PUT attempts conservatively.
        's3Put': (w + retry) * rates['s3_put'],
        's3Storage': D(case['stateMiB'] + 1) / 1024 * rates['s3_gb_month'], # +1 MiB new code zip
        'logsIngest': log_gb * rates['logs_ingest_gb'],
        'logsStorage': log_gb * D(14) / 30 * rates['logs_store_gb_month'],
    }
    paid = dict(costs, internetTransfer=outgoing * rates['egress_gb'])
    base, worst = sum(costs.values()), sum(paid.values())
    def money(x): return str(x.quantize(D('0.000001')))
    item = dict(case, responseGiB=money(outgoing),
                monthlyUSDNoFreeTransfer=money(worst),
                monthlyJPYWithFreeTransfer=money(base*convert),
                monthlyJPYNoFreeTransfer=money(worst*convert),
                # The same already-active owner incurs no new MAU from a second device.
                incrementalCognitoMAUJPY='0',
                allocatedOneMAUJPYIfNoFreeTier=money(D(config['cognitoEssentialsUSDPerMAU'])*convert),
                monthlyJPYNoFreeTierWithAllocatedMAU=money((worst+D(config['cognitoEssentialsUSDPerMAU']))*convert),
                costsUSD={k:money(v) for k,v in paid.items()},
                costsJPY={k:money(v*convert) for k,v in paid.items()})
    assert item['devices'] * item['callsPerDeviceDay'] * 30 == item['requests']
    result['scenarios'].append(item)
print(json.dumps(result, ensure_ascii=False, indent=2))

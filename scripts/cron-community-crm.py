#!/usr/bin/env python3
"""Retry the website's CRM projection independently of the browser/payment flow."""
import fcntl
import json
import os
import pathlib
import tempfile
import urllib.request

ROOT = pathlib.Path('/opt/imobiturbo-os/config')
CONFIG = ROOT / 'community-billing.env'
ENDPOINT = 'https://www.imobiturbo.com.br/api/checkout/community-crm'

def main():
    os.umask(0o077)
    with open(ROOT / 'community-crm.lock', 'a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        if (ROOT / 'PAUSAR-COMMUNITY-BILLING').exists():
            return
        if CONFIG.stat().st_mode & 0o077:
            raise RuntimeError('private_configuration_permissions')
        values = {}
        for line in CONFIG.read_text().splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                values[key] = value.strip().strip('\"\'')
        token = values.get('COMMUNITY_INTERNAL_TOKEN')
        if not token:
            raise RuntimeError('community_crm_configuration_missing')
        cursor_file = ROOT / 'community-crm-cursor.json'
        cursor = json.loads(cursor_file.read_text()) if cursor_file.exists() else None
        request = urllib.request.Request(ENDPOINT, data=json.dumps({'cursor': cursor}).encode(),
            headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}, method='POST')
        with urllib.request.urlopen(request, timeout=55) as response:
            result = json.load(response)
        if not all(type(result.get(key)) is int and result[key] >= 0 for key in ('scanned','completed','pending')) or 'next_cursor' not in result:
            raise RuntimeError('community_crm_receipt_invalid')
        with tempfile.NamedTemporaryFile(mode='w', dir=ROOT, prefix='.community-crm-', delete=False) as output:
            json.dump(result['next_cursor'], output)
            output.flush()
            os.fsync(output.fileno())
        os.replace(output.name, cursor_file)
        print(json.dumps(result, separators=(',', ':')))

if __name__ == '__main__':
    try:
        main()
    except Exception:
        # No token, contact, response body or request headers in operational logs.
        print('community_crm_retry_pending')
        raise SystemExit(1)

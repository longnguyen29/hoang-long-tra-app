#!/usr/bin/env python3
"""Adversarial checks against the caller's NEW throwaway PostgreSQL cluster only.

The shell harness creates the cluster/database and supplies explicit connection
arguments. This file is not intended to connect to a pre-existing database.
"""
import concurrent.futures
import hashlib
import subprocess
import sys
import threading

psql, port, user, mode = sys.argv[1:]
if mode not in ('original', 'patched'):
    raise SystemExit('invalid candidate mode')
database = 'hl_intel_disposable_races' if mode == 'original' else 'hl_intel_disposable_patched_races'
if not port.isdigit() or not user.replace('_', '').isalnum():
    raise SystemExit('invalid local test connection')
command = [psql, '-X', '-qAt', '-h', '127.0.0.1', '-p', port, '-U', user,
           '-d', database, '-v', 'ON_ERROR_STOP=1']
prospect = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
manager = '11111111-1111-4111-8111-111111111111'
auth = f'SET ROLE authenticated; SET "request.jwt.claim.sub" = \'{manager}\'; '
worker = 'SET ROLE service_role; '
source = 'https://example.org/products'


def complete(job_id, token, observed=source):
    observed_arg = "'" + observed + "'," if mode == 'patched' else ''
    return worker + f"SELECT public.complete_hl_intel_research('{job_id}','{token}',{observed_arg}repeat('c',64),'test evidence');"


def sql(statement, expect_error=None):
    result = subprocess.run(command, input=statement, text=True, capture_output=True, timeout=15)
    if expect_error:
        if result.returncode == 0 or expect_error not in result.stderr:
            raise AssertionError(f'expected {expect_error}: {result.stdout} / {result.stderr}')
    elif result.returncode:
        raise AssertionError(result.stderr)
    return result.stdout.strip()


def key(value):
    return hashlib.sha256(value.encode()).hexdigest()


def reset():
    sql('TRUNCATE public.hl_intel_audit, public.hl_intel_observations, public.hl_intel_watches, public.hl_intel_jobs RESTART IDENTITY; '
        f"UPDATE public.discovery_prospects SET status='research', version=1, source_url='https://example.org/products' WHERE id='{prospect}';")


def request(value):
    return sql(auth + f"SELECT job_id||'|'||reused FROM public.request_hl_intel_research('{prospect}', 1, '{key(value)}');")


def together(callables):
    barrier = threading.Barrier(len(callables))
    def run(fn):
        barrier.wait(timeout=10)
        return fn()
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(callables)) as executor:
        return list(executor.map(run, callables))


# Distinct concurrent requests cannot exceed the shared daily cap.
reset()
def bounded_request(i):
    try:
        return ('ok', request(f'cap-{i}'))
    except AssertionError as error:
        if 'intel_daily_limit' not in str(error):
            raise
        return ('limit', '')
results = together([lambda i=i: bounded_request(i) for i in range(14)])
assert sum(state == 'ok' for state, _ in results) == 10, results
assert sum(state == 'limit' for state, _ in results) == 4, results
assert sql("SELECT count(*) FROM public.hl_intel_jobs WHERE kind='source_extract';") == '10'
print('PASS: concurrent requests enforce the shared daily limit')

# Concurrent retries with one idempotency key return exactly one job.
reset()
results = together([lambda: request('same-key') for _ in range(8)])
assert len({item.split('|')[0] for item in results}) == 1, results
assert sum(item.endswith('|false') for item in results) == 1, results
assert sql('SELECT count(*) FROM public.hl_intel_jobs;') == '1'
print('PASS: concurrent idempotency retries create one job')

# A claimed row is locked while the second worker attempts SKIP LOCKED.
reset()
job_id = request('claim-race').split('|')[0]
def claim(name):
    return sql(worker + f"BEGIN; SELECT id FROM public.claim_hl_intel_research('{name}', 1); SELECT pg_sleep(0.15); COMMIT;")
claims = together([lambda: claim('worker_a'), lambda: claim('worker_b')])
assert sum(job_id in result.splitlines() for result in claims) == 1, claims
assert sql(f"SELECT attempt_count FROM public.hl_intel_jobs WHERE id='{job_id}';") == '1'
print('PASS: two concurrent workers claim the job once')

# A cancellation racing a claim has only one winner and no observation.
reset()
job_id = request('cancel-race').split('|')[0]
def cancel():
    try:
        return ('ok', sql(auth + f"BEGIN; SELECT job_status FROM public.cancel_hl_intel_research('{job_id}'); SELECT pg_sleep(0.15); COMMIT;"))
    except AssertionError as error:
        if 'job_already_claimed' not in str(error):
            raise
        return ('claimed', '')
results = together([cancel, lambda: ('worker', claim('worker_race'))])
status = sql(f"SELECT status FROM public.hl_intel_jobs WHERE id='{job_id}';")
assert status in ('canceled', 'claimed'), (status, results)
assert (status == 'canceled' and results[0][0] == 'ok' and job_id not in results[1][1]) or (
    status == 'claimed' and results[0][0] == 'claimed' and job_id in results[1][1]), (status, results)
assert sql('SELECT count(*) FROM public.hl_intel_observations;') == '0'
print('PASS: concurrent cancellation and claim have one winner')

# A source update or do-not-contact while a job is in flight must cancel it.
for scenario in ('version', 'dnc'):
    reset()
    job_id = request('changed-' + scenario).split('|')[0]
    claimed = sql(worker + "SELECT id||'|'||claim_token FROM public.claim_hl_intel_research('worker_test', 1);")
    claimed_id, token = claimed.split('|')
    assert claimed_id == job_id
    change = "version=2, source_url='https://example.org/new'" if scenario == 'version' else "version=2, status='do_not_contact'"
    sql(f"UPDATE public.discovery_prospects SET {change} WHERE id='{prospect}';")
    sql(complete(job_id, token))
    assert sql(f"SELECT status||'|'||error_code FROM public.hl_intel_jobs WHERE id='{job_id}';") == 'canceled|prospect_changed'
    assert sql('SELECT count(*) FROM public.hl_intel_observations;') == '0'
print('PASS: in-flight version change and do-not-contact suppress evidence')

# A reviewed source must still match the prospect's current version.
reset()
job_id = request('review-stale').split('|')[0]
claimed_id, token = sql(worker + "SELECT id||'|'||claim_token FROM public.claim_hl_intel_research('worker_test', 1);").split('|')
assert claimed_id == job_id
observation = sql(complete(job_id, token))
sql(f"UPDATE public.discovery_prospects SET version=2 WHERE id='{prospect}';")
sql(auth + f"SELECT public.review_hl_intel_observation('{observation}',1,'approved','');", 'stale_observation_source')
assert sql(f"SELECT decision FROM public.hl_intel_observations WHERE id='{observation}';") == 'pending'
print('PASS: review rejects evidence after prospect version changes')

# Exhausted leases are terminal and cannot be claimed again.
reset()
job_id = request('exhausted-lease').split('|')[0]
sql(f"UPDATE public.hl_intel_jobs SET status='claimed', attempt_count=4, claimed_by='old_worker', "
    f"claim_token=gen_random_uuid(), lease_until=now()-interval '1 minute' WHERE id='{job_id}';")
assert sql(worker + "SELECT id FROM public.claim_hl_intel_research('new_worker',1);") == ''
assert sql(f"SELECT status||'|'||error_code FROM public.hl_intel_jobs WHERE id='{job_id}';") == 'dead_letter|lease_exhausted'
assert sql(f"SELECT count(*) FROM public.hl_intel_audit WHERE job_id='{job_id}' AND event_type='research_failed';") == '1'
print('PASS: exhausted lease moves to dead letter exactly once')

if mode == 'patched':
    # Refuse any reported URL except the exact saved request URL, including
    # same-origin redirects; the actual runner must stop before fetching them.
    reset()
    job_id = request('url-mismatch').split('|')[0]
    claimed_id, token = sql(worker + "SELECT id||'|'||claim_token FROM public.claim_hl_intel_research('worker_test',1);").split('|')
    assert claimed_id == job_id
    for other in ('https://example.org/new', 'https://other.example/products', 'http://example.org/products'):
        sql(complete(job_id, token, other), 'observed_source_mismatch')
        assert sql('SELECT count(*) FROM public.hl_intel_observations;') == '0'
    sql(worker + f"SELECT public.complete_hl_intel_research('{job_id}','{token}',NULL,repeat('c',64),'test evidence');", 'observed_source_mismatch')
    observation = sql(complete(job_id, token))
    assert sql(f"SELECT source_url FROM public.hl_intel_observations WHERE id='{observation}';") == source
    assert sql(f"SELECT requested_source_url FROM public.hl_intel_jobs WHERE id='{job_id}';") == source
    sql(f"UPDATE public.discovery_prospects SET source_url='https://example.org/new' WHERE id='{prospect}';")
    sql(auth + f"SELECT public.review_hl_intel_observation('{observation}',1,'approved','');", 'stale_observation_source')
    print('PASS: URL substitutions, same-origin redirects and downgrades rejected; evidence keeps exact source')

    # Detect source changes even if an administrator bypassed version updates.
    reset()
    job_id = request('url-changed-no-version').split('|')[0]
    claimed_id, token = sql(worker + "SELECT id||'|'||claim_token FROM public.claim_hl_intel_research('worker_test',1);").split('|')
    assert claimed_id == job_id
    sql(f"UPDATE public.discovery_prospects SET source_url='https://example.org/other' WHERE id='{prospect}';")
    sql(auth + f"SELECT * FROM public.request_hl_intel_research('{prospect}',1,'{key('url-changed-no-version')}');", 'idempotency_conflict')
    sql(complete(job_id, token))
    assert sql(f"SELECT status||'|'||error_code FROM public.hl_intel_jobs WHERE id='{job_id}';") == 'canceled|prospect_changed'
    assert sql('SELECT count(*) FROM public.hl_intel_observations;') == '0'
    print('PASS: source change without version bump cancels work and blocks key reuse')

#!/usr/bin/env python3
"""Test only a temporary Postgres database populated with fictional records."""
import concurrent.futures
import subprocess
import sys
import uuid

bindir, port = sys.argv[1:]
base = [f'{bindir}/psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', port, '-d', 'assistant_test']


def sql(query, *, check=True):
    result = subprocess.run([*base, '-c', query], capture_output=True, text=True, check=False)
    if check and result.returncode:
        raise RuntimeError(result.stderr)
    return result


def scalar(query):
    return sql(query).stdout.strip()


def reserve(user):
    return scalar(f"set role service_role; select coalesce(public.reserve_assistant_ai_run('{user}', 'gpt-6-luna')::text, 'CAP');")


signature = 'public.reserve_assistant_ai_run(uuid,text)'
assert scalar(f"select has_function_privilege('anon', '{signature}', 'execute');") == 'f'
assert scalar(f"select has_function_privilege('authenticated', '{signature}', 'execute');") == 'f'
assert scalar(f"select has_function_privilege('service_role', '{signature}', 'execute');") == 't'
assert sql(f"set role authenticated; select public.reserve_assistant_ai_run('{uuid.uuid4()}', 'gpt-6-luna');", check=False).returncode != 0
print('PASS: only service_role can reserve')

user = uuid.uuid4()
with concurrent.futures.ThreadPoolExecutor(max_workers=25) as pool:
    results = list(pool.map(lambda _: reserve(user), range(25)))
assert sum(value != 'CAP' for value in results) == 10, results
assert scalar(f"select count(*) from public.growth_ai_runs where user_id='{user}';") == '10'
print('PASS: simultaneous requests obey the per-user hourly limit of 10')

sql('truncate public.growth_ai_runs')
sql("insert into public.growth_ai_runs(user_id,action,model) select gen_random_uuid(),'assistant_extract','test' from generate_series(1,99)")
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    results = list(pool.map(lambda _: reserve(uuid.uuid4()), range(12)))
assert sum(value != 'CAP' for value in results) == 1, results
assert scalar("select count(*) from public.growth_ai_runs where action='assistant_extract';") == '100'
print('PASS: simultaneous requests obey the global daily limit of 100')

sql('truncate public.growth_ai_runs')
sql(f"insert into public.growth_ai_runs(user_id,action,model,created_at) select '{user}','assistant_extract','test',now()-interval '2 days' from generate_series(1,100)")
assert reserve(user) != 'CAP'
assert scalar('select count(*) from public.growth_ai_runs;') == '101'
print('PASS: old reservations do not consume current limits')
print('LIMIT: local disposable PostgreSQL and minimal fictional schema, not production Supabase')

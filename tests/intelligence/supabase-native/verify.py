#!/usr/bin/env python3
"""Verify actual local GoTrue JWT, PostgREST and candidate RLS using fake data.

Requires the supplied CLI status JSON of a disposable native local stack. Never
accepts a remote host. Passwords/tokens are test-only, held in memory, not printed.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time
from urllib.parse import urlparse, quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from uuid import UUID

repo = Path(__file__).resolve().parents[3]
status_file = Path(sys.argv[1])
state = json.loads(status_file.read_text())
api = state['API_URL'].rstrip('/')
db = urlparse(state['DB_URL'])
for address in (urlparse(api),db):
    if address.hostname != '127.0.0.1' or address.scheme not in ('http','postgresql'):
        raise SystemExit('REFUSED: only local loopback Supabase allowed')
if db.path != '/postgres':
    raise SystemExit('REFUSED: unexpected disposable database name')
pg_env = {**os.environ, 'PGPASSWORD':db.password or ''}
psql_cmd=['psql','-X','-q','-v','ON_ERROR_STOP=1','-h',db.hostname,'-p',str(db.port),'-U',db.username,'-d',db.path[1:]]
def sql(text):
    p=subprocess.run(psql_cmd,input=text,env=pg_env,text=True,capture_output=True,timeout=40)
    if p.returncode: raise RuntimeError('Local fixture SQL failed: '+p.stderr[-1500:])
    return p.stdout

def sqlfile(path):
    p=subprocess.run(psql_cmd+['-f',str(path)],env=pg_env,text=True,capture_output=True,timeout=40)
    if p.returncode: raise RuntimeError('Local fixture failed: '+str(path.name)+' '+p.stderr[-1500:])

for file in [repo/'tests/intelligence/supabase-native/bootstrap.sql',
             repo/'supabase/migrations/0057_prospect_discovery.sql',
             repo/'supabase/migrations/0058_prospect_contacts_and_drafts.sql',
             repo/'supabase/migrations/0059_prospect_account_types.sql',
             repo/'supabase/migrations/0060_prospect_sales_followup.sql',
             repo/'docs/intelligence/gate0/candidate-source-attribution-patched.sql']:
    sqlfile(file)
sql("NOTIFY pgrst, 'reload schema';")
print('PASS: actual Supabase PostgreSQL, selected repo migrations and patched candidate created locally')

anon=state['ANON_KEY']; service=state['SERVICE_ROLE_KEY']
def call(path,method='GET',body=None,token=None,key=None):
    headers={'apikey':key or anon,'Authorization':'Bearer '+(token or anon)}
    if body is not None: headers['Content-Type']='application/json'
    request=Request(api+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method)
    try:
        with urlopen(request,timeout=10) as res:
            payload=res.read(); return res.status, json.loads(payload) if payload else None
    except HTTPError as e:
        payload=e.read()
        try: result=json.loads(payload)
        except (ValueError,UnicodeDecodeError): result={}
        return e.code,result

def expect(status, expected, message):
    if status not in expected: raise AssertionError(message+': HTTP '+str(status))

def create_user(name):
    email=f'{name}.{secrets.token_hex(4)}@example.com'; password=secrets.token_urlsafe(18)
    status,obj=call('/auth/v1/admin/users','POST',{'email':email,'password':password,'email_confirm':True},service,service)
    expect(status,(200,201),'create fake auth user')
    user_id=str(UUID(obj['id']))
    status,obj=call('/auth/v1/token?grant_type=password','POST',{'email':email,'password':password})
    expect(status,(200,),'authenticate fake user')
    return user_id,obj['access_token']
manager, manager_jwt=create_user('manager')
member, member_jwt=create_user('staff')
prospect='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
source='https://example.com/tea'
sql(f"INSERT INTO public.staff_roles(user_id,role) VALUES ('{manager}','manager'),('{member}','staff');\n"
    f"INSERT INTO public.discovery_prospects(id,name,source_url,source_key,evidence_kind,created_by) VALUES ('{prospect}','Fictional Tea Shop','{source}','fake-local-source','page_review','{manager}');\nNOTIFY pgrst, 'reload schema';")
# Query schema cache; actual production adapter needs its own readiness handling.
time.sleep(0.5)
args={'p_prospect_id':prospect,'p_expected_version':1,'p_idempotency_key':'a'*64}
status,result=call('/rest/v1/rpc/request_hl_intel_research','POST',args,manager_jwt)
expect(status,(200,),'manager request')
job=str(UUID(result[0]['job_id']))
status,repeat=call('/rest/v1/rpc/request_hl_intel_research','POST',args,manager_jwt)
expect(status,(200,),'manager retry')
assert repeat[0]['job_id']==job and repeat[0]['reused'] is True
staff_args={**args,'p_idempotency_key':'d'*64}
status,error=call('/rest/v1/rpc/request_hl_intel_research','POST',staff_args,member_jwt)
expect(status,(400,),'non-manager request denied')
assert error.get('message')=='manager_required', 'staff denial must come from manager authorization'
status,_=call('/rest/v1/rpc/request_hl_intel_research','POST',args)
expect(status,(401,403,404),'anonymous request denied')
parts=manager_jwt.split('.')
assert len(parts)==3 and parts[2]
parts[2]=('A' if parts[2][0]!='A' else 'B')+parts[2][1:]
status,_=call('/rest/v1/hl_intel_jobs?select=id,status',token='.'.join(parts))
expect(status,(401,403),'invalid-signature JWT must be rejected')
print('PASS: real GoTrue manager JWT can request/retry; staff, anon and forged JWT cannot')

status,result=call('/rest/v1/hl_intel_jobs?select=id,status',token=manager_jwt)
expect(status,(200,),'manager job list')
assert any(row['id']==job for row in result)
status,result=call('/rest/v1/hl_intel_jobs?select=id,status',token=member_jwt)
expect(status,(200,),'staff job list')
assert result==[]
status,_=call('/rest/v1/hl_intel_jobs?select=id,claim_token',token=manager_jwt)
expect(status,(401,403),'manager cannot read worker secret column')
print('PASS: actual PostgREST/RLS manager reads projected job, staff sees none, claim token denied')

status,result=call('/rest/v1/rpc/claim_hl_intel_research','POST',{'p_worker':'local_test','p_limit':1},service,service)
expect(status,(200,),'service worker claim')
claim=result[0]['claim_token']; assert result[0]['id']==job
status,_=call('/rest/v1/rpc/claim_hl_intel_research','POST',{'p_worker':'invalid','p_limit':1},manager_jwt)
expect(status,(401,403,404),'manager cannot claim service jobs')
status,result=call('/rest/v1/rpc/complete_hl_intel_research','POST',{'p_job_id':job,'p_claim_token':claim,'p_observed_url':source,'p_sha256':'b'*64,'p_excerpt':'Fictional test excerpt'},service,service)
expect(status,(200,),'service worker completion')
observation=str(UUID(result))
status,result=call('/rest/v1/hl_intel_observations?select=id,source_url',token=manager_jwt)
expect(status,(200,),'manager observations')
assert any(row['id']==observation and row['source_url']==source for row in result)
status,result=call('/rest/v1/hl_intel_observations?select=id',token=member_jwt)
expect(status,(200,),'staff observations')
assert result==[]
sql(f"UPDATE public.discovery_prospects SET status='do_not_contact',version=version+1 WHERE id='{prospect}';")
status,result=call('/rest/v1/hl_intel_observations?select=id',token=manager_jwt)
expect(status,(200,),'suppressed observations')
assert result==[]
print('PASS: service-only claim/completion, manager evidence, staff exclusion and DNC suppression via real RLS')
print('LIMIT: local native Supabase with fictional users and selected repo migrations; not deployed schema, production JWTs, full app adapter or worker network')

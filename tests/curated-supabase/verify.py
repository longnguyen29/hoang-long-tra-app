#!/usr/bin/env python3
"""Local-only GoTrue/PostgREST test of curated teas with fictional records.

Never use a remote URL; temporary credentials stay in memory and are not printed.
This uses minimal representative business tables, not a deployed schema clone.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import time
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from uuid import UUID

repo = Path(__file__).resolve().parents[2]
state = json.loads(Path(sys.argv[1]).read_text())
api = state['API_URL'].rstrip('/')
db = urlparse(state['DB_URL'])
for addr in (urlparse(api), db):
    if addr.hostname != '127.0.0.1' or addr.scheme not in ('http','postgresql'):
        raise SystemExit('REFUSED: loopback only')
if db.path != '/postgres':
    raise SystemExit('REFUSED: unexpected database')
env = {**os.environ, 'PGPASSWORD': db.password or ''}
psql = ['psql','-X','-q','-v','ON_ERROR_STOP=1','-h',db.hostname,'-p',str(db.port),'-U',db.username,'-d','postgres']
def sql(source, *, file=False):
    args=psql+(['-f',str(source)] if file else [])
    p=subprocess.run(args,input=None if file else source,env=env,text=True,capture_output=True,timeout=40)
    if p.returncode: raise RuntimeError('local SQL failed: '+p.stderr[-1600:])
    return p.stdout
sql(repo/'tests/curated-supabase/bootstrap.sql',file=True)
sql(repo/'supabase/migrations/0097_curated_partner_teas.sql',file=True)
sql("NOTIFY pgrst, 'reload schema';")
print('PASS: isolated Supabase schema and curated migration applied')
anon=state['ANON_KEY']; service=state['SERVICE_ROLE_KEY']
def call(path, method='GET', body=None, token=None, key=None, headers=None):
    fields={'apikey':key or anon,'Authorization':'Bearer '+(token or anon),**(headers or {})}
    if body is not None: fields['Content-Type']='application/json'
    req=Request(api+path,data=None if body is None else json.dumps(body).encode(),headers=fields,method=method)
    try:
        with urlopen(req,timeout=10) as res:
            data=res.read();return res.status,json.loads(data) if data else None
    except HTTPError as e:
        data=e.read()
        try: obj=json.loads(data)
        except (ValueError,UnicodeDecodeError): obj={}
        return e.code,obj

def expect(status,allowed,label):
    if status not in allowed: raise AssertionError(label+': HTTP '+str(status))

def create_user(label):
    email=f'{label}.{secrets.token_hex(4)}@example.com'; password=secrets.token_urlsafe(18)
    status,result=call('/auth/v1/admin/users','POST',{'email':email,'password':password,'email_confirm':True},service,service)
    expect(status,(200,201),'create fake user')
    uid=str(UUID(result['id']))
    status,result=call('/auth/v1/token?grant_type=password','POST',{'email':email,'password':password})
    expect(status,(200,),'sign in fake user')
    return uid,result['access_token']
manager,mgr=create_user('curated_manager')
member,staff=create_user('curated_employee')
sql(f"""insert into public.staff_roles(user_id,role) values ('{manager}','manager'),('{member}','employee');
insert into public.vendors(id,name,active,supplier_only,phone,note) values
 ('v','Fictional Supplier',false,true,'SENSITIVE_PHONE','SENSITIVE_NOTE');
insert into public.catalog_products(id,kind,vendor_id,batch,available,name,price) values
 ('legacy','tea',null,'',true,'{{"vi":"Legacy"}}',100),
 ('partner','tea','v','LOT1',false,'{{"vi":"Fictional Tea"}}',200);
insert into public.tea_batches(id,code,product_id,status,producer) values
 ('b1','LOT1','partner','released','Fictional Producer');
NOTIFY pgrst, 'reload schema';""")
time.sleep(0.5)
reg={'p_product_id':'partner'}
status,obj=call('/rest/v1/rpc/register_curated_tea_product','POST',reg,staff)
expect(status,(400,401,403),'employee registration denied')
if status==400: assert 'manager_required' in str(obj), 'unexpected staff denial'
status,_=call('/rest/v1/rpc/register_curated_tea_product','POST',reg)
expect(status,(401,403,404),'anonymous registration denied')
# Tampering with a real JWT signature must not grant access.
parts=mgr.split('.'); bad='A' if parts[2][0]!='A' else 'B'; bad_token='.'.join([parts[0],parts[1],bad+parts[2][1:]])
status,_=call('/rest/v1/rpc/register_curated_tea_product','POST',reg,bad_token)
expect(status,(401,403),'bad signature denied')
status,_=call('/rest/v1/rpc/register_curated_tea_product','POST',reg,mgr)
expect(status,(200,204),'manager registration')
status,obj=call('/rest/v1/catalog_products?id=eq.partner','PATCH',{'available':True},mgr)
expect(status,(400,403,409),'unapproved listing denied')
assert 'curated_partner_not_approved' in str(obj), 'wrong guard error'
status,obj=call('/rest/v1/rpc/list_public_curated_teas','POST',{})
expect(status,(200,),'public list before approval');assert obj==[]
print('PASS: signed manager/staff/anonymous auth, invalid signature, unapproved product guard')
review={
 'p_product_id':'partner','p_batch_id':'b1','p_decision':'approved','p_tasted_on':'2026-10-30',
 'p_public_note':'Fictional sensory note','p_attested':True,'p_publish_identity':True,
 'p_expected_supplier_name':'Fictional Supplier','p_expected_producer_name':'Fictional Producer','p_expected_batch_code':'LOT1','p_expected_latest_review_id':None}
status,obj=call('/rest/v1/rpc/set_curated_tea_review','POST',{**review,'p_publish_identity':False},mgr)
expect(status,(400,403),'identity publication consent denied');assert 'identity' in str(obj) or 'attestation' in str(obj)
status,_=call('/rest/v1/rpc/set_curated_tea_review','POST',{**review,'p_expected_producer_name':'Incorrect Producer'},mgr)
expect(status,(400,403,409),'stale identity denied')
status,_=call('/rest/v1/rpc/set_curated_tea_review','POST',review,mgr)
expect(status,(200,204),'manager approves')
status,_=call('/rest/v1/catalog_products?id=eq.partner','PATCH',{'available':True},mgr)
expect(status,(200,204),'manager publishes approved item')
status,obj=call('/rest/v1/rpc/list_public_curated_teas','POST',{})
expect(status,(200,),'public projection'); assert len(obj)==1 and obj[0]['product_id']=='partner'
assert obj[0]['supplier_name']=='Fictional Supplier' and obj[0]['producer_name']=='Fictional Producer'
assert obj[0]['batch_code']=='LOT1' and 'SENSITIVE_' not in json.dumps(obj)
assert set(obj[0])=={'product_id','batch_code','producer_name','supplier_name','tasted_on','public_note'}
status,_=call('/rest/v1/curated_tea_reviews?select=*',token=staff)
expect(status,(200,401,403),'staff private reviews');
if status==200: assert _==[]
status,_=call('/rest/v1/curated_tea_reviews?select=*')
expect(status,(401,403),'anonymous private reviews')
print('PASS: explicit consent, stale identity guard, approved public projection, private fields hidden')
# Emulate the existing HouseControl upsert payload without the new flag. It must
# preserve classification and allow a legitimate catalog edit.
payload={'id':'partner','kind':'tea','vendor_id':'v','batch':'LOT1','available':True,'name':{'vi':'Edited fictional tea'},'price':200}
status,obj=call('/rest/v1/catalog_products?on_conflict=id','POST',payload,mgr,headers={'Prefer':'resolution=merge-duplicates,return=representation'})
expect(status,(200,201),'existing HouseControl-style upsert')
assert obj[0]['curated_partner_required'] is True and obj[0]['available'] is True
print('PASS: real PostgREST upsert preserves required partner classification')
def latest_review_id():
    status,result=call('/rest/v1/rpc/list_curated_tea_admin','POST',{},mgr)
    expect(status,(200,),'read current curation decision')
    rows=[row for row in result['reviews'] if row['product_id']=='partner']
    return max((row['id'] for row in rows),default=None)
withdraw={**review,'p_expected_latest_review_id':latest_review_id(),'p_batch_id':None,'p_decision':'withdrawn','p_tasted_on':None,'p_public_note':'','p_attested':False,'p_publish_identity':False,'p_expected_supplier_name':None,'p_expected_producer_name':None,'p_expected_batch_code':None}
status,_=call('/rest/v1/rpc/set_curated_tea_review','POST',withdraw,mgr)
expect(status,(200,204),'withdraw')
status,obj=call('/rest/v1/catalog_products?id=eq.partner&select=available',token=mgr)
expect(status,(200,),'withdrawn catalog');assert obj==[{'available':False}]
status,obj=call('/rest/v1/rpc/list_public_curated_teas','POST',{})
expect(status,(200,),'withdrawn public projection');assert obj==[]
status,obj=call('/rest/v1/rpc/set_curated_tea_review','POST',review,mgr)
expect(status,(400,409),'stale approval rejected');assert 'stale_curation_decision' in str(obj)
review['p_expected_latest_review_id']=latest_review_id()
status,_=call('/rest/v1/rpc/set_curated_tea_review','POST',review,mgr)
expect(status,(200,204),'approve again')
status,_=call('/rest/v1/catalog_products?id=eq.partner','PATCH',{'available':True},mgr)
expect(status,(200,204),'publish again')
status,_=call('/rest/v1/tea_batches?id=eq.b1','PATCH',{'producer':'Changed fictional producer'},mgr)
expect(status,(200,204),'change reference producer')
status,obj=call('/rest/v1/catalog_products?id=eq.partner&select=available',token=mgr)
expect(status,(200,),'reference changed');assert obj==[{'available':False}]
status,obj=call('/rest/v1/catalog_products?id=eq.partner','PATCH',{'available':True},mgr)
expect(status,(400,403,409),'changed reference cannot republish');assert 'curated_partner_not_approved' in str(obj)
# A changed processing method also invalidates the approval even when the
# batch ID, code and producer stay the same. Re-attest to the new producer first.
updated_review={**review,'p_expected_producer_name':'Changed fictional producer','p_expected_latest_review_id':latest_review_id()}
status,_=call('/rest/v1/rpc/set_curated_tea_review','POST',updated_review,mgr)
expect(status,(200,204),'approve changed reference after actual reassessment')
status,_=call('/rest/v1/catalog_products?id=eq.partner','PATCH',{'available':True},mgr)
expect(status,(200,204),'republish after reassessment')
status,_=call('/rest/v1/tea_batches?id=eq.b1','PATCH',{'process':'Fictional updated process'},mgr)
expect(status,(200,204),'change processing method')
status,obj=call('/rest/v1/catalog_products?id=eq.partner&select=available',token=mgr)
expect(status,(200,),'processing changed');assert obj==[{'available':False}]
status,obj=call('/rest/v1/catalog_products?id=eq.partner','PATCH',{'available':True},mgr)
expect(status,(400,403,409),'changed processing cannot republish');assert 'curated_partner_not_approved' in str(obj)
status,obj=call('/rest/v1/catalog_products?id=eq.legacy&select=available',token=mgr)
expect(status,(200,),'legacy remains');assert obj==[{'available':True}]
print('PASS: withdrawal, changed producer/process invalidation and unchanged legacy product')
print('LIMIT: local Supabase with fictional users and minimal business schema; not complete deployed schema or app/checkout integration')

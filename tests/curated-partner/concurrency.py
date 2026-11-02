#!/usr/bin/env python3
"""Exercise a source edit concurrent with an uncommitted tasting approval."""
import os, subprocess, sys, time
pg_bin, port = sys.argv[1:]
base=[pg_bin+'/psql','-X','-qAt','-h','127.0.0.1','-p',port,'-d','curated_test','-v','ON_ERROR_STOP=1']
def run(sql):
    p=subprocess.run(base,input=sql,text=True,capture_output=True,timeout=10)
    if p.returncode: raise RuntimeError('local SQL failed: '+p.stderr)
    return p.stdout.strip()
manager="SET ROLE authenticated; SET \"request.jwt.claim.sub\"='11111111-1111-4111-8111-111111111111'; "
# Approval holds share locks on its source until commit; the name edit must
# subsequently invalidate the just-approved decision before it can be sold.
env={**os.environ,'PGAPPNAME':'curated-race-approve'}
approval=subprocess.Popen(base,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env=env)
approval.stdin.write(manager+"BEGIN; SELECT public.set_curated_tea_review('partner','b1','approved',current_date,'sample',true,true,'Nha doi ten','Nha san xuat','B01',(SELECT max(id) FROM public.curated_tea_reviews WHERE product_id='partner')); SELECT pg_sleep(1.5); COMMIT;\n")
approval.stdin.close()
for i in range(100):
    if run("SELECT count(*) FROM pg_stat_activity WHERE application_name='curated-race-approve' AND wait_event='PgSleep';")=='1': break
    if approval.poll() is not None: raise AssertionError('approval ended before barrier')
    time.sleep(.02)
else:
    approval.kill(); raise AssertionError('approval did not reach transaction barrier')
run("UPDATE public.vendors SET name='Changed during approval' WHERE id='v';")
approval.wait(timeout=5)
if approval.returncode: raise AssertionError('approval transaction failed: '+approval.stderr.read())
assert run("SELECT decision||':'||coalesce(system_reason,'') FROM public.curated_tea_reviews WHERE product_id='partner' ORDER BY id DESC LIMIT 1;")=='withdrawn:supplier_changed'
assert run("SELECT available FROM public.catalog_products WHERE id='partner';")=='f'
print('PASS: concurrent approval and supplier change serializes to withdrawal')

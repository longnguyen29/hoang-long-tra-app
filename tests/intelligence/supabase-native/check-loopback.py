#!/usr/bin/env python3
"""Check every TCP listener owned by this isolated stack's process tree."""
import glob, json, subprocess, sys
from pathlib import Path
from urllib.parse import urlparse

root=Path(sys.argv[1]).resolve()
owners=glob.glob(str(root/'stacks/*/owner.json'))
if len(owners)!=1:
    raise SystemExit('REFUSED: isolated stack owner not uniquely identified')
pid=int(json.loads(Path(owners[0]).read_text())['pid'])
rows=subprocess.check_output(['ps','-Ao','pid=,ppid='],text=True).splitlines()
children={}
for row in rows:
    child,parent=(int(value) for value in row.split())
    children.setdefault(parent,[]).append(child)
todo=[pid]; pids=set()
while todo:
    current=todo.pop()
    if current in pids: continue
    pids.add(current); todo.extend(children.get(current,[]))
if len(pids)<2:
    raise SystemExit('REFUSED: isolated stack process tree missing')
result=subprocess.run(['lsof','-nP','-a','-p',','.join(map(str,sorted(pids))),'-iTCP','-sTCP:LISTEN','-Fpn'],text=True,capture_output=True)
if result.returncode not in (0,1):
    raise SystemExit('REFUSED: cannot inspect local listeners')
names=[line[1:] for line in result.stdout.splitlines() if line.startswith('n')]
if not names or any(not (item.startswith('127.0.0.1:') or item.startswith('[::1]:')) for item in names):
    raise SystemExit('REFUSED: stack listener missing or not bound to loopback')
state=json.loads(Path(sys.argv[2]).read_text())
expected=set()
for key in ('API_URL','DB_URL'):
    url=urlparse(state[key])
    if url.hostname!='127.0.0.1' or not url.port:
        raise SystemExit('REFUSED: advertised endpoint is not loopback')
    expected.add('127.0.0.1:'+str(url.port))
if not expected.issubset(set(names)):
    raise SystemExit('REFUSED: advertised API/DB endpoint is not owned by this stack')
print('PASS: stack process-tree TCP listeners bind loopback and own advertised API/DB ports')

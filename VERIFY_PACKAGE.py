#!/usr/bin/env python3
"""Verify PCS v3 extracted folder SHA256 manifest; no external dependencies."""
from hashlib import sha256
from pathlib import Path
import sys
root=Path(__file__).resolve().parent
manifest=root/'MANIFEST.sha256'
if not manifest.exists():print('Missing manifest');sys.exit(1)
n=0;failed=[]
for line in manifest.read_text().splitlines():
 if not line.strip():continue
 digest,rel=line.split('  ',1)
 fp=root/rel
 if not fp.is_file():failed.append(f'MISSING {rel}');continue
 actual=sha256(fp.read_bytes()).hexdigest()
 if actual!=digest:failed.append(f'MISMATCH {rel}')
 n+=1
extra=[str(p.relative_to(root)) for p in root.rglob('*') if p.is_file() and p!=manifest and p.name!='.DS_Store' and '.git' not in p.relative_to(root).parts and str(p.relative_to(root)) not in [l.split('  ',1)[1] for l in manifest.read_text().splitlines() if '  ' in l]]
if extra:failed.extend(['EXTRA '+x for x in extra])
print(f'PCS3 package: {n} files verified. Failures: {len(failed)}')
for f in failed:print(f)
sys.exit(1 if failed else 0)

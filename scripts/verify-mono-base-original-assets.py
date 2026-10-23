#!/usr/bin/env python3
"""Verify that imported MONO BASE v3.4 images are byte-identical to the original archive."""
import argparse
import hashlib
from pathlib import Path

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('directory',type=Path,nargs='?',default=Path('mono-base'))
    args=parser.parse_args()
    root=args.directory
    manifest=root/'ASSET_MANIFEST.sha256'
    if not manifest.is_file():
        raise SystemExit(f'Missing SHA-256 manifest: {manifest}')
    expected={}
    for line in manifest.read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'):continue
        sha,relative=line.split(maxsplit=1)
        if not relative.startswith('assets/') or relative in expected:
            raise SystemExit('Invalid or duplicate manifest entry: '+relative)
        expected[relative]=sha.lower()
    if len(expected)!=13:
        raise SystemExit(f'Expected 13 original image filenames; found {len(expected)}')
    found={p.relative_to(root).as_posix() for p in (root/'assets').rglob('*') if p.is_file()}
    if found!=set(expected):
        raise SystemExit(f'Unexpected/missing assets: missing={sorted(set(expected)-found)}, extra={sorted(found-set(expected))}')
    hashes=set()
    for relative,want in sorted(expected.items()):
        source=root/relative
        if source.is_symlink():raise SystemExit('Symbolic link forbidden: '+relative)
        data=source.read_bytes()
        if not data.startswith(b'\xff\xd8\xff') or len(data)>20_000_000:
            raise SystemExit('Invalid/oversized JPEG: '+relative)
        got=hashlib.sha256(data).hexdigest()
        if got!=want:raise SystemExit(f'SHA-256 mismatch {relative}: expected {want}, got {got}')
        hashes.add(got)
    if len(hashes)!=6:
        raise SystemExit(f'Expected 6 unique original JPEG payloads, got {len(hashes)}')
    print('PASS MONO BASE v3.4: 13 unmodified image files, 6 distinct SHA-256 payloads')

if __name__=='__main__':
    main()

#!/usr/bin/env python3
"""Import a reviewed MONO BASE v3.4 ZIP into mono-base/ without modifying KAITO root."""
import argparse
from pathlib import Path
from zipfile import ZipFile
from collections import Counter
import hashlib
from stat import S_IFMT, S_IFLNK
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

REQUIRED = {'index.html','aircraft.html','robotics.html','space.html',
            'design-lab.html','technology.html','journal.html','about.html',
            'cad-viewer.html','site.css'}
class Refs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs=[]
    def handle_starttag(self,tag,attrs):
        for k,v in attrs:
            if k in ('href','src') and v:
                self.refs.append(v)

def main():
    p=argparse.ArgumentParser()
    p.add_argument('zip_file',type=Path)
    p.add_argument('--destination',type=Path,default=Path('mono-base'))
    p.add_argument('--apply',action='store_true',help='Copy verified files (default is dry run)')
    p.add_argument('--assets-only',action='store_true',
                   help='Import only the original image assets; retain newer HTML/CSS/viewer')
    p.add_argument('--overwrite-pages',action='store_true',
                   help='Explicitly allow replacing existing HTML, CSS and scripts')
    args=p.parse_args()
    if args.assets_only and args.overwrite_pages:
        raise SystemExit('--assets-only and --overwrite-pages are mutually exclusive')
    with ZipFile(args.zip_file) as z:
        entries=[i for i in z.infolist() if not i.is_dir()]
        names=[i.filename for i in entries]
        duplicates=[n for n,count in Counter(names).items() if count>1]
        if duplicates: raise SystemExit('Duplicate archive members: '+str(duplicates))
        for entry in entries:
            name=entry.filename
            if name.startswith('/') or '\\' in name or '..' in Path(name).parts or not name:
                raise SystemExit('Unsafe ZIP path: '+name)
            if S_IFMT(entry.external_attr >> 16)==S_IFLNK:
                raise SystemExit('ZIP symbolic links are not allowed: '+name)
        members=set(names)
        missing=REQUIRED-members
        if missing: raise SystemExit('Missing required files: '+str(sorted(missing)))
        images=sorted(n for n in members if n.startswith('assets/') and n.lower().endswith(('.jpg','.png','.webp')))
        if len(images)!=13: raise SystemExit(f'Expected 13 image files, got {len(images)}')
        manifest_file=args.destination/'ASSET_MANIFEST.sha256'
        if not manifest_file.is_file():
            raise SystemExit('Missing original-image SHA manifest: '+str(manifest_file))
        expected={}
        for line in manifest_file.read_text(encoding='utf-8').splitlines():
            if not line.strip() or line.startswith('#'): continue
            digest,name=line.split(maxsplit=1)
            name=name.lstrip('*')
            if name in expected:raise SystemExit('Duplicate image in SHA manifest: '+name)
            expected[name]=digest.lower()
        if set(images)!=set(expected):
            raise SystemExit('Original-image manifest names differ from ZIP assets')
        for name in images:
            data=z.read(name)
            ext=Path(name).suffix.lower()
            signature_ok=(
                data.startswith(b'\x89PNG\r\n\x1a\n') if ext=='.png' else
                data.startswith(b'\xff\xd8\xff') if ext=='.jpg' else
                data.startswith(b'RIFF') and data[8:12]==b'WEBP'
            )
            if not signature_ok: raise SystemExit('Invalid image signature: '+name)
            if len(data)>20_000_000: raise SystemExit('Oversized asset (>20MB): '+name)
            digest=hashlib.sha256(data).hexdigest()
            if digest!=expected[name]:
                raise SystemExit('Original image SHA256 mismatch: '+name)
        bad=[]
        for name in sorted(n for n in members if n.endswith('.html')):
            parser=Refs()
            parser.feed(z.read(name).decode('utf-8'))
            for ref in parser.refs:
                parsed=urlsplit(ref)
                if parsed.scheme or parsed.netloc or ref.startswith(('#','/','data:','mailto:','tel:')):continue
                target=(Path(name).parent/unquote(parsed.path)).as_posix()
                if parsed.path and target not in members: bad.append((name,ref))
        if bad: raise SystemExit('Broken references: '+str(bad))
        print(f'Validated {len(members)} files, {len(images)} SHA-pinned original images; no broken local links')
        selected=images if args.assets_only else sorted(members)
        conflicts=[]
        for name in selected:
            dest=args.destination/name
            if dest.is_file() and dest.read_bytes()!=z.read(name):
                if name.startswith('assets/'):
                    conflicts.append(name+' (asset already exists with different bytes)')
                elif not args.overwrite_pages:
                    conflicts.append(name+' (existing source differs; --overwrite-pages required)')
        if conflicts:
            raise SystemExit('Refusing silent overwrite:\n'+'\n'.join(conflicts))
        print(f'Import candidate: {len(selected)} files; mode='+('assets-only' if args.assets_only else 'full'))
        if not args.apply:
            print('DRY RUN: use --apply to copy into',args.destination)
            return
        for name in selected:
            dest=args.destination/name
            dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_bytes(z.read(name))
        print('Imported into',args.destination)
if __name__=='__main__':
    main()

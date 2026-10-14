#!/usr/bin/env python3
"""Import a reviewed MONO BASE v3.4 ZIP into mono-base/ without modifying KAITO root."""
import argparse
from pathlib import Path
from zipfile import ZipFile
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
    args=p.parse_args()
    with ZipFile(args.zip_file) as z:
        members={n for n in z.namelist() if not n.endswith('/')}
        missing=REQUIRED-members
        if missing: raise SystemExit('Missing required files: '+str(sorted(missing)))
        images=sorted(n for n in members if n.startswith('assets/') and n.lower().endswith(('.jpg','.png','.webp')))
        if len(images)!=13: raise SystemExit(f'Expected 13 image files, got {len(images)}')
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
        print(f'Validated {len(members)} files, {len(images)} images; no broken local links')
        if not args.apply:
            print('DRY RUN: use --apply to copy into',args.destination)
            return
        for name in sorted(members):
            if name.startswith('/') or '..' in Path(name).parts:raise SystemExit('Unsafe ZIP path: '+name)
            dest=args.destination/name
            dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_bytes(z.read(name))
        print('Imported into',args.destination)
if __name__=='__main__':
    main()

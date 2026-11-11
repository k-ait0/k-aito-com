#!/usr/bin/env python3
"""Fed Board H10 DDP archival ZIP research probe. Metadata-only stdout.
Do not change the live source lock or distribute the raw archive.
"""
import hashlib,html,io,json,os,pathlib,re,sys,urllib.parse,urllib.request,zipfile
from html.parser import HTMLParser

CATALOG="https://www.federalreserve.gov/datadownload/Choose.aspx?rel=H10"
MAX_BYTES=40_000_000
class Anchors(HTMLParser):
    def __init__(self): super().__init__();self.current=None;self.links=[]
    def handle_starttag(self,tag,attrs):
        if tag=="a":self.current={"href":dict(attrs).get("href",""),"text":""}
    def handle_data(self,data):
        if self.current is not None:self.current["text"]+=data
    def handle_endtag(self,tag):
        if tag=="a" and self.current is not None:self.links.append(self.current);self.current=None

def get(url,maxbytes):
    request=urllib.request.Request(url,headers={"User-Agent":"Kaito-Analytics-Fed-H10-Research-Probe/0.1","Accept":"application/zip,text/html,*/*"})
    with urllib.request.urlopen(request,timeout=45) as r:
        final=r.geturl()
        u=urllib.parse.urlparse(final)
        if u.scheme!="https" or u.hostname!="www.federalreserve.gov":raise RuntimeError("Unofficial redirect "+final)
        raw=r.read(maxbytes+1)
        if len(raw)>maxbytes:raise RuntimeError("Response exceeds bounded size")
        return raw,{"url":final,"status":r.status,"content_type":r.headers.get("Content-Type",""),"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest()}
def main():
    page,meta=get(CATALOG,2_000_000)
    parser=Anchors();parser.feed(page.decode("utf-8","replace"))
    candidates=[x for x in parser.links if "Download all" in x["text"] and "XML" in x["text"]]
    # The main text and the anchor sometimes wrap separately, so inspect all official Output.aspx links.
    for item in parser.links:
        if "Output.aspx" in item["href"] and "H10" in item["href"].upper():
            candidates.append(item)
    print("CATALOGUE",{**meta,"candidate_anchors":candidates[:8],"total_anchors":len(parser.links)})
    urls=[]
    for c in candidates:
        href=html.unescape(c["href"])
        link=urllib.parse.urljoin(CATALOG,href)
        u=urllib.parse.urlparse(link)
        if u.scheme=="https" and u.hostname=="www.federalreserve.gov" and u.path.lower()=="/datadownload/output.aspx":
            q=urllib.parse.parse_qs(u.query)
            if q.get("rel",[""])[0].upper()=="H10" and q.get("filetype",[""])[0].lower()=="zip":urls.append(link)
    if len(set(urls))!=1:raise RuntimeError("No unique official ZIP output hyperlink; candidates="+str(candidates[:4]))
    url=urls[0]
    raw,source=get(url,MAX_BYTES)
    if raw[:4]!=b"PK\x03\x04":raise RuntimeError("Official endpoint returned non-ZIP payload (no fallback)")
    if not zipfile.is_zipfile(io.BytesIO(raw)):raise RuntimeError("Invalid ZIP")
    dest=pathlib.Path(os.environ.get("ANALYTICS_PRIVATE_DATA_DIR","")).resolve()
    workspace=pathlib.Path(os.environ["GITHUB_WORKSPACE"]).resolve()
    if not os.environ.get("ANALYTICS_PRIVATE_DATA_DIR") or dest==workspace or dest in workspace.parents or workspace in dest.parents:raise RuntimeError("Unsafe private directory")
    dest.mkdir(parents=True,exist_ok=True,mode=0o700)
    target=dest/"H10_FULL_DDP_CANDIDATE_RAW.zip"
    with target.open("xb") as f:f.write(raw)
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        info=[{"name":n.filename,"compressed":n.compress_size,"uncompressed":n.file_size} for n in z.infolist()]
    provenance={"status":"RESEARCH_CANDIDATE_ONLY_NO_SOURCE_CHANGE","origin":"Federal Reserve Board","official_link_from_catalogue":url,"catalogue_url":CATALOG,"source":source,"zip_entries":info,"public_site_approved":False,"adr_status":"DRAFT_UNAPPROVED"}
    (dest/"provenance.json").write_text(json.dumps(provenance,indent=2)+"\n",encoding="utf-8")
    print("FED_H10_ZIP_ACQUIRED_RESEARCH",json.dumps(provenance))
if __name__=="__main__":
    try:main()
    except Exception as e:print("FED_H10_DDP_PROBE_FAILED",type(e).__name__,str(e),file=sys.stderr);sys.exit(1)

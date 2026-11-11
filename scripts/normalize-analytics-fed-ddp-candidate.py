#!/usr/bin/env python3
"""Isolated Fed Board H10 native DDP DAILY Japanese yen research candidate normalization.
No ADR adoption, no public dissemination, no FRED/provider fallback.
"""
import csv,datetime,hashlib,io,json,os,pathlib,re,sys,zipfile,xml.etree.ElementTree as ET
from decimal import Decimal, InvalidOperation

SERIES_NAME="RXI_N.B.JA"
SOURCE_URL="https://www.federalreserve.gov/datadownload/Output.aspx?rel=H10&filetype=zip"
PINNED_URL="https://www.federalreserve.gov/releases/h10/hist/dat00_ja.htm"
CSV_HEADER=["month","series_id","value","unit","currency","series_kind","origin","source_id","seasonal_adjustment","raw_response_sha256","footnote_codes"]

def digest(b):return hashlib.sha256(b).hexdigest()
def verify_iso(date):
    if not re.fullmatch(r"\d{4}-\d\d-\d\d",date):raise ValueError("Unexpected date syntax "+date)
    if datetime.date.fromisoformat(date).isoformat()!=date:raise ValueError("Invalid date "+date)
def seq_month(m):return int(m[:4])*12+int(m[5:7])-1
def normalise(private_dir):
    d=pathlib.Path(private_dir).resolve()
    if not d.is_absolute() or not d.is_dir():raise ValueError("Expected existing absolute private directory")
    root=pathlib.Path(__file__).resolve().parent.parent
    if d==root or root in d.parents or d in root.parents:raise ValueError("Private output overlaps repository")
    src=d/"H10_FULL_DDP_CANDIDATE_RAW.zip"
    meta=json.loads((d/"provenance.json").read_text("utf-8"))
    raw=src.read_bytes()
    if meta.get("official_link_from_catalogue")!=SOURCE_URL or meta["source"]["sha256"]!=digest(raw):
        raise ValueError("DDP source URL/SHA changed")
    if meta.get("adr_status")!="DRAFT_UNAPPROVED" or meta.get("public_site_approved") is not False:
        raise ValueError("Public rights/source migration prematurely enabled")
    if not zipfile.is_zipfile(src):raise ValueError("Not ZIP")
    with zipfile.ZipFile(src) as z:
        if set(z.namelist())!={"H10_H10.xsd","H10_data.xml","H10_struct.xml","frb_common.xsd"}:raise ValueError("Unexpected ZIP entries")
        if z.getinfo("H10_data.xml").file_size>60_000_000:raise ValueError("Oversized decompressed XML")
        found=0;items=[];prepared=None
        with z.open("H10_data.xml") as f:
            for _,elem in ET.iterparse(f,events=("end",)):
                tag=elem.tag.rsplit("}",1)[-1]
                if tag=="Prepared" and prepared is None:prepared=(elem.text or "").strip()
                if tag=="Series":
                    a=elem.attrib
                    if a.get("SERIES_NAME")==SERIES_NAME:
                        found+=1
                        if found!=1 or a.get("FREQ")!="9" or a.get("FX")!="JPY" or a.get("CURRENCY")!="JPY":
                            raise ValueError("Wrong daily JPY series identity/metadata")
                        if a.get("UNIT_MULT")!="1":raise ValueError("Wrong exchange-rate multiplier")
                        for x in elem:
                            if x.tag.rsplit("}",1)[-1]!="Obs":continue
                            item=x.attrib;date=item["TIME_PERIOD"];verify_iso(date)
                            if items and date<=items[-1][0]:raise ValueError("Duplicate/out-of-order daily date")
                            status=item.get("OBS_STATUS");value=item.get("OBS_VALUE")
                            if status=="ND":
                                if value!="-9999":raise ValueError("Unexpected missing sentinel at "+date)
                                items.append((date,"",status));continue
                            if status!="A":raise ValueError("Unknown Fed OBS_STATUS "+str(status))
                            try:v=Decimal(value)
                            except (InvalidOperation,ValueError,TypeError):raise ValueError("Unparseable FX at "+date)
                            if not v.is_finite() or not 0<v<1000:raise ValueError("Invalid Fed FX level at "+date)
                            items.append((date,value,"OK"))
                    elem.clear()
                elif tag in ("Obs",): # avoid clearing observations before enclosing Series end
                    pass
    if found!=1 or not items or items[0][0]!="1971-01-04":raise ValueError("Wrong Japanese yen 1971 onset")
    pinned_dirs=list(d.glob("FED_H10_USDJPY__*/usdjpy_daily.csv"))
    if len(pinned_dirs)!=1:raise ValueError("Pinned historical H10 daily CSV required exactly once")
    pinned_path=pinned_dirs[0]
    pinned_meta=json.loads((pinned_path.parent/"provenance.json").read_text("utf-8"))
    pinned_html=(pinned_path.parent/"source_RAW.html").read_bytes()
    if (pinned_meta.get("source_url")!=PINNED_URL or
        digest(pinned_html)!=pinned_meta.get("raw_sha256") or
        pinned_meta.get("publication_approved") is not False):
        raise ValueError("Old H10 URL/provenance changed")
    pinned=list(csv.DictReader(pinned_path.open(encoding="utf-8",newline="")))
    if not pinned or pinned[0]["date"]!="2000-01-03":raise ValueError("Unexpected original pinned H10 range")
    by_date={x[0]:x for x in items}
    differences=[]
    for row in pinned:
        dt=row["date"]
        if dt not in by_date:
            differences.append((dt,"missing_date"));continue
        _,value,status=by_date[dt]
        if row["status"]!=status or (status=="OK" and Decimal(row["usd_jpy"])!=Decimal(value)) or (status=="ND" and row["usd_jpy"]!=""):
            differences.append((dt,"value_or_status"))
    if differences or len(pinned)<5000:raise ValueError("Overlap with pinned Fed H10 mismatch: "+str(differences[:8]))
    months={}
    for date,value,status in items:
        if status=="OK":months[date[:7]]=(date,value)
    dates=sorted(months)
    if not dates or dates[0]!="1971-01" or dates[-1][:7]!="2026-11":
        raise ValueError("Unexpected current Fed complete or provisional coverage")
    for first,second in zip(dates,dates[1:]):
        if seq_month(second)!=seq_month(first)+1:raise ValueError("Missing observed calendar month "+second)
    complete=[m for m in dates if m<="2026-10"]
    if len(complete)!=670:raise ValueError("Expected 670 complete months through 2026-10")
    buf=io.StringIO(newline="");w=csv.writer(buf,lineterminator="\n");w.writerow(CSV_HEADER)
    for month in complete:
        _,value=months[month]
        w.writerow([month,"FED_H10_USDJPY_MONTH_END",value,"JPY_PER_USD","JPY","FX_RATE","OBSERVED","FED_BOARD","NOT_APPLICABLE",digest(raw),""])
    csvbytes=buf.getvalue().encode("utf-8")
    out=d/"fed_ddp_usdjpy_1971_2026_OCT_CANDIDATE_PRIVATE.csv"
    with out.open("xb") as f:f.write(csvbytes)
    nd=sum(x[2]=="ND" for x in items)
    report={"status":"RESEARCH_QA_PASSED_ADR_DRAFT_UNAPPROVED","publisher":"Federal Reserve Board","candidate_url":SOURCE_URL,"series_id":"H10/H10/RXI_N.B.JA","frequency":"DAILY","unit":"JPY_PER_USD","original_raw_zip_sha256":digest(raw),"previous_pinned_url":PINNED_URL,"previous_pinned_raw_sha256":pinned_meta["raw_sha256"],"raw_observations":len(items),"raw_valid":len(items)-nd,"raw_ND":nd,"first_day":items[0][0],"last_day":items[-1][0],"pinned_overlap_compared_days":len(pinned),"overlap_mismatches":0,"monthly_first":complete[0],"monthly_last":complete[-1],"complete_monthly_observations":len(complete),"provisional_excluded":"2026-11","missing_entire_months":0,"duplicate_days":0,"rolling_30y_start_months":len(complete)-360,"canonical_csv_sha256":digest(csvbytes),"canonical_csv_bytes":len(csvbytes),"zip_prepared":prepared,"rights":{"production_approved":False,"source_change_adr":"DRAFT_UNAPPROVED","commercial_analysis":"CONDITIONAL_LICENSE_REVIEW","raw_redistribution":False,"public_site":False},"data_origin":"OBSERVED_NO_IMPUTATION","source_lock_changed":False,"additional_notes":["ND -9999 never considered a tradeable or quoted rate","Monthly uses last observed daily value, not G5 monthly average","Potential political and FX historical regime changes must be modeled explicitly"]}
    out_report=d/"fed_ddp_candidate_QA_PRIVATE.json"
    with out_report.open("x",encoding="utf8") as f:json.dump(report,f,indent=2,ensure_ascii=False);f.write("\n")
    print("FED_H10_DDP_JPY_QA_PASS "+json.dumps({"daily":len(items),"valid":len(items)-nd,"ND":nd,"overlap":len(pinned),"mismatches":0,"monthly":len(complete),"first":complete[0],"last":complete[-1],"rolling30y":len(complete)-360,"canonical_sha256":digest(csvbytes),"adr":"DRAFT_UNAPPROVED"}))
    return report

if __name__=="__main__":
    try:
        if len(sys.argv)!=2:raise ValueError("Usage: normalize-analytics-fed-ddp-candidate.py /ABSOLUTE/PRIVATE_DIR")
        normalise(sys.argv[1])
    except Exception as ex:
        print("FED_H10_DDP_CANDIDATE_QA_FAILED",type(ex).__name__,str(ex),file=sys.stderr);sys.exit(1)

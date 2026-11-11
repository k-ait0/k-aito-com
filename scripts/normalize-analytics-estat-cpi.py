#!/usr/bin/env python3
"""Fail-closed private normalizer for two pinned Japanese CPI CSV files from e-Stat.
No network, no proxies, no missing-value imputation, and no publishing.
"""
import csv, hashlib, io, json, pathlib, re, sys

SERIES = (
    ("JP_CPI_HEADLINE_2025_LINKED", "CPI_JP_NATIONAL_2025_LINKED_HEADLINE", "000040482943", "0001", "総合", "197001", 681),
    ("JP_CPI_EX_RENT_2025_LINKED", "CPI_JP_NATIONAL_2025_LINKED_EX_RENT", "000040482944", "0163", "持家の帰属家賃を除く総合", "194608", 962),
)
FIELDS = ["month", "series_id", "value", "unit", "currency", "series_kind", "origin", "source_id", "seasonal_adjustment", "raw_response_sha256", "footnote_codes"]

def sha256(raw): return hashlib.sha256(raw).hexdigest()
def month_no(ym): return int(ym[:4])*12 + int(ym[4:6])-1
def iso(ym): return ym[:4]+"-"+ym[4:]

def normalize(private_dir):
    folder = pathlib.Path(private_dir).resolve()
    repo_root = pathlib.Path(__file__).resolve().parent.parent
    if folder == repo_root or folder in repo_root.parents or repo_root in folder.parents:
        raise ValueError("Private source/output cannot overlap Git checkout")
    series_report, joined, comparison, canonical_rows = [], {}, None, []
    for sid, source_dir_id, info_id, cat_code, label, first, expected_count in SERIES:
        matches = list(folder.glob(source_dir_id+"__*/source_RAW.csv"))
        if len(matches) != 1: raise ValueError("Expected one and only one pinned private source for "+sid)
        src=matches[0]; meta=json.loads((src.parent/"provenance.json").read_text(encoding="utf-8"))
        raw=src.read_bytes()
        url="https://www.e-stat.go.jp/stat-search/file-download?statInfId="+info_id+"&fileKind=1"
        if (meta.get("source_id"),meta.get("stat_infid"),meta.get("dataset_id"),meta.get("source_url")) != ("ESTAT", info_id, source_dir_id,url): raise ValueError("e-Stat pinned source drift")
        if meta.get("site_publication_approved") is not False or meta.get("private_only") is not True: raise ValueError("Source permissions unexpectedly changed")
        if meta.get("raw_sha256")!=sha256(raw) or meta.get("raw_bytes")!=len(raw): raise ValueError("Raw SHA/size mismatch")
        rows=list(csv.reader(io.StringIO(raw.decode("cp932"))))
        if len(rows)<7 or rows[0][0]!="類・品目" or rows[2][0]!="類・品目符号(Group/Item code)":
            raise ValueError("Unknown e-Stat CPI file structure")
        codes=rows[2]
        if codes.count(cat_code)!=1: raise ValueError("Category missing/ambiguous")
        ix=codes.index(cat_code)
        if rows[0][ix]!=label: raise ValueError("Unexpected Japanese category title")
        observations=[]; prefix_blanks=[]; prev=None; outliers=[]; all_data={}
        for r in rows[6:]:
            if len(r)!=len(rows[0]): raise ValueError("CSV column width changed")
            ym=r[0]
            if not re.fullmatch(r"(19|20)\d{4}",ym) or not 1<=int(ym[4:])<=12: raise ValueError("Bad monthly date")
            if prev is not None and month_no(ym)!=month_no(prev)+1: raise ValueError("Duplicate/missing calendar month")
            prev=ym
            value=r[ix]
            if value=="":
                if month_no(ym)>=month_no(first): raise ValueError("Unexplained missing month "+ym)
                prefix_blanks.append(ym); continue
            if not re.fullmatch(r"\d+(?:\.\d+)?",value) or float(value)<=0: raise ValueError("Invalid CPI "+ym)
            if observations:
                change=float(value)/float(observations[-1][1])-1
                if abs(change)>.20:outliers.append({"month":iso(ym),"rate":change})
            observations.append((ym,value))
            all_data[iso(ym)]=value
            canonical_rows.append([iso(ym),sid,value,"INDEX_2025_100","NOT_APPLICABLE","CPI_LEVEL","OBSERVED","ESTAT","NSA",sha256(raw),""])
        if (observations[0][0],observations[-1][0],len(observations))!=(first,"202609",expected_count):raise ValueError("Unexpected CPI history boundary / count")
        if len(observations) != month_no(observations[-1][0])-month_no(first)+1:raise ValueError("Observed continuity failed")
        if outliers:raise ValueError("Monthly jump >20%, independent review needed")
        if sid=="JP_CPI_HEADLINE_2025_LINKED":
            check_ix=codes.index("0163")
            comparison={iso(r[0]):r[check_ix] for r in rows[6:]}
        else:joined=all_data
        series_report.append({"dataset_id":sid,"stat_infid":info_id,"source_url":url,"raw_sha256":sha256(raw),"raw_bytes":len(raw),"encoding":"cp932","base_year":"2025=100","official_linked_history":True,"series_kind":"CPI_LEVEL","first_month":iso(first),"last_month":"2026-09","observed_months":len(observations),"prefix_unpublished_months":prefix_blanks,"missing_observed_months":[],"duplicates":0,"monthly_20pct_outliers":0,"verified_30y_starts":len(observations)-360,"site_publication_approved":False})
    overlap=sorted(set(comparison)&set(joined))
    differences=[m for m in overlap if comparison[m]!=joined[m]]
    if len(overlap)!=681 or differences:raise ValueError("Two independent files disagree on the 0163 ex-rent series")
    canonical_rows.sort(key=lambda r:(r[1],r[0]))
    csvfile=io.StringIO(newline=""); writer=csv.writer(csvfile,lineterminator="\n")
    writer.writerow(FIELDS);writer.writerows(canonical_rows)
    canonical=csvfile.getvalue().encode("utf-8")
    out_csv=folder/"JP_CPI_2025base_CANONICAL_PRIVATE.csv"
    with out_csv.open("xb") as f:f.write(canonical)
    report={"dataset_group":"ESTAT_JP_CPI_NATIONAL_2025_LINKED","source_id":"ESTAT","base_year":"2025=100","latest_available_observation":"2026-09","data_origin":"OFFICIAL_PUBLISHED_LINKED_INDEX","proxy_used":False,"imputation_used":False,"series":series_report,"crosscheck":{"item_code":"0163","overlap_months":len(overlap),"mismatch_months":len(differences),"pass":True},"canonical_csv_sha256":sha256(canonical),"canonical_csv_rows":len(canonical_rows),"canonical_csv_bytes":len(canonical),"commercial_use":"GENERALLY_ALLOWED_CONDITIONS_REVIEWED","publication_approved":False,"raw_csv_redistribution_approved":False,"private_only":True}
    with (folder/"JP_CPI_2025base_QA_PRIVATE.json").open("x",encoding="utf-8") as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write("\n")
    print("ESTAT_JP_CPI_QA_PASS "+json.dumps({"observations":len(canonical_rows),"series":[{"id":x["dataset_id"],"count":x["observed_months"],"first":x["first_month"],"last":x["last_month"],"complete_30y_starts":x["verified_30y_starts"]} for x in series_report],"crosscheck":report["crosscheck"],"csv_sha256":sha256(canonical),"publication_approved":False}))
    return report

if __name__=="__main__":
    try:
        if len(sys.argv)!=2:raise ValueError("Usage: normalize-analytics-estat-cpi.py /ABSOLUTE/PRIVATE_DIR")
        normalize(sys.argv[1])
    except Exception as e:
        print("ESTAT_JP_CPI_QA_FAILED",str(e),file=sys.stderr);sys.exit(1)

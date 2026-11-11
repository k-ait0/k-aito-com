#!/usr/bin/env python3
"""Standalone offline personal-use prototype, not an investable TR simulator.
Reads user-held official source CSVs only, never accesses a network or the public site.
Example:
python3 scripts/analytics-personal-cash-fx-cpi.py --personal-use --fx /private/fx.csv --jp-cpi /private/jp_cpi.csv --out /private/unique_results
Optional exploratory risk chart: --gold /private/gold_quarantine.csv --gold-exploratory
"""
import argparse,csv,datetime,hashlib,json,math,pathlib,statistics,sys
from decimal import Decimal, InvalidOperation
from collections import Counter

ROOT=pathlib.Path(__file__).resolve().parent.parent
FIELDS=("month","series_id","value","unit","currency","series_kind","origin","source_id","seasonal_adjustment","raw_response_sha256")
SPECS={
  "fx":dict(series_id="FED_H10_USDJPY_MONTH_END",origin="OBSERVED",unit="JPY_PER_USD",source_id="FED_BOARD",series_kind="FX_RATE"),
  "cpi":dict(series_id="JP_CPI_HEADLINE_2025_LINKED",origin="OBSERVED",unit="INDEX_2025_100",source_id="ESTAT",series_kind="CPI_LEVEL"),
  "gold":dict(series_id="WORLD_BANK_PINK_GOLD_USD_TROY_OZ",origin="PUBLISHED_LEVEL_STATUS_UNVERIFIED",unit="USD_PER_TROY_OZ",source_id="WORLD_BANK_PINK",series_kind="COMMODITY_SPOT")
}
def sha256(x):return hashlib.sha256(x).hexdigest()
def mnum(s):return int(s[:4])*12+int(s[5:7])-1
def parse(path,spec):
  file=pathlib.Path(path).expanduser().resolve()
  if not file.is_file():raise ValueError("Missing private CSV: "+str(file))
  raw=file.read_bytes()
  if len(raw)>35_000_000:raise ValueError("CSV too large")
  text=raw.decode("utf-8-sig")
  reader=csv.DictReader(text.splitlines())
  if reader.fieldnames is None or any(f not in reader.fieldnames for f in FIELDS):raise ValueError("Wrong private canonical CSV columns")
  values={};origin_codes=set();source_sha=set();rejected=0
  for row in reader:
    if row.get("series_id")!=spec["series_id"]:
      rejected+=1;continue
    for key in ("series_id","origin","unit","source_id","series_kind"):
      if row[key]!=spec[key]:raise ValueError("Unexpected "+key+" / "+str(row[key]))
    month=row["month"]
    try:yy,mm=map(int,month.split("-"))
    except ValueError:raise ValueError("Invalid month "+month)
    if not(1900<=yy<=2100 and 1<=mm<=12 and month==f"{yy:04d}-{mm:02d}"):raise ValueError("Nonmonthly key "+month)
    if month in values:raise ValueError("Duplicate month "+month)
    try:v=Decimal(row["value"])
    except InvalidOperation:raise ValueError("Nonnumeric "+month)
    if not v.is_finite() or v<=0:raise ValueError("Invalid level "+month)
    if len(row["raw_response_sha256"])!=64 or any(z not in "0123456789abcdef" for z in row["raw_response_sha256"]):raise ValueError("Raw hash not valid")
    origin_codes.add(row["origin"]);source_sha.add(row["raw_response_sha256"])
    values[month]=v
  if not values:raise ValueError("No requested series observations")
  dates=sorted(values)
  for a,b in zip(dates,dates[1:]):
    if mnum(b)!=mnum(a)+1:raise ValueError("Gap in requested series "+a+" / "+b)
  return values,{"file_sha256":sha256(raw),"series_id":spec["series_id"],"source":spec["source_id"],"raw_hash_count":len(source_sha),"first_month":dates[0],"last_month":dates[-1],"source_months":len(dates),"rows_other_series_ignored":rejected,"origin":spec["origin"]}
def summary_years(months,levels,horizon_years):
  delta=12*horizon_years
  vals=[]
  for i in range(delta,len(months)):
    ratio=levels[i]/levels[i-delta]
    vals.append(float(ratio))
  if not vals:return dict(windows=0)
  return {"windows":len(vals),"start_months":[months[0],months[-delta-1]],"horizon_years":horizon_years,
    "positive_nominal_level_change_share":round(sum(x>1 for x in vals)/len(vals),6),
    "min_multiple":round(min(vals),6),"median_multiple":round(statistics.median(vals),6),
    "max_multiple":round(max(vals),6)}
def execute(args):
  if not args.personal_use:raise ValueError("Use --personal-use explicitly; commercial or networked execution unsupported")
  if bool(args.gold)!=bool(args.gold_exploratory):raise ValueError("Gold needs both --gold and --gold-exploratory (quarantined published level)")
  out=pathlib.Path(args.out).expanduser().resolve()
  if out==ROOT or out in ROOT.parents or ROOT in out.parents:raise ValueError("Output must be outside repository")
  if out.exists():raise ValueError("Existing output directory; never overwrite private results")
  fx,fxm=parse(args.fx,SPECS["fx"]);cpi,cpim=parse(args.jp_cpi,SPECS["cpi"])
  gold=goldm=None
  if args.gold:gold,goldm=parse(args.gold,SPECS["gold"])
  months=sorted(set(fx)&set(cpi))
  if not months:raise ValueError("No common FX and JP CPI months")
  if gold is not None:months=sorted(set(months)&set(gold))
  for a,b in zip(months,months[1:]):
    if mnum(b)!=mnum(a)+1:raise ValueError("Gap in joined valid observed months")
  if len(months)<13:raise ValueError("Too little common history for analysis")
  start=months[0]
  fx0=fx[start];cpi0=cpi[start];gold0=gold[start] if gold else None
  fx_index=[];gold_index=[];rows=[]
  for m in months:
    # 1 USD held without interest, sold into JPY at monthly H10 last valid quote,
    # then deflated by official Japanese CPI. It is NOT a USD deposit total return.
    f=Decimal(100)*(fx[m]/fx0)*(cpi0/cpi[m])
    fx_index.append(f)
    r={"month":m,"usd_cash_real_jpy_index":format(f,'.9f'),"metric":"NO_USD_INTEREST_NO_TR"}
    if gold is not None:
      # Exploratory World Bank quotation: not a validated spot trade or gold investment TR.
      g=Decimal(100)*(gold[m]/gold0)*(fx[m]/fx0)*(cpi0/cpi[m])
      gold_index.append(g)
      r.update({"gold_published_exploratory_real_jpy_index":format(g,'.9f'),"gold_quality":"PUBLISHED_LEVEL_STATUS_UNVERIFIED"})
    rows.append(r)
  report={
   "purpose":"PERSONAL_OFFLINE_RESEARCH_ONLY","not_for_publication":True,
   "portfolio_total_return_simulation":False,"license_grant":False,
   "measure":"JPY purchasing-power relative index (100 at first common month)",
   "fx_measure":"1 USD held with zero interest; monthly Fed H10 USDJPY last valid daily quote",
   "cpi_measure":"e-Stat Japan national all-items CPI linked 2025=100",
   "months":len(months),"start":start,"end":months[-1],
   "usd_cash_purchasing_power_index_end":format(fx_index[-1],".6f"),
   "usd_cash_rolling_windows":{str(y):summary_years(months,fx_index,y) for y in (10,20,30)},
   "input_evidence":{"fx":fxm,"jp_cpi":cpim},
   "source_lock_note":"1971 Fed DDP remains ADR draft candidate; this private analysis is not an active registry source switch.",
   "warnings":[
     "Not a cash deposit return, no USD interest, FX fees, tax, or inflation index timing adjustment.",
     "JPY nominal rates and inflation are month-sampled independently, not investable close prices.",
     "Not for public display or redistribution. Personal study is not a blanket data vendor license."
   ]
  }
  if gold is not None:
    report["gold_published_exploratory"]={"end":format(gold_index[-1],".6f"),
      "windows":{str(y):summary_years(months,gold_index,y) for y in (10,20,30)},
      "input_evidence":goldm,"classification":"PUBLISHED_LEVEL_STATUS_UNVERIFIED",
      "not_an_investable_gold_total_return":True}
    report["warnings"].append("World Bank Gold source Description contains forecast-series marker and 2025-06 methodology break; NEVER claim all months are confirmed spot trades.")
  out.mkdir(parents=True,mode=0o700)
  path=out/"personal_purchasing_power_monthly_PRIVATE.csv"
  columns=list(rows[0])
  with path.open("x",encoding="utf-8",newline="") as f:
    w=csv.DictWriter(f,fieldnames=columns,lineterminator="\n");w.writeheader();w.writerows(rows)
  report["normalized_output_sha256"]=sha256(path.read_bytes())
  with (out/"personal_purchasing_power_QA_PRIVATE.json").open("x",encoding="utf8") as f:json.dump(report,f,indent=2,ensure_ascii=False);f.write("\n")
  print(json.dumps({"qa":"PASS_PERSONAL_ONLY","months":len(months),"start":start,"end":months[-1],
    "usd_cash_real_index_end":report["usd_cash_purchasing_power_index_end"],
    "usd_cash_30y_windows":report["usd_cash_rolling_windows"]["30"]["windows"],
    "gold_included":gold is not None,"production_approved":False}))
  return report
if __name__=="__main__":
  p=argparse.ArgumentParser(description=__doc__)
  p.add_argument("--personal-use",action="store_true");p.add_argument("--fx",required=True)
  p.add_argument("--jp-cpi",required=True);p.add_argument("--out",required=True)
  p.add_argument("--gold");p.add_argument("--gold-exploratory",action="store_true")
  try:execute(p.parse_args())
  except Exception as e:print("PRIVATE_ANALYTICS_FAILED "+str(e),file=sys.stderr);sys.exit(1)

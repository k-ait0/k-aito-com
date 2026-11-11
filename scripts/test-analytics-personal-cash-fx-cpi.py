#!/usr/bin/env python3
"""Offline-only, fully synthetic QA. No real published index data stored in repo."""
import csv,importlib.util,json,pathlib,tempfile,types,unittest
from decimal import Decimal

module_file=pathlib.Path(__file__).parent/"analytics-personal-cash-fx-cpi.py"
spec=importlib.util.spec_from_file_location("personal_cash",module_file)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
COLS=["month","series_id","value","unit","currency","series_kind","origin","source_id","seasonal_adjustment","raw_response_sha256","footnote_codes"]
SHA="1"*64

def create_fixtures(dest):
    rows={"fx":[],"cpi":[],"gold":[]}
    for i in range(372):
        yr=1980+(i//12);mn=(i%12)+1;month=f"{yr:04d}-{mn:02d}"
        # Explicitly synthetic monotonic levels: FX growth 0.2%/month, CPI grows 0.1%/month.
        for key,v in (("fx",Decimal(100)*Decimal("1.002")**i),
                      ("cpi",Decimal(50)*Decimal("1.001")**i),
                      ("gold",Decimal(500)*Decimal("1.003")**i)):
            d=mod.SPECS[key]
            rows[key].append(dict(month=month,series_id=d["series_id"],value=str(v),
              unit=d["unit"],currency="JPY" if key=="fx" else "USD" if key=="gold" else "NOT_APPLICABLE",
              series_kind=d["series_kind"],origin=d["origin"],source_id=d["source_id"],
              seasonal_adjustment="NSA" if key=="cpi" else "NOT_APPLICABLE",
              raw_response_sha256=SHA,footnote_codes=""))
    files={}
    for key,data in rows.items():
        f=dest/(key+".csv")
        with f.open("w",encoding="utf8",newline="") as w:
            writer=csv.DictWriter(w,fieldnames=COLS,lineterminator="\n");writer.writeheader();writer.writerows(data)
        files[key]=str(f)
    return files
def arg(files,out,**kwargs):
    return types.SimpleNamespace(personal_use=kwargs.get("personal_use",True),
     fx=files["fx"],jp_cpi=files["cpi"],gold=files["gold"] if kwargs.get("gold",False) else None,
     gold_exploratory=kwargs.get("gold_exploratory",False),out=str(out))
class PersonalOnlyTests(unittest.TestCase):
    def test_no_gold_standard_real_fx_index_and_windows(self):
        with tempfile.TemporaryDirectory() as temp:
            base=pathlib.Path(temp);f=create_fixtures(base)
            qa=mod.execute(arg(f,base/"private"))
            self.assertEqual(qa["months"],372)
            self.assertEqual(qa["usd_cash_rolling_windows"]["30"]["windows"],12)
            self.assertEqual(qa["usd_cash_rolling_windows"]["10"]["windows"],252)
            self.assertEqual(qa["start"],"1980-01")
            self.assertEqual(qa["end"],"2010-12")
            self.assertGreater(float(qa["usd_cash_purchasing_power_index_end"]),100)
            self.assertFalse(qa["portfolio_total_return_simulation"])
            self.assertTrue(qa["not_for_publication"])
            rows=list(csv.DictReader((base/"private"/"personal_purchasing_power_monthly_PRIVATE.csv").open()))
            self.assertEqual(rows[0]["usd_cash_real_jpy_index"],"100.000000000")
            self.assertEqual(len(rows),372)
            self.assertNotIn("gold_published_exploratory_real_jpy_index",rows[0])
    def test_gold_requires_explicit_risk_acknowledgement(self):
        with tempfile.TemporaryDirectory() as temp:
            base=pathlib.Path(temp);f=create_fixtures(base)
            with self.assertRaisesRegex(ValueError,"Gold needs both"):
                mod.execute(arg(f,base/"failure",gold=True))
            qa=mod.execute(arg(f,base/"success",gold=True,gold_exploratory=True))
            self.assertEqual(qa["gold_published_exploratory"]["classification"],"PUBLISHED_LEVEL_STATUS_UNVERIFIED")
            self.assertTrue(qa["gold_published_exploratory"]["not_an_investable_gold_total_return"])
    def test_rejects_nonpersonal_overwrite_gap_and_invalid_origins(self):
        with tempfile.TemporaryDirectory() as temp:
            base=pathlib.Path(temp);f=create_fixtures(base)
            with self.assertRaisesRegex(ValueError,"personal-use"):
                mod.execute(arg(f,base/"denied",personal_use=False))
            good=mod.execute(arg(f,base/"ok"))
            with self.assertRaisesRegex(ValueError,"Existing output"):
                mod.execute(arg(f,base/"ok"))
            with open(f["fx"],encoding="utf8",newline="") as rf:
                values=list(csv.DictReader(rf))
            values[7]["origin"]="PUBLISHED_LEVEL_STATUS_UNVERIFIED"
            with open(f["fx"],"w",encoding="utf8",newline="") as wf:
                w=csv.DictWriter(wf,fieldnames=COLS,lineterminator="\n");w.writeheader();w.writerows(values)
            with self.assertRaisesRegex(ValueError,"Unexpected origin"):
                mod.execute(arg(f,base/"invalid"))
    def test_missing_month_in_sources_rejected_not_interpolated(self):
        with tempfile.TemporaryDirectory() as temp:
            base=pathlib.Path(temp);f=create_fixtures(base)
            with open(f["cpi"],encoding="utf8",newline="") as rf:rows=list(csv.DictReader(rf))
            rows=[r for r in rows if r["month"]!="1981-05"]
            with open(f["cpi"],"w",encoding="utf8",newline="") as wf:
                w=csv.DictWriter(wf,fieldnames=COLS,lineterminator="\n");w.writeheader();w.writerows(rows)
            with self.assertRaisesRegex(ValueError,"Gap"):
                mod.execute(arg(f,base/"invalid"))
if __name__=="__main__":unittest.main(verbosity=2)

#!/usr/bin/env python3
import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"scripts"/"audit-analytics-cpi-reference-schema-v035.py"
spec=importlib.util.spec_from_file_location("cpi_schema_v035",SOURCE)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class Schema(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix="cpi-v035-fixture-")
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.data=("id,202501,202607\n"+"x,100.000,101.234\n"*27).encode("cp932")
        self.csv=self.root/"synthetic.csv"
        self.csv.write_bytes(self.data)
        self.sha=hashlib.sha256(self.data).hexdigest()
    def run_check(self):
        return mod.verify_csv(self.csv,expected_sha=self.sha,expected_bytes=len(self.data))
    def test_synthetic_shape_flags_remain_unapproved(self):
        x=self.run_check()
        self.assertEqual(x["physical_line_count"],28)
        self.assertEqual(x["parsed_csv_row_count"],28)
        self.assertFalse(x["headline_series_column_mapped"])
        self.assertFalse(x["historical_asof_approved"])
        self.assertFalse(x["market_data_publication_approved"])
        self.assertNotIn("100.000",str(x))
    def test_wrong_sha_rejected(self):
        with self.assertRaisesRegex(ValueError,"SHA"):
            mod.verify_csv(self.csv,expected_sha="f"*64,expected_bytes=len(self.data))
    def test_wrong_size_rejected(self):
        with self.assertRaisesRegex(ValueError,"SHA/size"):
            mod.verify_csv(self.csv,expected_sha=self.sha,expected_bytes=len(self.data)+1)
    def test_wrong_line_count(self):
        data=b"id,202501,202607\nx,100,101\n"
        self.csv.write_bytes(data)
        with self.assertRaisesRegex(ValueError,"line count"):
            mod.verify_csv(self.csv,expected_sha=hashlib.sha256(data).hexdigest(),expected_bytes=len(data))
    def test_csv_report_private_and_overwrite_forbidden(self):
        d=self.root/"report.json"
        mod.write_report(self.run_check(),d)
        self.assertTrue(d.exists())
        with self.assertRaisesRegex(ValueError,"new absolute"):
            mod.write_report(self.run_check(),d)
    def test_source_symlink_rejected(self):
        alias=self.root/"alias.csv";alias.symlink_to(self.csv)
        with self.assertRaisesRegex(ValueError,"regular"):
            mod.verify_csv(alias,expected_sha=self.sha,expected_bytes=len(self.data))
    def test_repo_output_forbidden(self):
        with self.assertRaisesRegex(ValueError,"overlap repository"):
            mod.write_report(self.run_check(),ROOT/"NEVER_WRITE_v035.json")
    def test_plain_values_not_reported(self):
        r=self.run_check()
        text=str(r)
        self.assertNotIn("101.234",text)
        self.assertNotIn("x,100",text)

if __name__=="__main__":
    unittest.main(verbosity=2)

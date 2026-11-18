#!/usr/bin/env python3
"""Owner-local CPI 2025 reference CSV *schema inventory*, not a price-series approval.

Only supports the pinned captured bytes; results stay outside the repository.
The stdout never contains decoded CPI values or headers.
"""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import stat
import sys
import os

ROOT=Path(__file__).resolve().parents[1]
PIN_SHA="c5893ac45a0f124277d92c2ec286451be15ce0b7d5bbc84152e4f4226cedbce2"
PIN_BYTES=167310

def verify_csv(file, *, expected_sha=PIN_SHA, expected_bytes=PIN_BYTES):
    f=Path(file)
    if not f.is_absolute() or not f.is_file() or f.is_symlink():
        raise ValueError("CSV input must be a regular absolute local file")
    raw=f.read_bytes()
    if len(raw)!=expected_bytes or hashlib.sha256(raw).hexdigest()!=expected_sha:
        raise ValueError("Source SHA/size is not the pinned acquisition snapshot")
    if b"\x00" in raw or raw[:4] in (b"PK\x03\x04",b"%PDF"):
        raise ValueError("Not a plain CSV")
    try: text=raw.decode("cp932",errors="strict")
    except UnicodeDecodeError:
        text=raw.decode("shift_jis",errors="strict")
    if "202501" not in text or "202607" not in text:
        raise ValueError("Required source anchors missing")
    physical_lines=text.splitlines()
    if len(physical_lines)!=28:
        raise ValueError("Unexpected 2025 3dp snapshot physical line count")
    rows=list(csv.reader(io.StringIO(text, newline=""),strict=True))
    if len(rows)!=28:
        raise ValueError("Embedded multiline CSV fields need manual review")
    widths=[len(row) for row in rows]
    if not widths or any(x==0 or x>100000 for x in widths):
        raise ValueError("Unsafe or empty CSV rows")
    # This result does not include the sensitive/private actual source values.
    return {
        "schema":"ANALYTICS_V035_CPI_REFERENCE_SCHEMA_INVENTORY",
        "status":"PINNED_CSV_BYTES_VERIFIED_SCHEMA_REVIEW_REQUIRED",
        "official_source_attribution_verified":False,
        "source_sha256":hashlib.sha256(raw).hexdigest(),
        "source_bytes":len(raw),
        "encoding":"cp932_or_shift_jis",
        "physical_line_count":len(physical_lines),
        "parsed_csv_row_count":len(rows),
        "columns_by_row":widths,
        "nonempty_cells_by_row":[sum(bool(x.strip()) for x in row) for row in rows],
        "anchor_202501":True,
        "anchor_202607":True,
        "headline_series_column_mapped":False,
        "independent_normalization_verified":False,
        "historical_publication_vintage":False,
        "historical_asof_approved":False,
        "market_data_publication_approved":False,
    }

def write_report(report, out):
    p=Path(out)
    if not p.is_absolute() or p.is_symlink() or p.exists():
        raise ValueError("Output file must be a new absolute path")
    if not p.parent.is_dir() or p.parent.is_symlink():
        raise ValueError("Output folder must already exist and not be symlinked")
    repo=ROOT.resolve()
    folder=p.parent.resolve()
    if folder==repo or folder in repo.parents or repo in folder.parents:
        raise ValueError("Output cannot overlap repository")
    with p.open("x",encoding="utf-8") as fd:
        json.dump(report,fd,ensure_ascii=False,indent=2)
        fd.write("\n")
    if os.name!="nt":p.chmod(0o600)
    return p

def main(argv=None):
    ap=argparse.ArgumentParser(description="Pinned CPI reference CSV shape only; no observed values printed")
    ap.add_argument("--csv",type=Path,required=True)
    ap.add_argument("--report",type=Path,required=True)
    args=ap.parse_args(argv)
    try:
        report=verify_csv(args.csv)
        write_report(report,args.report)
        print("CPI_V035_PINNED_CSV_SCHEMA_INVENTORY_WRITTEN: column mapping still UNVERIFIED")
        return 0
    except (OSError,ValueError,UnicodeError,csv.Error):
        print("CPI_V035_SCHEMA_HOLD: pinned source / structure / output check failed",file=sys.stderr)
        return 2

if __name__=="__main__":
    sys.exit(main())

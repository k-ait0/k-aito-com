#!/usr/bin/env python3
"""v0.35: prepare verified *encrypted* research archives for owner-local restoration.

This tool never reads the private key, never decrypts, and never writes into the
repository. Source original ZIP bytes are retained. It accepts only the pinned
six-item retention bundle; no arbitrary data imports are supported by the CLI.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = "K_AITO_ANALYTICS_ENCRYPTED_RETENTION_V033"
# (artifact ID, basename in retention bundle, SHA-256, byte count)
PINS = (
    (13824035258, "K_Aito_Analytics_BLS_CPI_Encrypted_13824035258.zip",
     "eddb9243bd9a205d566cae0b99a2c7b3c2187bf5f9acc3915480ad50ccb291b4", 19509),
    (13824913073, "K_Aito_Analytics_JP_CPI_Encrypted_13824913073.zip",
     "48a79cddcb5b7364af6bb35138aadbb8e8c4c27879ba3df2b1c50f15e199db28", 99210),
    (13825223543, "K_Aito_Analytics_Fed_H10_Encrypted_13825223543.zip",
     "f6f059776d24587acb106cdba56a4e2046bb37e19fcbad7b9d7c156f988d78ba", 96555),
    (13825636423, "K_Aito_Analytics_WorldBank_Pink_Encrypted_13825636423.zip",
     "74d7e4a1ef002f4e8ea4fae0018540faffd3b47d19e3e0421652de14a86830d0", 558585),
    (13826880503, "K_Aito_Analytics_Fed_DDP_Candidate_Encrypted_13826880503.zip",
     "c70de121f3f12a174ec6d6b286bf1cb0eef1b66630b112c6110c5d141417aaa2", 2074189),
    (14037218574, "K_Aito_Analytics_CPI_2025_3DP_Encrypted_20261113.zip",
     "d65dab15b874f01c0980f001899e4327058d82128c97f698b02ad1a94e7750cb", 169555),
)
CPI_INNER = "JP_CPI_2025_3DP_REFERENCE_CANDIDATE_c5893ac45a0f1242.encrypted.json"
FIVE_NAMES = {
    13824035258: "bls_research_PRIVATE_ENCRYPTED.json",
    13824913073: "jpcpi_PRIVATE_ENCRYPTED.json",
    13825223543: "fed_h10_PRIVATE_ENCRYPTED.json",
    13825636423: "worldbank_pink_PRIVATE_ENCRYPTED.json",
    13826880503: "fed_ddp_PRIVATE_ENCRYPTED.json",
}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def within(p, root):
    return p == root or root in p.parents

def safe_parent(output):
    # A fresh output directory, outside the checkout, avoids plaintext key mixing
    # and accidental overwrite. Never accept a symlink parent or path component.
    if not output.is_absolute():
        raise ValueError("Absolute --out-dir required")
    if output.exists() or output.is_symlink():
        raise ValueError("Output already exists; refusing overwrite")
    parent = output.parent
    if not parent.is_dir():
        raise ValueError("Output parent must already exist")
    for p in (parent, *parent.parents):
        if p.is_symlink():
            raise ValueError("Symlinked output parent forbidden")
    real = parent.resolve(strict=True)
    repo = ROOT.resolve(strict=True)
    if within(real, repo) or within(repo, real):
        raise ValueError("Output cannot overlap repository")
    return real

def verified_zip(data, expected_member):
    with zipfile.ZipFile(__import__("io").BytesIO(data), "r") as z:
        entries = z.infolist()
        if len(entries) != 1 or entries[0].filename != expected_member:
            raise ValueError("Unexpected encrypted ZIP member")
        e = entries[0]
        if e.is_dir() or stat.S_ISLNK(e.external_attr >> 16):
            raise ValueError("Unsafe encrypted ZIP member")
        if e.file_size > 16_000_000 or e.compress_size > 16_000_000:
            raise ValueError("Oversized encrypted ZIP member")
        if z.testzip() is not None:
            raise ValueError("Encrypted ZIP CRC mismatch")
        blob = z.read(expected_member)
        if not blob.startswith(b"{") or not blob.rstrip().endswith(b"}"):
            raise ValueError("Encrypted envelope is not JSON")
        doc = json.loads(blob.decode("utf-8"))
        if not isinstance(doc, dict):
            raise ValueError("Invalid encrypted envelope object")
        return blob

def prepare(bundle, output, pins=PINS):
    bundle = Path(bundle)
    output = Path(output)
    if not bundle.is_absolute() or bundle.is_symlink() or not bundle.is_file():
        raise ValueError("Bundle must be a regular file at an absolute path")
    if bundle.stat().st_size > 12_000_000:
        raise ValueError("Retention bundle exceeds expected maximum")
    parent = safe_parent(output)
    expected_names = {"encrypted/" + name for _, name, _, _ in pins}
    with zipfile.ZipFile(bundle, "r") as z:
        infos = z.infolist()
        names = [e.filename for e in infos]
        if len(names) != len(set(names)) or set(names) != expected_names | {"MANIFEST_V033.json", "README_JA.txt"}:
            raise ValueError("Unexpected/duplicate retention bundle entries")
        if any(e.is_dir() or stat.S_ISLNK(e.external_attr >> 16) or e.file_size > 12_000_000
               for e in infos):
            raise ValueError("Unsafe retention bundle entry")
        if z.testzip() is not None:
            raise ValueError("Retention bundle CRC mismatch")
        manifest = json.loads(z.read("MANIFEST_V033.json").decode("utf-8"))
        if not isinstance(manifest, dict) or manifest.get("schema") != SCHEMA:
            raise ValueError("Unexpected retention manifest")
        indexed = manifest.get("items")
        if not isinstance(indexed, list) or len(indexed) != len(pins):
            raise ValueError("Incomplete manifest")
        by_name = {x.get("filename"): x for x in indexed if isinstance(x, dict)}
        if len(by_name) != len(pins):
            raise ValueError("Duplicate manifest records")
        verified = []
        for artifact_id, name, digest, size in pins:
            line = by_name.get(name)
            if not line or line.get("sha256") != digest or line.get("size_bytes") != size:
                raise ValueError("Retention manifest does not match fixed receipt")
            data = z.read("encrypted/" + name)
            if len(data) != size or sha(data) != digest:
                raise ValueError("Pinned encrypted archive SHA/size mismatch")
            member = CPI_INNER if artifact_id == 14037218574 else FIVE_NAMES[artifact_id]
            inner = verified_zip(data, member)
            verified.append((artifact_id, data, inner))
    stage = Path(tempfile.mkdtemp(prefix=".analytics_v035_stage_", dir=str(parent)))
    completed = False
    try:
        stage.chmod(0o700)
        archive_dir = stage / "encrypted"
        archive_dir.mkdir(mode=0o700)
        for artifact_id, original, inner in verified:
            filename = ("encrypted-cpi-reference-v030.zip" if artifact_id == 14037218574
                        else f"encrypted-artifact-{artifact_id}.zip")
            dst = archive_dir / filename
            with dst.open("xb") as fd:
                fd.write(original)
            if os.name != "nt":
                dst.chmod(0o600)
            if artifact_id == 14037218574:
                json_file = archive_dir / "cpi-reference-v030.encrypted.json"
                with json_file.open("xb") as fd:
                    fd.write(inner)
                if os.name != "nt":
                    json_file.chmod(0o600)
        report = {
            "schema": "ANALYTICS_V035_ENCRYPTED_LOCAL_INTAKE",
            "status": "ENCRYPTED_ONLY_VERIFIED_NOT_DECRYPTED",
            "artifact_count": len(verified),
            "encryption_verified": False,
            "plaintext_authenticated": False,
            "cpi_columns_mapped": False,
            "official_cpi_historical_vintages_approved": False,
            "owner_private_key_used": False,
            "real_jpy_qa_approved": False,
            "publication_approved": False,
            "pinned_archive_sha256": {str(i): sha(b) for i, b, _ in verified},
            "note": "Keep outside source repository. No plaintext or key processed."
        }
        report_file = stage / "ENCRYPTED_INTAKE_REPORT.json"
        with report_file.open("x", encoding="utf-8") as fd:
            json.dump(report, fd, ensure_ascii=False, indent=2)
            fd.write("\n")
        if os.name != "nt":
            report_file.chmod(0o600)
        os.replace(stage, output)
        completed = True
        return {"status": report["status"], "verified": len(verified),
                "output": str(output), "publication_approved": False}
    finally:
        if not completed:
            shutil.rmtree(stage, ignore_errors=True)

def main(argv=None):
    parser = argparse.ArgumentParser(description="Prepare six pinned encrypted archives offline; never reads a private key")
    parser.add_argument("--bundle", required=True, type=Path, help="absolute path to v0.33 six-item retention ZIP")
    parser.add_argument("--out-dir", required=True, type=Path, help="NEW private directory outside repository")
    args = parser.parse_args(argv)
    try:
        print(json.dumps(prepare(args.bundle, args.out_dir), ensure_ascii=False))
        return 0
    except (OSError, ValueError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
        # Do not log original data, content or key paths on error.
        print("ANALYTICS_V035_INTAKE_BLOCKED: encrypted receipt / input / output validation failed", file=sys.stderr)
        return 2

if __name__ == "__main__":
    sys.exit(main())

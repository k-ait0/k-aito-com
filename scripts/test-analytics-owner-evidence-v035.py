#!/usr/bin/env python3
"""Synthetic-only tests; no private key or observed source data is read."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare-analytics-owner-evidence-v035.py"
spec = importlib.util.spec_from_file_location("analytics_v035_intake", SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def zip_bytes(members):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for name, payload in members:
            z.writestr(name, payload)
    return buf.getvalue()

def fixture(root, kind=None):
    names = []
    pins = []
    manifest = []
    for i, (artifact, name, _, _) in enumerate(mod.PINS):
        expected = mod.CPI_INNER if i == 5 else mod.FIVE_NAMES[artifact]
        payload = json.dumps({"format": "FAKE_TEST_ONLY", "index": i}).encode()
        inner = zip_bytes([(expected, payload)])
        digest = hashlib.sha256(inner).hexdigest()
        pins.append((artifact, name, digest, len(inner)))
        names.append(("encrypted/" + name, inner))
        manifest.append({"filename": name, "size_bytes": len(inner), "sha256": digest})
    package = [("MANIFEST_V033.json", json.dumps({"schema": mod.SCHEMA, "items": manifest}).encode()),
               ("README_JA.txt", b"synthetic only")] + names
    if kind == "missing":
        package.pop()
    if kind == "extra":
        package.append(("../outside.txt", b"unsafe"))
    if kind == "duplicate":
        package.append(package[-1])
    if kind == "manifest_mismatch":
        manifest[0]["sha256"] = "a" * 64
        package[0] = ("MANIFEST_V033.json", json.dumps({"schema": mod.SCHEMA, "items": manifest}).encode())
    if kind == "bad_digest":
        old = package[2]
        package[2] = (old[0], old[1] + b"x")
    if kind == "wrong_inner":
        old = package[2]
        package[2] = (old[0], zip_bytes([("unexpected.json", b"{}")]))
        _, name, _, _ = pins[0]
        pins[0] = (pins[0][0], name, hashlib.sha256(package[2][1]).hexdigest(), len(package[2][1]))
        manifest[0]["size_bytes"] = len(package[2][1])
        manifest[0]["sha256"] = pins[0][2]
        package[0] = ("MANIFEST_V033.json", json.dumps({"schema": mod.SCHEMA, "items": manifest}).encode())
    bundle = root / "synthetic-retention.zip"
    bundle.write_bytes(zip_bytes(package))
    return bundle, tuple(pins)

class Intake(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="analytics-v035-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
    def package(self, kind=None):
        return fixture(self.root, kind)
    def test_valid_six_items_create_expected_encrypted_layout(self):
        bundle,pins=self.package()
        out=self.root/"result"
        result=mod.prepare(bundle,out,pins=pins)
        self.assertEqual(result["verified"],6)
        files={p.name for p in (out/"encrypted").iterdir()}
        expected={f"encrypted-artifact-{i}.zip" for i,_,_,_ in pins[:-1]}
        expected|={"encrypted-cpi-reference-v030.zip","cpi-reference-v030.encrypted.json"}
        self.assertEqual(files,expected)
        report=json.loads((out/"ENCRYPTED_INTAKE_REPORT.json").read_text())
        for key in ["owner_private_key_used","plaintext_authenticated","real_jpy_qa_approved","publication_approved"]:
            self.assertFalse(report[key])
        self.assertFalse(any(p.suffix==".pem" for p in out.rglob("*")))
    def test_repeat_refuses_overwrite(self):
        bundle,pins=self.package();out=self.root/"result"
        mod.prepare(bundle,out,pins=pins)
        with self.assertRaisesRegex(ValueError,"already exists"):
            mod.prepare(bundle,out,pins=pins)
    def test_missing_member(self):
        bundle,pins=self.package("missing")
        with self.assertRaisesRegex(ValueError,"entries"):
            mod.prepare(bundle,self.root/"result",pins=pins)
        self.assertFalse((self.root/"result").exists())
    def test_extra_traversal_member(self):
        bundle,pins=self.package("extra")
        with self.assertRaisesRegex(ValueError,"entries"):
            mod.prepare(bundle,self.root/"result",pins=pins)
    def test_duplicate_member(self):
        bundle,pins=self.package("duplicate")
        with self.assertRaisesRegex(ValueError,"entries"):
            mod.prepare(bundle,self.root/"result",pins=pins)
    def test_manifest_digest_mismatch(self):
        bundle,pins=self.package("manifest_mismatch")
        with self.assertRaisesRegex(ValueError,"manifest"):
            mod.prepare(bundle,self.root/"result",pins=pins)
    def test_archive_digest_mismatch(self):
        bundle,pins=self.package("bad_digest")
        with self.assertRaisesRegex(ValueError,"SHA/size"):
            mod.prepare(bundle,self.root/"result",pins=pins)
    def test_unexpected_encrypted_inner_member(self):
        bundle,pins=self.package("wrong_inner")
        with self.assertRaisesRegex(ValueError,"member"):
            mod.prepare(bundle,self.root/"result",pins=pins)
    def test_repo_output_refused(self):
        bundle,pins=self.package()
        with self.assertRaisesRegex(ValueError,"overlap repository"):
            mod.prepare(bundle,ROOT/"NEVER_CREATE_THIS_DIRECTORY_v035",pins=pins)
    def test_output_parent_must_exist(self):
        bundle,pins=self.package()
        with self.assertRaisesRegex(ValueError,"parent"):
            mod.prepare(bundle,self.root/"missing"/"result",pins=pins)
    def test_symlink_to_bundle_refused(self):
        bundle,pins=self.package()
        alias=self.root/"alias.zip";alias.symlink_to(bundle)
        with self.assertRaisesRegex(ValueError,"regular file"):
            mod.prepare(alias,self.root/"result",pins=pins)
    def test_symlink_parent_refused(self):
        bundle,pins=self.package()
        symlink=self.root/"alias";symlink.symlink_to(self.root,target_is_directory=True)
        with self.assertRaisesRegex(ValueError,"Symlinked"):
            mod.prepare(bundle,symlink/"result",pins=pins)
    def test_corrupted_outer_zip_refused(self):
        bundle,pins=self.package()
        bundle.write_bytes(bundle.read_bytes()[:-10])
        with self.assertRaises(zipfile.BadZipFile):
            mod.prepare(bundle,self.root/"result",pins=pins)
    def test_cli_never_exposes_input_path(self):
        import subprocess,sys
        secret="SENSITIVE_SOURCE_PATH_SHOULD_NOT_APPEAR"
        result=subprocess.run([sys.executable,str(SCRIPT),"--bundle",str(self.root/secret),
                               "--out-dir",str(self.root/"destination")],capture_output=True,text=True)
        self.assertEqual(result.returncode,2)
        self.assertNotIn(secret,result.stderr)
        self.assertNotIn(secret,result.stdout)

if __name__ == "__main__":
    unittest.main(verbosity=2)

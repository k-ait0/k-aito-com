#!/usr/bin/env python3
"""Loopback-only regression test for A05 D101 HTTP release preflight."""
import importlib.util
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import unittest

ROOT = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("d101_http", ROOT / "qa_a05_d101_http_preflight.py")
qa = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(qa)
BODY = (ROOT.parent / "projects/kidp/life-design-lab/a05/reflection-d101.html").read_bytes()


class Handler(BaseHTTPRequestHandler):
    def respond(self, head=False):
        path = self.path
        if path == "/redirect":
            self.send_response(302)
            self.send_header("Location", "/good")
            self.end_headers()
            return
        body = BODY + b" " if path == "/tampered" else BODY
        self.send_response(200)
        self.send_header("Content-Type", "text/html-evil" if path == "/bad-mime" else "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if path in ("/secure", "/weak-csp", "/duplicate-csp"):
            csp = (
                "default-src 'none'; base-uri 'none'; object-src 'none'; "
                "form-action 'none'; connect-src 'none'; frame-ancestors 'none'; "
                "script-src 'sha256-" + qa.INLINE_SCRIPT_SHA256 + "'; "
                "style-src 'sha256-" + qa.INLINE_STYLE_SHA256 + "'"
            )
            if path == "/weak-csp":
                csp = csp.replace("default-src 'none'", "report-uri /default-src 'none'")
            if path == "/duplicate-csp":
                csp += "; script-src 'unsafe-inline'"
            self.send_header("Content-Security-Policy", csp)
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def do_GET(self):
        self.respond()

    def do_HEAD(self):
        self.respond(head=True)

    def log_message(self, *_):
        return


class HttpContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = "http://127.0.0.1:" + str(cls.server.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join(timeout=3)
        cls.server.server_close()

    def test_local_document(self):
        res = qa.check(self.base + "/good", "local")
        self.assertTrue(res["passed"], res)
        self.assertEqual(res["get_status"], 200)
        self.assertEqual(res["head_status"], 200)
        self.assertFalse(res["browser_navigation_tested"])

    def test_tampered_bytes_rejected(self):
        res = qa.check(self.base + "/tampered", "local")
        self.assertFalse(res["passed"])
        self.assertIn("GIT_BLOB_SHA_MISMATCH", res["errors"])

    def test_missing_headers_rejected(self):
        res = qa.check(self.base + "/good", "local", require_headers=True)
        self.assertFalse(res["passed"])
        self.assertIn("HTTP_CSP_HASHES_MISSING", res["errors"])

    def test_secure_fixture_headers(self):
        res = qa.check(self.base + "/secure", "local", require_headers=True)
        self.assertTrue(res["passed"], res)
        self.assertTrue(res["http_security_headers_verified"])
        self.assertFalse(res["production_host_verified"])

    def test_redirect_not_followed(self):
        res = qa.check(self.base + "/redirect", "local")
        self.assertFalse(res["passed"])
        self.assertTrue(any(x.startswith("HTTP_REQUEST_FAILED") for x in res["errors"]))

    def test_mime_prefix_spoof_is_rejected(self):
        res = qa.check(self.base + "/bad-mime", "local")
        self.assertFalse(res["passed"])
        self.assertIn("CONTENT_TYPE_NOT_HTML", res["errors"])

    def test_csp_directive_spoof_is_rejected(self):
        res = qa.check(self.base + "/weak-csp", "local", require_headers=True)
        self.assertFalse(res["passed"])
        self.assertIn("HTTP_CSP_MISSING_OR_WEAK", res["errors"])

    def test_duplicate_csp_directive_is_rejected(self):
        res = qa.check(self.base + "/duplicate-csp", "local", require_headers=True)
        self.assertFalse(res["passed"])
        self.assertIn("HTTP_CSP_MALFORMED", res["errors"])

    def test_staging_port_not_authorized(self):
        with self.assertRaises(ValueError):
            qa.check("https://approved.example:444/reflection-d101.html", "staging", approved_host="approved.example")

    def test_staging_requires_approved_https_host(self):
        with self.assertRaises(ValueError):
            qa.check(self.base + "/secure", "staging", approved_host="127.0.0.1")
        with self.assertRaises(ValueError):
            qa.check("https://some.example/preview.html", "staging", approved_host="other.example")


if __name__ == "__main__":
    unittest.main()

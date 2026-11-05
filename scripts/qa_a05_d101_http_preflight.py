#!/usr/bin/env python3
"""Read-only A05 D101 HTML HTTP contract check; never deploys or publishes.

Local fixture:
  python scripts/qa_a05_d101_http_preflight.py --url http://127.0.0.1:8765/... --mode local
Staging (explicitly approved endpoint only):
  python scripts/qa_a05_d101_http_preflight.py --url https://STAGING_HOST/... --mode staging --approved-host STAGING_HOST

Checks GET/HEAD, raw Git blob bytes, MIME and safety headers. Does NOT replace
browser URL E2E, cache invalidation testing, or assistive-technology QA.
"""
import argparse
import hashlib
import json
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

EXPECTED_GIT_SHA = "a20c5676e3e22a547f03141b0907e852ac2edebf"
INLINE_SCRIPT_SHA256 = "oaY3svV/5NN/njmQI7BkRnHRrMUakI/S5RjUfK/eDo4="
INLINE_STYLE_SHA256 = "WNRNkkb6vFk9eJ18XDaBNe4v8J4k645kHLF0rXfqRAY="


class RefuseRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def git_blob_sha(payload):
    return hashlib.sha1(b"blob " + str(len(payload)).encode() + b"\0" + payload).hexdigest()


def check(url, mode, approved_host=None, require_headers=False):
    parsed = urlsplit(url)
    hostname = (parsed.hostname or "").lower()
    local = hostname in ("localhost", "127.0.0.1", "::1")
    errors = []
    facts = {"mode": mode, "url": url, "expected_blob_sha": EXPECTED_GIT_SHA,
             "actual_blob_sha": None, "get_status": None, "head_status": None,
             "content_type": None, "http_security_headers_verified": False,
             "browser_navigation_tested": False, "production_host_verified": False}
    if parsed.username or parsed.password or parsed.fragment or not parsed.path:
        raise ValueError("URL must have a path and no credentials or fragment")
    if mode == "local":
        if parsed.scheme != "http" or not local:
            raise ValueError("Local mode requires localhost / loopback HTTP URL")
    elif mode == "staging":
        if parsed.scheme != "https" or local or not approved_host or hostname != approved_host.lower():
            raise ValueError("Staging needs HTTPS and an explicitly approved exact host")
        require_headers = True
    else:
        raise ValueError("Unsupported mode")

    opener = build_opener(RefuseRedirect())

    def request(method):
        req = Request(url, method=method, headers={"Cache-Control": "no-cache"})
        with opener.open(req, timeout=8) as res:
            return res.status, {k.lower(): v for k, v in res.headers.items()}, res.read()

    try:
        status, headers, body = request("GET")
        facts["get_status"] = status
        facts["actual_blob_sha"] = git_blob_sha(body)
        facts["content_type"] = headers.get("content-type", "")
        if status != 200:
            errors.append("GET_HTTP_STATUS")
        if facts["actual_blob_sha"] != EXPECTED_GIT_SHA:
            errors.append("GIT_BLOB_SHA_MISMATCH")
        if not facts["content_type"].lower().startswith("text/html"):
            errors.append("CONTENT_TYPE_NOT_HTML")
        if b'content="noindex,nofollow"' not in body:
            errors.append("NOINDEX_META_MISSING")
        if b'http-equiv="Content-Security-Policy"' not in body:
            errors.append("CSP_META_MISSING")
        for header in ("content-length",):
            if header in headers and int(headers[header]) != len(body):
                errors.append("CONTENT_LENGTH_MISMATCH")
        status_h, headers_h, _ = request("HEAD")
        facts["head_status"] = status_h
        if status_h != 200:
            errors.append("HEAD_HTTP_STATUS")
        if headers_h.get("content-type", "").split(";")[0].lower() != facts["content_type"].split(";")[0].lower():
            errors.append("GET_HEAD_CONTENT_TYPE_DIFFER")
        if require_headers:
            csp = headers.get("content-security-policy", "")
            if not csp or "default-src 'none'" not in csp:
                errors.append("HTTP_CSP_MISSING_OR_WEAK")
            if "'sha256-" + INLINE_SCRIPT_SHA256 + "'" not in csp or "'sha256-" + INLINE_STYLE_SHA256 + "'" not in csp:
                errors.append("HTTP_CSP_HASHES_MISSING")
            if "frame-ancestors 'none'" not in csp:
                errors.append("HTTP_FRAME_ANCESTORS_MISSING")
            if "'unsafe-inline'" in csp or "'unsafe-eval'" in csp:
                errors.append("HTTP_CSP_UNSAFE_DIRECTIVE")
            if headers.get("x-content-type-options", "").lower() != "nosniff":
                errors.append("NO_SNIFF_HEADER_MISSING")
            if headers.get("referrer-policy", "").lower() not in ("no-referrer", "strict-origin-when-cross-origin", "same-origin"):
                errors.append("REFERRER_POLICY_MISSING")
            if "no-store" not in headers.get("cache-control", "").lower():
                errors.append("UNAPPROVED_PREVIEW_CACHE_POLICY_MISSING")
            facts["http_security_headers_verified"] = not any(e.startswith(("HTTP_", "NO_SNIFF", "REFERRER_", "UNAPPROVED_")) for e in errors)
    except (HTTPError, URLError, TimeoutError, ValueError, OSError) as e:
        errors.append("HTTP_REQUEST_FAILED: " + str(e)[:180])

    facts["errors"] = errors
    facts["passed"] = not errors
    facts["status"] = "LOCAL_HTTP_CONTRACT_PASS" if not errors and mode == "local" else (
        "STAGING_HTTP_CONTRACT_PASS_NOT_BROWSER_QA" if not errors else "FAIL")
    return facts


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True)
    parser.add_argument("--mode", choices=["local", "staging"], required=True)
    parser.add_argument("--approved-host")
    parser.add_argument("--require-headers", action="store_true")
    args = parser.parse_args(argv)
    try:
        result = check(args.url, args.mode, args.approved_host, args.require_headers)
    except ValueError as e:
        result = {"passed": False, "status": "REFUSED", "errors": [str(e)]}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())

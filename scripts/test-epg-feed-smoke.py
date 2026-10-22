#!/usr/bin/env python3
"""Verify the public FreeEPG Vietnam XMLTV gzip feed used as NM7's fallback."""
import gzip
import re
import urllib.request
from urllib.parse import urlparse

URL = "https://free-epg.de/api/epg/vn.xml.gz"
request = urllib.request.Request(
    URL,
    headers={
        "Accept": "application/gzip, application/octet-stream, application/xml",
        "User-Agent": "NM7-TV-Web-EPG/1.0",
    },
)
with urllib.request.urlopen(request, timeout=30) as response:
    final_url = response.geturl()
    compressed = response.read(12 * 1024 * 1024 + 1)

if len(compressed) > 12 * 1024 * 1024:
    raise SystemExit("EPG_FEED_FAIL: compressed feed exceeds the Worker 12 MiB limit")
try:
    xml = gzip.decompress(compressed)
except OSError as exc:
    raise SystemExit("EPG_FEED_FAIL: feed is not a valid gzip XMLTV file: " + str(exc))
if len(xml) > 28 * 1024 * 1024:
    raise SystemExit("EPG_FEED_FAIL: decompressed XML exceeds the Worker 28 MiB limit")
prefix = xml[:8192].decode("utf-8", errors="replace")
if not re.search(r"<tv(?:\s|>)", prefix, flags=re.I):
    raise SystemExit("EPG_FEED_FAIL: XMLTV root <tv> missing")
channels = len(re.findall(rb"<channel(?:\s|>)", xml, flags=re.I))
programmes = len(re.findall(rb"<programme(?:\s|>)", xml, flags=re.I))
if channels < 20 or programmes < 100:
    raise SystemExit(f"EPG_FEED_FAIL: unexpected data volume channels={channels} programmes={programmes}")
print(f"EPG_FEED_SMOKE_OK urlHost={urlparse(final_url).hostname} compressedBytes={len(compressed)} xmlBytes={len(xml)} channels={channels} programmes={programmes}")

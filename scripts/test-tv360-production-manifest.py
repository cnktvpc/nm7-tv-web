#!/usr/bin/env python3
"""Production-only TV360 proxy smoke. Prints statuses and media types, never stream URLs or DRM keys."""
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import parse_qs, quote, urljoin, urlparse

BASE_URL = "https://nm7-tv-web.phuongnm7-iptv.workers.dev"
USER_AGENT = "Dalvik/2.1.0"
RESOLVER = "https://vmttv.dpdns.org/tv360/?id=tv360-{channel_id}"


def fail(message):
    raise SystemExit("TV360_PRODUCTION_MEDIA_SMOKE_FAIL: " + message)


def http_get(url, label, byte_range=None):
    out = Path("/tmp") / ("nm7-tv360-" + re.sub(r"[^a-z0-9-]", "-", label.lower()) + ".bin")
    command = [
        "curl", "-sS", "--max-redirs", "4", "--connect-timeout", "8",
        "--max-time", "30", "-o", str(out), "-w", "%{http_code}|%{content_type}",
    ]
    if byte_range:
        command.extend(["-H", "Range: " + byte_range])
    command.append(url)
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        fail(f"{label}: transport failed (curl exit {result.returncode})")
    parts = result.stdout.strip().rsplit("|", 1)
    if len(parts) != 2:
        fail(f"{label}: no HTTP status returned")
    status, content_type = parts[0].splitlines()[-1], parts[1]
    if status not in ("200", "206"):
        fail(f"{label}: HTTP {status}")
    try:
        body = out.read_bytes()
    except OSError:
        fail(f"{label}: response body missing")
    if not body:
        fail(f"{label}: empty response body")
    return int(status), content_type, body


def media_kind(body):
    head = body[:4096].lstrip(b"\xef\xbb\xbf \t\r\n")
    if head.startswith(b"#EXTM3U"):
        return "hls"
    if b"<mpd" in head.lower():
        return "dash"
    return ""


def playlist_uri(body):
    text = body[:512 * 1024].decode("utf-8", errors="replace")
    for line in text.splitlines():
        item = line.strip()
        if item and not item.startswith("#"):
            return item
    # A few manifests may use URI attributes instead of standalone URI lines.
    match = re.search(r'URI=["\']([^"\']+)["\']', text, re.I)
    return match.group(1) if match else ""


def check_playlist_config():
    endpoint = BASE_URL + "/api/playlist?source=tv&default=2&refresh=1&__tv360_manifest_smoke=1"
    status, _, raw = http_get(endpoint, "playlist-json")
    try:
        data = json.loads(raw.decode("utf-8-sig"))
    except Exception:
        fail("preset 2 playlist response was not valid JSON")
    if status not in (200, 206) or not data.get("channels"):
        fail("preset 2 playlist is empty")
    channels = data["channels"]
    for channel_id in ("10", "13", "15"):
        expected = "tv360+" + channel_id
        matches = [c for c in channels if str(c.get("name", "")).strip().lower() == expected]
        if not matches:
            fail("preset 2 is missing TV360+" + channel_id)
        candidates = [candidate for c in matches for candidate in (c.get("candidates") or [])]
        resolver = [
            c for c in candidates
            if (urlparse(str(c.get("url", ""))).hostname or "").lower() == "vmttv.dpdns.org"
            and urlparse(str(c.get("url", ""))).path.rstrip("/") == "/tv360"
        ]
        if not any(c.get("forceProxy") is True and c.get("ua") == USER_AGENT for c in resolver):
            fail("TV360+" + channel_id + " is not proxy-first with the playlist User-Agent")
        if channel_id in ("13", "15") and not any(
            str(c.get("type", "")).lower() == "dash"
            and isinstance(c.get("drm"), dict)
            and str(c["drm"].get("type", "")).lower() == "clearkey"
            and bool(c["drm"].get("key"))
            for c in resolver
        ):
            fail("TV360+" + channel_id + " has no parsed DASH/ClearKey metadata")
    print("TV360_PLAYLIST_ROUTING_AND_DRM_METADATA_OK channels=10,13,15")


def check_manifest(channel_id):
    label = "TV360+" + channel_id
    upstream = RESOLVER.format(channel_id=channel_id)
    endpoint = BASE_URL + "/api/stream?u=" + quote(upstream, safe="") + "&ua=" + quote(USER_AGENT, safe="")
    status, content_type, body = http_get(endpoint, label + "-manifest")
    kind = media_kind(body)
    if not kind:
        fail(label + f": HTTP {status} did not return an HLS or DASH manifest (content-type={content_type or 'unknown'})")
    if channel_id in ("13", "15") and kind != "dash":
        fail(label + f": playlist declares DASH/DRM but proxy returned {kind.upper()} manifest")
    print(f"TV360_MANIFEST_OK {label} http={status} kind={kind} content_type={content_type or 'unknown'}")
    return kind, body


def check_hls_child(body):
    next_uri = playlist_uri(body)
    if not next_uri:
        fail("TV360+10 HLS manifest contains no segment/variant URI")
    next_url = urljoin(BASE_URL + "/", next_uri)
    for depth in range(4):
        parsed = urlparse(next_url)
        if parsed.netloc.lower() != urlparse(BASE_URL).netloc.lower() or parsed.path != "/api/stream":
            fail("TV360+10 child URI was not rewritten to the same-origin Worker proxy")
        upstream = parse_qs(parsed.query).get("u", [""])[0]
        upstream_path = urlparse(upstream).path.lower()
        is_manifest_url = upstream_path.endswith((".m3u8", ".m3u", ".mpd"))
        byte_range = None if is_manifest_url else "bytes=0-1023"
        status, content_type, payload = http_get(next_url, "hls-child-" + str(depth), byte_range)
        kind = media_kind(payload)
        if kind == "hls":
            next_uri = playlist_uri(payload)
            if not next_uri:
                fail("TV360+10 nested HLS playlist contains no media URI")
            next_url = urljoin(BASE_URL + "/", next_uri)
            continue
        print(f"TV360_HLS_MEDIA_CHILD_OK http={status} bytes={len(payload)} content_type={content_type or 'unknown'}")
        return
    fail("TV360+10 HLS playlist nesting did not reach a media segment")


def main():
    check_playlist_config()
    for channel_id in ("10", "13", "15"):
        kind, body = check_manifest(channel_id)
        if channel_id == "10" and kind == "hls":
            check_hls_child(body)
    print("TV360_PRODUCTION_MEDIA_SMOKE_OK")


if __name__ == "__main__":
    main()

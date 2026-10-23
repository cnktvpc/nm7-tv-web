#!/usr/bin/env python3
"""Production-only TV360 proxy smoke. Prints statuses and media types, never stream URLs or DRM keys."""
import json
import os
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import parse_qs, quote, urljoin, urlparse

BASE_URL = os.environ.get("NM7_TV360_BASE_URL", "https://nm7-tv-web.phuongnm7-iptv.workers.dev").rstrip("/")
USER_AGENT = "Dalvik/2.1.0"
RESOLVER = "https://vmttv.dpdns.org/tv360/?id=tv360-{channel_id}"


def fail(message):
    raise SystemExit("TV360_MEDIA_SMOKE_FAIL: " + message)


def http_get(url, label, byte_range=None, allow_http_errors=False):
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
    try:
        body = out.read_bytes()
    except OSError:
        fail(f"{label}: response body missing")
    if not body and not allow_http_errors:
        fail(f"{label}: empty response body")
    if status not in ("200", "206") and not allow_http_errors:
        fail(f"{label}: HTTP {status}")
    return int(status), content_type, body

    
def diagnose_resolver(channel_id):
    """Log safe resolver diagnostics, without signed URLs or DRM key material."""
    resolver = RESOLVER.format(channel_id=channel_id)
    endpoint = BASE_URL + "/api/probe?u=" + quote(resolver, safe="") + "&ua=" + quote(USER_AGENT, safe="")
    try:
        status, _, body = http_get(endpoint, "resolver-probe-" + channel_id, allow_http_errors=True)
        data = json.loads(body.decode("utf-8", errors="replace"))
        fields = ("type", "status", "headStatus", "getStatus", "errorHint", "bodyClass", "finalHost")
        safe = {key: data.get(key) for key in fields}
        safe["probeHttp"] = status
        safe["channel"] = "TV360+" + channel_id
        print("TV360_RESOLVER_SAFE_DIAGNOSTIC " + json.dumps(safe, ensure_ascii=False, sort_keys=True))
    except Exception as error:
        print("TV360_RESOLVER_SAFE_DIAGNOSTIC " + json.dumps({
            "channel": "TV360+" + channel_id,
            "diagnostic": "probe-unavailable",
            "errorClass": type(error).__name__,
        }, ensure_ascii=False, sort_keys=True))


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
    last = None
    for attempt in range(1, 4):
        last = http_get(endpoint, label + "-manifest-attempt-" + str(attempt), allow_http_errors=True)
        status, content_type, body = last
        if status in (200, 206):
            kind = media_kind(body)
            if not kind:
                fail(label + f": HTTP {status} did not return an HLS or DASH manifest (content-type={content_type or 'unknown'})")
            if channel_id in ("13", "15") and kind != "dash":
                fail(label + f": playlist declares DASH/DRM but proxy returned {kind.upper()} manifest")
            print(f"TV360_MANIFEST_OK {label} http={status} kind={kind} content_type={content_type or 'unknown'} attempt={attempt}")
            return kind, body
        print(f"TV360_MANIFEST_RETRY {label} http={status} attempt={attempt}/3")
        if status != 404:
            break
        if attempt < 3:
            time.sleep(1)
    diagnose_resolver(channel_id)
    status, content_type, _ = last
    fail(label + f": upstream/proxy returned HTTP {status} after bounded retries (content-type={content_type or 'unknown'}); see safe resolver diagnostic above")



def check_dash_children(channel_id, body):
    """Fetch DASH initialization and an actually current live media segment via the Worker."""
    import datetime
    import math
    import xml.etree.ElementTree as ET

    label = "TV360+" + channel_id
    try:
        root = ET.fromstring(body)
    except ET.ParseError as error:
        fail(label + ": proxy DASH manifest is not valid XML (" + type(error).__name__ + ")")
    ns = {"d": "urn:mpeg:dash:schema:mpd:2011"}

    def parse_datetime(value):
        try:
            return datetime.datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
        except Exception:
            return 0.0

    ast = parse_datetime(root.get("availabilityStartTime", ""))
    period = root.find("d:Period", ns)
    period_start = 0.0
    if period is not None:
        raw_start = str(period.get("start", "PT0S"))
        match = re.fullmatch(r"PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?", raw_start)
        if match:
            period_start = float(match.group(1) or 0) * 3600 + float(match.group(2) or 0) * 60 + float(match.group(3) or 0)

    def fetch_resource(uri, label_part):
        last = (0, "", b"")
        for attempt in range(1, 4):
            last = http_get(uri, f"dash-{channel_id}-{label_part}-{attempt}",
                            byte_range="bytes=0-1023", allow_http_errors=True)
            if last[0] in (200, 206) and last[2]:
                return last
            if attempt < 3:
                time.sleep(attempt)
        return last

    initialized = set()
    media_ok = set()
    for aset in root.findall(".//d:AdaptationSet", ns):
        reps = aset.findall("d:Representation", ns)
        if not reps:
            continue
        rep = reps[0]
        template = rep.find("d:SegmentTemplate", ns)
        if template is None:
            template = aset.find("d:SegmentTemplate", ns)
        if template is None:
            continue

        rid = rep.get("id", "")
        bandwidth = rep.get("bandwidth", "0")
        start_number = int(template.get("startNumber", "1") or "1")
        timescale = int(template.get("timescale", "1") or "1")
        duration = int(template.get("duration", "0") or "0")
        pto = int(template.get("presentationTimeOffset", "0") or "0")
        timeline = template.find("d:SegmentTimeline", ns)
        if timeline is None:
            timeline = aset.find("d:SegmentTimeline", ns)
        points = []
        if timeline is not None:
            entries = timeline.findall("d:S", ns)
            cursor = 0
            total_segments = 0
            for idx, segment in enumerate(entries):
                if segment.get("t") is not None:
                    cursor = int(segment.get("t"))
                d = int(segment.get("d", "0") or "0")
                repeat = int(segment.get("r", "0") or "0")
                if d <= 0:
                    continue
                if repeat >= 0:
                    count = repeat + 1
                elif repeat == -1:
                    next_start = None
                    for later in entries[idx + 1:]:
                        if later.get("t") is not None:
                            next_start = int(later.get("t"))
                            break
                    if next_start is not None:
                        count = max(1, math.ceil((next_start - cursor) / d))
                    elif ast:
                        live_units = max(0.0, (time.time() - ast - period_start) * timescale + pto)
                        # Avoid the newest not-yet-published fragment in this live MPD.
                        target = max(cursor, int(live_units - 5 * timescale))
                        last_offset = max(0, int((target - cursor) // d))
                        count = last_offset + 1
                    else:
                        count = 1
                else:
                    count = 1
                # Keep only recent points; some dynamic MPDs have r=-1 spanning
                # many hours, so materializing every historical segment is unsafe.
                first_needed = max(0, count - 10)
                for offset in range(first_needed, count):
                    points.append((cursor + offset * d, start_number + total_segments + offset))
                total_segments += count
                cursor += count * d
                if len(points) > 20:
                    points = points[-20:]
        elif duration > 0 and ast:
            live_units = max(0.0, (time.time() - ast - period_start) * timescale + pto)
            latest = max(0, int(live_units // duration))
            points = [(n * duration + pto, start_number + n) for n in range(max(0, latest - 12), latest + 1)]

        points = points[-10:] if points else [(pto, start_number)]
        def expand(value, point):
            if not value:
                return ""
            segment_time, segment_number = point
            def substitute(match):
                field, width = match.group(1), match.group(2)
                data = {"RepresentationID": rid, "Number": str(segment_number),
                        "Time": str(segment_time), "Bandwidth": str(bandwidth)}.get(field, match.group(0))
                return data.zfill(int(width)) if width else data
            return re.sub(r"\$(RepresentationID|Number|Time|Bandwidth)(?:%0(\d+)d)?\$", substitute, value)

        init_template = template.get("initialization", "")
        if init_template and rid not in initialized:
            init_uri = urljoin(BASE_URL + "/", expand(init_template, points[-1]))
            status, content_type, payload = fetch_resource(init_uri, "init-" + rid)
            if status not in (200, 206) or not payload:
                fail(label + f": DASH initialization failed HTTP {status} (content-type={content_type or 'unknown'})")
            print(f"TV360_DASH_RESOURCE_OK channel={channel_id} kind=initialization http={status} bytes={len(payload)} content_type={content_type or 'unknown'}")
            initialized.add(rid)

        media_template = template.get("media", "")
        if media_template and rid not in media_ok:
            last_result = (0, "", b"")
            chosen = None
            for point in reversed(points):
                media_uri = urljoin(BASE_URL + "/", expand(media_template, point))
                last_result = fetch_resource(media_uri, "media-" + rid + "-" + str(point[1]))
                if last_result[0] in (200, 206) and last_result[2]:
                    chosen = point
                    break
            status, content_type, payload = last_result
            if chosen is None:
                diagnostic = payload[:100].decode("utf-8", "replace").replace("\n", " ")
                diagnostic = "".join(ch for ch in diagnostic if ch.isprintable())[:100]
                print("TV360_DASH_MEDIA_FAILURE channel=" + channel_id,
                      "representation=" + rid, "timescale=" + str(timescale),
                      "timelineEntries=" + str(len(timeline.findall("d:S", ns)) if timeline is not None else 0),
                      "lastPoint=" + str(points[-1]), "http=" + str(status),
                      "bodyHint=" + (diagnostic or "non-text-or-empty"))
                fail(label + f": DASH media resource failed HTTP {status} for the recent live timeline (content-type={content_type or 'unknown'})")
            print(f"TV360_DASH_RESOURCE_OK channel={channel_id} kind=media http={status} bytes={len(payload)} content_type={content_type or 'unknown'} livePoint={chosen}")
            media_ok.add(rid)

    if not initialized or not media_ok:
        fail(label + ": manifest did not expose reachable DASH initialization and media resources")

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
        if channel_id in ("13", "15") and kind == "dash":
            check_dash_children(channel_id, body)
    print("TV360_PRODUCTION_MEDIA_SMOKE_OK")


if __name__ == "__main__":
    main()

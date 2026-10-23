# TV360 test branch status — 2026-10-23

## Isolation and safety
- Test branch: `test/nm7-tv360-20261023`
- Production branch `main` was not changed.
- Production Worker `nm7-tv-web` was not intentionally deployed by this test branch.
- Isolated Wrangler config: `wrangler.test.toml`, Worker name `nm7-tv-web-test`.

## Local validation of the user-provided ZIP snapshot
The following 20 JavaScript regression scripts passed locally under Node.js 22:
- test-channel-logo-scroll-loading.js
- test-custom-m3u-headers-probe.js
- test-desktop-home-tabs.js
- test-device-default-preset.js
- test-getout-news-entry.js
- test-home-title-mobile-overlap.js
- test-ipad-landscape-menu.js
- test-live-feed.js
- test-live-player-hide-metadata.js
- test-menu-fullscreen.js
- test-news-thumbnail-parser.js
- test-onplus-media-url.js
- test-playback-startup-fallback.js
- test-sctv4k-proxy-preference.js
- test-sport-playlist-refresh.js
- test-stalker-default-user-agent.js
- test-tv360-live-key-overlay.js
- test-tv360-playback-routing.js
- test-worker-dash-proxy.js
- test-worker-hls-segments.js

Python syntax validation for `scripts/test-tv360-production-manifest.py` passed.

## Blocked validation
The production-manifest/media smoke test did not complete: it reported `playlist-json: transport failed (curl exit 6)`, which indicates DNS/network resolution failed in the current test environment. This is not a passing playback test.

## Important limitation
The ZIP snapshot contains runtime files whose Git blob hashes differ from the current `main` branch (including `worker.js`, `web-tv/app.js`, and `web-tv/index.html`). This status records tests run against the ZIP locally; it does **not** claim that the full ZIP snapshot has been synchronized to this Git branch or deployed to the test Worker.

## Promotion gate
Do not merge this branch into `main` until the full ZIP runtime snapshot is synchronized, the GitHub Actions run is green, and remote test-Worker smoke checks complete successfully.

# TV360 test branch status — 2026-10-23

## Branch and production safety
- Test branch: `test/nm7-tv360-20261023`
- Base: `main` at `7360d4226942cd62bc5329460decec253f5604ae`.
- Production branch `main` has not been changed by this test work.
- Production Worker `nm7-tv-web` has not been intentionally redeployed by this test workflow.
- Isolated Wrangler config: `wrangler.test.toml`, Worker name `nm7-tv-web-test`.

## Local validation performed against the user-provided ZIP
Extracted `nm7-tv-web-fix-tv360-complete-20261023.zip` and ran all 20 `scripts/test-*.js` files using Node.js v22.16.0. Result: **20 passed, 0 failed**.

Coverage includes:
- TV360 live key overlay and TV360 playback routing
- DASH proxy and HLS segment rewriting
- Playback startup fallback
- SCTV4K proxy preference
- Stalker UA/header handling
- Sport playlist refresh
- Live feed grouping/player metadata
- iPad landscape menu and desktop/fullscreen controls
- News, logo loading, playlist probe, device presets and other UI regressions

Also ran `python -m py_compile scripts/test-tv360-production-manifest.py`; syntax validation passed.

## Checks that are not yet passing / not yet confirmed
- The live manifest/network smoke test did not complete: `playlist-json: transport failed (curl exit 6)`. This indicates DNS/network resolution failure in the current execution environment, so it is **not** a successful remote playback test.
- No successful GitHub Actions result has been observed for the test branch.
- No successful remote smoke test of the test Worker has been confirmed.

## ZIP source synchronization gate
The ZIP runtime files are different from the current Git branch. Verified Git blob hashes from the ZIP:
- `worker.js`: `b9eb59ade18bd8ba76cd69eab7c1a0c8de2c2768`
- `web-tv/app.js`: `bd5e53f7769c62ca555f5efb92d9027de0771577`
- `web-tv/index.html`: `95cf1e0a02f77d1d421c878209553681d12f7041`

The current Git branch still has the same hashes as `main` for these files. The workflow now checks for the ZIP hashes before deploy, so it will fail closed instead of deploying the wrong runtime. Full ZIP contents have **not** yet been synchronized to GitHub.

## Promotion gate
Do not merge this branch into `main` until the ZIP runtime snapshot is synchronized, the GitHub Actions workflow is green, and remote test-Worker smoke checks succeed. Do not describe the local test pass as proof that TV360 streams play on the deployed Worker.

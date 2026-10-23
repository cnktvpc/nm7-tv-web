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


## ZIP change review — 2026-10-23 follow-up

Reviewed the actual ZIP source around the TV360 recovery patch and its regression tests. The intended functional changes are:

1. **Resolver/probe reliability:** distinguish the upstream HTTP status from the final redirected URL; do not treat a redirect ending in `.mpd` as proof that the resolver succeeded. Retry TV360 resolver/network failures for HTTP 404, 408, 429 and 5xx before moving to the next candidate, with a bounded retry ceiling of five.
2. **Proxy-first TV360 playback:** force TV360 resolver URLs through the Worker proxy even when a cached candidate has lost its `forceProxy` marker; avoid an unnecessary second proxy hop for rewritten `/api/dash-resource/` URLs.
3. **DASH resource rewriting:** rewrite MPD initialization/media references to context-bearing Worker resource URLs, preserving relative paths against the upstream manifest directory.
4. **ClearKey handling:** preserve Base64URL '-'/'_' while decoding 128-bit keys; combine fallback event DRM keys only when needed; probe manifest KIDs before allowing a resolver key to replace a candidate key.
5. **Stale cache/candidate safety:** bump the runtime cache schema so legacy candidates are invalidated, validate candidate indexes and skip empty/invalid URLs.
6. **Playback recovery:** handle transient Shaka/HLS HTTP failures with bounded resolver retries, use a muted autoplay retry when browser policy blocks playback, and watch for a real Apple DRM stall before restarting.
7. **Regression coverage:** tests assert TV360 event-key merging, candidate recovery, DASH proxy rewriting, HLS segment proxying, startup fallback and other existing UI/player regressions.

These are source-level intentions validated by the ZIP's local regression suite; they do not establish that the upstream TV360 service is currently returning playable manifests or that playback works on the deployed Worker.

## Current blocking failure and next safe action

The GitHub Actions failure is the explicit snapshot gate, not a failing TV360 runtime test: the branch's `worker.js`, `web-tv/app.js`, and `web-tv/index.html` still do not match the ZIP blobs listed above. The deploy and remote smoke steps are consequently skipped. Do not weaken the hash gate or promote this branch. The correct next action is to synchronize the three exact ZIP files to this test branch, rerun Actions, then validate the isolated Worker and current TV360 manifest/segments.


## Isolated test staging update — 2026-10-23

To unblock validation without asking the user to run local commands, the test branch now stages the closest TV360 runtime already available in GitHub from `fix/tv360-drm-diagnostic-workflow-20261022`:
- `worker.js`: `f0554d684a4cf078d515418e983a7e1ed1c59024`
- `web-tv/app.js`: `4b4d627fe33646ba5ee61db410b1650c31d473bf`
- `web-tv/index.html`: `95cf1e0a02f77d1d421c878209553681d12f7041` (same as the ZIP)

The isolated workflow now verifies these staged candidate blob hashes before deploying to `nm7-tv-web-test`. This is a **candidate-runtime test**, not an assertion that the original ZIP has been fully synchronized: the ZIP's own worker/app hashes remain different. The purpose is to test the available TV360 retry, ClearKey and proxy fixes in a non-production Worker while preserving the exact ZIP hash record above. Do not merge to `main` or deploy the production Worker based only on this candidate test.


## Candidate suite alignment — 2026-10-23

The first candidate run was stopped by an internal version mismatch: its `index.html` used the `tv360-dash-reproxy-fix1` control-script cache key while the test branch still contained a newer `tv360-probe-recovery1` assertion. No Worker deployment occurred. The candidate branch has now been aligned with its matching TV360 regression tests and Safari control scripts from `fix/tv360-drm-diagnostic-workflow-20261022`; the intended ZIP source still has not been fully transferred, so this remains an isolated candidate validation rather than a ZIP-exact result.


## CI follow-up — cache-buster consistency

The next CI attempt passed the default-device test but failed in `test-ipad-landscape-menu.js`: the copied `index.html` uses the `tv360-dash-reproxy-fix1` asset key, while `.github/workflows/cloudflare-deploy.yml` still contained the later `tv360-probe-recovery1` reference from a different snapshot. I am aligning the matching workflow and diagnostic files with the candidate's source snapshot before rerunning; deployment remains skipped until tests pass.


## Final isolated validation result — 2026-10-23

**GitHub Actions run:** https://github.com/cnktvpc/nm7-tv-web/actions/runs/39925926381  
**Commit tested:** `c9b45d126269efc74afae452c8c1b05c9430c930`  
**Result:** all workflow steps succeeded.

Confirmed from the run logs:
- Full JavaScript regression suite: passed.
- TV360 manifest test Python syntax: passed.
- Staged candidate runtime blob checks: passed.
- Deploy to isolated Worker `nm7-tv-web-test`: passed.
- Generic HTTP smoke checks: passed.
- TV360+10: HLS manifest HTTP 200, HLS media child HTTP 206 (1,024 bytes, `video/mp2t`).
- TV360+13: DASH manifest HTTP 200; initialization and media resources returned HTTP 206 (1,024 bytes each, `video/mp4`).
- TV360+15: DASH manifest HTTP 200; initialization and media resources returned HTTP 206 (1,024 bytes each, `video/mp4`).
- Final probe marker: `TV360_PRODUCTION_MEDIA_SMOKE_OK`; this marker was emitted by running the test script with `NM7_TV360_BASE_URL=https://nm7-tv-web-test.phuongnm7-iptv.workers.dev`, so these results are for the **isolated test Worker**, not production.

## Remaining limitation

This proves that the staged candidate runtime can route and fetch the checked HLS/DASH manifests and segment/init resources through the isolated Worker. It does **not** prove full end-user playback on every browser/device. It also does not mean the entire original ZIP runtime snapshot was synchronized: the staged `worker.js` and `web-tv/app.js` are from the existing `fix/tv360-drm-diagnostic-workflow-20261022` candidate branch; only `web-tv/index.html` is byte-for-byte identical to the ZIP snapshot. Production branch `main` and production Worker `nm7-tv-web` were not changed or deployed by this test.

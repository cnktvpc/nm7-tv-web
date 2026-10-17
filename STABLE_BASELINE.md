## Mobile player polish — 14/10/2026

- Mobile fullscreen shortcut uses a separate idle class and hides after 2.4 seconds; touch restores it and resets the timer.
- Mobile hides only the fullscreen shortcut, not the bottom player control strip. PC keeps its existing combined hide behavior.
- Unsupported live seek produces no toast, preserving visibility of the bottom controls.
- Uses a versioned runtime asset path to avoid stale edge JavaScript; regression and production smoke are wired into Cloudflare deployment workflow.
- Scope: NM7 TV Web/Cloudflare Worker only.
- **Đã merge vào stable:** [PR #32](https://github.com/phuongnm7/nm7-tv-web/pull/32); commit `e96f9413478d4b7bec93f080ec5d949adfb36ba4`.
- **Deploy + production smoke:** [workflow #38520866144 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38520866144). Các bước deploy Worker, smoke PC player, smoke mobile player và các test liên quan đều đạt.
- Mobile smoke marker: `MOBILE_PLAYER_AUTOHIDE_PRODUCTION_SMOKE_OK`; xác nhận timer 2,4 giây, touch wake, lớp idle riêng cho fullscreen trên mobile và seek không tạo toast che controls. PC smoke tiếp tục PASS.
- Automation đã xác minh asset/HTML production; chưa coi đó là kiểm thử trực tiếp trên thiết bị di động vật lý.

---

## Live feed empty-state fix — 14/10/2026

- **Đã merge vào stable:** PR [#31](https://github.com/phuongnm7/nm7-tv-web/pull/31), commit `e9b17d83b474a6119ea5f98ba050ad1ce2cde338`.
- **Cloudflare production:** [workflow #38485043959 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38485043959). Worker deploy, homepage, LIVE feed, playlists, PC player và Bản tin đều qua smoke test.
- Parser nhận diện marker LIVE dạng emoji/chữ/group-title, thời gian ISO; trạng thái rỗng có số liệu chẩn đoán. Asset path parser/UI được đổi riêng để tránh edge cache trả JS cũ.
- **Feed thật:** 938 mục, 421 có giờ, 49 có marker LIVE, 45 nguồn đủ điều kiện, 9 sự kiện sau gom nhóm.
- **Nghiệm thu:** người dùng đã kiểm tra bản production và xác nhận mục LIVE hoạt động bình thường.
- Một smoke trước bị chặn bởi assertion tên kênh `VTV6 HD`; assertion đã cập nhật thành `VTV6`, sau đó toàn bộ smoke thành công.
- Không thay đổi NM7 TV Android hoặc NM7 Mobile.

---
# NM7 TV Web — Stable Baseline

**Trạng thái:** BẢN ỔN ĐỊNH HIỆN TẠI  
**Ngày chốt:** 11/10/2026  
**Repository:** `phuongnm7/nm7-tv-web`  
**Baseline branch:** `stable/nm7-tv-web-2026-10-09`  
**Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/  
**UI reference:** NM7 TV Android 1.0.69

## Commit/runtime đã xác minh

- **Mã runtime production được deploy và smoke-test:** `8f513632a0b51b57a42d795968bb62aa2d5b764b`.
- **Cloudflare Deploy:** [Workflow #38103299751 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38103299751).
- Trong lần chạy này, syntax check, regression test nguồn Thể thao, regression test menu iPad nằm ngang, Cloudflare Worker deploy và smoke test production đều thành công.
- Các cập nhật tài liệu sau mốc này có thể làm HEAD của nhánh stable tiến thêm một commit tài liệu. Trừ khi được ghi rõ là thay đổi runtime, đó không phải thay đổi mã ứng dụng đang được xác minh tại đây.

## Phần thuộc baseline

- Giao diện TV chuẩn NM7 Android 1.0.69 và layout responsive.
- Nguồn Truyền hình preset 1/preset 2 cùng chọn mặc định theo thiết bị.
- Nguồn Thể thao ưu tiên Worker playlist động; GitHub Raw là fallback; `refresh=1` bỏ qua cache nội bộ.
- Nhập nguồn URL qua Worker Service Binding cho upstream thể thao và nhập tệp M3U/M3U8 cục bộ (tối đa 20 MB, không upload tệp).
- Sửa menu ☰ iPad nằm ngang khi Safari ở desktop mode.
- Player/fallback HLS, DASH/DRM, FLV, MPEG-TS, proxy HLS/segment và logic Stalker/Xtream đã có trong Worker.
- YouTube launcher chính thức, Mobile Background/PiP capability-aware và smoke tests tương ứng.
- Quy tắc cấu hình của `worker.js` và `wrangler.toml`, bao gồm `PLAYLIST_SOURCE` và `THETHAO_SOURCE`.

## Bản tin GetOut — phát hành chính thức

- PR [#25](https://github.com/phuongnm7/nm7-tv-web/pull/25) đã squash-merge vào stable ngày 11/10/2026.
- Trang chính thức: https://nm7-tv-web.phuongnm7-iptv.workers.dev/ban-tin.html.
- Worker API: `/api/news`, `/api/news/play`, `/api/image`; gồm Highlights 24h, Xem lại GetOut và Tin thể thao ON Plus.
- Production smoke test [#38103299751 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38103299751): Highlights 40, ON Plus 60/60 URL ảnh, Xem lại 30/30 URL ảnh và 30/30 bản ghi có đủ tên hai đội; ba mẫu ảnh từng nguồn ON Plus/Xem lại được tải, xác minh MIME và byte ảnh hợp lệ.
- Xem lại sử dụng proxy thumbnail Worker với Referer/Origin nhà cung cấp do CDN ảnh trả 403 khi hotlink trực tiếp. Cache danh sách 60 giây; `refresh=1` bỏ qua cache; UI tự kiểm tra lại sau 90 giây.
- Regression tests cho Bản tin chạy trước deploy; workflow Cloudflare thêm smoke test production cho API, title đội bóng và thumbnail thực.
- Phạm vi chỉ NM7 TV Web; không thay đổi NM7 Mobile hoặc NM7 TV Android.

## Quy tắc bắt buộc cho các bản tiếp theo

1. Tạo branch tính năng/lỗi từ **HEAD mới nhất** của `stable/nm7-tv-web-2026-10-09`.
2. Không phát triển trực tiếp lên stable. Giữ thay đổi nhỏ, cô lập và chỉ sửa phần thuộc yêu cầu.
3. Không lấy code của NM7 TV Android hoặc NM7 Mobile làm nền; không chỉnh hai repository đó trong phạm vi NM7 TV Web.
4. Runtime NM7 TV Web được triển khai bằng **Cloudflare Workers**. URL Vercel VietMiTV Merge chỉ là nguồn playlist preset 1 hiện có; không được hiểu là chỉ thị deploy ứng dụng lên Vercel.
5. Chạy syntax checks, các regression tests liên quan và workflow Cloudflare production. Lưu link commit/run trong `PROGRESS.md` và cập nhật `README.md`.
6. Chỉ chốt/move stable sau khi deploy và smoke test thành công; nói rõ thiết bị/kênh nào đã kiểm tra thực tế và nội dung nào chỉ được kiểm tra tự động.
7. Bảo vệ hành vi đang hoạt động: không đổi preset, URL nguồn, giao diện, DRM, proxy hoặc workflow nằm ngoài phạm vi yêu cầu.

## Link vận hành

- Production NM7 TV Web: https://nm7-tv-web.phuongnm7-iptv.workers.dev/
- Nhánh stable: https://github.com/phuongnm7/nm7-tv-web/tree/stable/nm7-tv-web-2026-10-09
- Workflow deploy đã xác minh: https://github.com/phuongnm7/nm7-tv-web/actions/runs/38103299751
- Tiến độ chi tiết: [PROGRESS.md](PROGRESS.md)
- README sử dụng và phát triển: [README.md](README.md)


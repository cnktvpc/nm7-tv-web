# Cập nhật mới nhất — TV360 Web proxy và manifest đã được xác minh trên production (21/10/2026)

- PR [#14](https://github.com/cnktvpc/nm7-tv-web/pull/14) đã merge và triển khai proxy-first cho resolver TV360; PR [#15](https://github.com/cnktvpc/nm7-tv-web/pull/15) bổ sung kiểm tra manifest thật và sửa assertion preset 1 cũ chỉ trong workflow, không thay đổi URL hay thứ tự nguồn playlist.
- **Production smoke PASS:** TV360+10 trả HLS HTTP 200; URI media con trả HTTP 206 với dữ liệu TS. TV360+13 và TV360+15 trả DASH MPD HTTP 200. Playlist giữ resolver TV360, `forceProxy=true`, User-Agent `Dalvik/2.1.0` và metadata DASH/ClearKey.
- Các hồi quy TV360 routing, JavaScript/browser validation và browser remote + HLS E2E đều PASS. Lượt deploy tổng thể sau đó phát hiện thêm assertion cũ phân biệt hoa/thường giữa tên nhóm `Thể Thao`/`Quốc Tế` và giá trị thực tế `Thể thao`/`Quốc tế`; bản sửa tiếp theo chỉ làm smoke test so khớp không phân biệt hoa/thường và xác minh kênh theo tên thực tế.
- **Phạm vi:** chỉ NM7 TV Web/Cloudflare; không sửa NM7 TV Android hoặc NM7 Mobile. Smoke HTTP xác nhận manifest/segment có thể tải, không thay thế thử phát/giải mã trên điện thoại người dùng.
- **Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---

# Cập nhật mới nhất — TV360 proxy-first đã deploy, đang xác minh manifest (21/10/2026)

- PR [#14](https://github.com/cnktvpc/nm7-tv-web/pull/14) đã merge vào `main` (commit `50e9a642fa7938fbc47d61bcacfbd55430d0d344`).
- Production smoke sau deploy đã xác nhận TV360+10, +13 và +15 giữ đúng resolver `vmttv.dpdns.org/tv360/`, `forceProxy=true` và User-Agent `Dalvik/2.1.0`.
- Job tổng thể vẫn báo lỗi do assertion cũ của preset 1 so URL trả về với GitHub raw URL đã cũ; API thực tế dùng fallback đã khai báo `phuongnm7-playlist.phuongnm7-iptv.workers.dev`. Bản sửa tiếp theo chỉ đồng bộ kiểm thử, không thay URL nguồn hoặc thứ tự playlist.
- Đã thêm smoke kiểm tra manifest thật qua Cloudflare `/api/stream` cho TV360+10/+13/+15, HLS URI con và metadata DASH/ClearKey; trạng thái phát thực tế sẽ được ghi sau khi smoke chạy xong.
- Chỉ thay đổi NM7 TV Web/Cloudflare; không sửa NM7 TV Android hay NM7 Mobile.

---

# Cập nhật mới nhất — xử lý lỗi phát Sự kiện TV360 trên NM7 TV Web (21/10/2026)

- **Lỗi theo ảnh kiểm thử:** TV360+10 báo HLS HTTP 404 khi chuyển proxy; TV360+13 báo lỗi khởi tạo Shaka; TV360+15 báo DASH/DRM lỗi 7001.
- **Phân tích:** nguồn dùng URL resolver `vmttv.dpdns.org/tv360/` và khai báo User-Agent `Dalvik/2.1.0`. Trước sửa, Web không đánh dấu resolver này để phát qua proxy ngay từ lần đầu, nên luồng có thể bắt đầu bằng một request trực tiếp không mang User-Agent nguồn. 7001 tự nó không đủ kết luận ClearKey không hợp lệ; cần xét log và chuỗi retry.
- **Bản sửa ứng viên:** phát hiện host/path TV360 trong parser M3U của Worker và các runtime Web, đặt `forceProxy=true`, giữ lại UA của playlist và để Worker proxy/rewrite manifest cùng segment HLS/DASH. Không sửa URL nguồn, khóa DRM hay nhóm playlist.
- **Kiểm thử:** `scripts/test-tv360-playback-routing.js` kiểm tra proxy-first, truyền User-Agent và cache key; workflow Cloudflare có production smoke cho TV360+10/+13/+15. Trạng thái phát hành cần dựa trên kết quả CI/production thật.
- **Phạm vi:** chỉ NM7 TV Web trên Cloudflare Workers; NM7 TV Android và NM7 Mobile không bị sửa.

---

# Cập nhật mới nhất — làm sáng nền thẻ sự kiện LIVE trên mobile (19/10/2026)

- **Yêu cầu:** thẻ sự kiện LIVE trên nền phong cảnh đang quá tối; cần cho ảnh nền xuyên qua nhiều hơn nhưng vẫn giữ chữ trắng dễ đọc.
- **Thay đổi:** trong `web-tv/index.html`, giảm alpha nền `.live-row` từ `rgba(8,18,30,.82)` xuống `rgba(8,18,30,.48)`. Độ đục giảm 20 điểm phần trăm, nền ảnh phía sau hiện rõ hơn. Không đổi bố cục, viền, màu chữ, nút, logic phát, feed/server LIVE hoặc CSS ẩn tiêu đề/URL đã nghiệm thu.
- **Regression:** `scripts/test-live-feed.js` xác nhận thẻ LIVE có nền trong suốt và alpha nằm trong khoảng 0.50–0.65 để cân bằng độ sáng và khả năng đọc.
- **PR/commit:** [PR #12](https://github.com/cnktvpc/nm7-tv-web/pull/12), merge commit [`11271fae637491cf8523872d78a288b8ccd9a212`](https://github.com/cnktvpc/nm7-tv-web/commit/11271fae637491cf8523872d78a288b8ccd9a212).
- **Kiểm thử PASS:** [LIVE UI regression](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39247374858), [JavaScript/Web validation](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39247374755), [Browser remote + HLS E2E](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39247374838), [production LIVE overlay smoke](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39247552237) và [production verification](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39247552234).
- **Cloudflare:** Worker version 473 nhận 100% lưu lượng. Workflow deploy đã chạy bước Wrangler thành công nhưng tổng job báo lỗi ở kiểm tra nguồn TV preset 1 vì upstream thực tế là URL Vercel cũ khác URL GitHub mà assertion mong đợi; vấn đề playlist riêng, không thuộc thay đổi giao diện.
- **Phạm vi:** chỉ giao diện danh sách LIVE của NM7 TV Web. Không sửa NM7 TV Android hoặc NM7 Mobile.
- **Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---

# Cập nhật mới nhất — bỏ thông báo lỗi HLS tạm thời khi LIVE chuyển proxy (19/10/2026)

- **Hiện tượng:** khi nguồn HLS trực tiếp trả HTTP 403, player tự thử proxy/nguồn dự phòng nhưng toast “HLS HTTP 403 · nguồn trực tiếp lỗi · thử proxy” vẫn nằm trên thanh dưới dù video đã phát từ nguồn 2/2.
- **Nguyên nhân:** `nextCandidate()` hiển thị toast cho từng lần tự động retry/chuyển nguồn; thông báo cũ có thể được gia hạn bởi sự kiện lỗi kế tiếp và không bị xóa khi playback bắt đầu.
- **Cách sửa:** tự động retry/chuyển proxy/nguồn chỉ ghi chi tiết vào debug, không phủ toast lỗi lên hình đang phát. Thêm `clearToast()` để hủy timer và xóa thông báo cũ khi mở kênh mới hoặc khi playback được xác nhận qua `markPlaying()`. Nếu mọi nguồn đều thất bại, lỗi cuối vẫn hiện trong vùng trạng thái player.
- **Giữ nguyên:** không đổi parser/feed LIVE, danh sách server, playlist URL, cấu hình proxy hay các selector CSS ẩn tiêu đề/URL IPTV và LIVE đã nghiệm thu.
- **Cache/runtime:** HTML và Worker dùng cache key `retryToast=20261019-cleanup1` để tránh tiếp tục tải runtime cũ.
- **Đã merge vào main:** [PR #11](https://github.com/cnktvpc/nm7-tv-web/pull/11), commit [`fad33e520a9617e8aabfa0a846315e7267af9016`](https://github.com/cnktvpc/nm7-tv-web/commit/fad33e520a9617e8aabfa0a846315e7267af9016).
- **Regression PASS:** [test player metadata/retry toast #39235633554](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39235633554); kiểm tra cả bốn runtime player.
- **Production smoke PASS:** [LIVE overlay/runtime #39235633574](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39235633574), [production verification #39235633686](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39235633686); xác nhận HTML và runtime mobile/PC đang dùng cache key mới.
- **Browser E2E PASS:** [remote + HLS #39235633510](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39235633510); fixture E2E cũng được cập nhật để dùng entrypoint player mobile hiện hành.
- **Cloudflare:** Worker version 470 đã nhận 100% lưu lượng, assets và service bindings được giữ nguyên. Workflow tổng thể deploy Worker thành công nhưng job sau đó báo lỗi ở assertion nguồn TV preset 1 do upstream thực tế khác URL mà test cũ mong đợi; đây là lỗi kiểm tra nguồn playlist riêng, không liên quan toast và không bị thay đổi trong PR này.
- **Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---

# Cập nhật mới nhất — ẩn tiêu đề/URL nguồn khi xem IPTV và giữ nguyên LIVE (18/10/2026)

- **Lỗi IPTV đã sửa:** khi xem kênh thông thường, thanh metadata do player tạo ra (tên kênh và URL nguồn ở phía trên video) được ẩn bằng selector `#player:not(.live-playback) #playerTop{display:none!important;}`.
- **Không thay đổi phần LIVE:** giữ nguyên các selector `#player.live-playback #playerTop` và `#player.live-playback #playerTitle`; không sửa logic LIVE, nút đổi server hoặc nguồn playlist trong bản sửa IPTV này.
- **Regression:** `scripts/test-live-player-hide-metadata.js` kiểm tra đồng thời selector IPTV mới và hai selector LIVE cũ. Các bước kiểm tra mã và regression trên nhánh sửa đều PASS.
- **Đã merge vào main:** [PR #10](https://github.com/cnktvpc/nm7-tv-web/pull/10), commit [`a70c915e8c968623f175e08910e90b7a04fd781d`](https://github.com/cnktvpc/nm7-tv-web/commit/a70c915e8c968623f175e08910e90b7a04fd781d).
- **Xác nhận production sau deploy:** [Production LIVE/overlay smoke #39108104927 — SUCCESS](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39108104927) và [validation #39108104998 — SUCCESS](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39108104998). HTML production chứa đủ selector IPTV/LIVE; runtime mobile và PC vẫn có trạng thái `live-playback`. Cloudflare Worker production được cập nhật lên version 467, nhận 100% lưu lượng.
- **Phạm vi:** chỉ NM7 TV Web/Cloudflare. Không thay đổi NM7 TV Android hoặc NM7 Mobile.
- **Ghi chú CI:** workflow deploy tổng thể đã deploy Worker thành công nhưng sau đó một smoke test nguồn TV preset 1 thất bại vì URL upstream thực tế khác URL GitHub được assertion cũ mong đợi. Đây là lỗi kiểm thử nguồn playlist riêng, không phải lỗi overlay; không thay đổi nguồn playlist trong PR #10.
- **Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---

# Cập nhật mới nhất — sửa player mobile: tự ẩn nút fullscreen, bỏ toast tua (14/10/2026)

- Trên điện thoại/tablet, nút toàn màn hình tự ẩn sau 2,4 giây không thao tác; chạm hoặc di chuyển ngón tay trên player sẽ hiện lại và đặt lại thời gian.
- Chế độ mobile chỉ ẩn nút fullscreen, không ẩn thanh điều khiển phát video. PC giữ nguyên cơ chế đã xác nhận ổn định (ẩn cả fullscreen và thanh điều khiển sau thời gian idle).
- Khi nguồn trực tiếp không hỗ trợ tua, thao tác tua không hiện toast "Luồng này không hỗ trợ tua" che thanh điều khiển.
- Asset runtime được đổi sang `app-safari-policy-mobile-controls.js?v=20261014-mobile-autohide1` để tránh CDN/edge cache phục vụ file JavaScript cũ.
- Bổ sung regression mobile và production smoke; chỉ áp dụng NM7 TV Web/Cloudflare Worker, không sửa NM7 TV Android hoặc NM7 Mobile.
- **Đã merge vào stable:** [PR #32](https://github.com/phuongnm7/nm7-tv-web/pull/32), commit `e96f9413478d4b7bec93f080ec5d949adfb36ba4`.
- **Cloudflare deploy + smoke:** [workflow #38520866144 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38520866144). Smoke cho PC, mobile player, playlist/Worker, iPad và Bản tin đều đạt. Kiểm tra mobile xác nhận asset đang hoạt động, timer 2,4 giây, lớp ẩn fullscreen riêng và toast seek đã bỏ.
- **Ghi chú kiểm thử:** đây là xác minh tự động trên asset/production; cần tải lại trang trên trình duyệt điện thoại để xác nhận giao diện thực tế ở thiết bị của bạn.

Production: https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---

# Cập nhật mới nhất — khôi phục nhận diện sự kiện LIVE trên Web (14/10/2026)

- Phát hiện điểm yếu: endpoint có thể trả M3U hợp lệ nhưng parser loại hết sự kiện khi nguồn đổi từ emoji xanh sang nhãn chữ/nhóm LIVE, hoặc chuyển ngày giờ sang định dạng ISO. Bài test LIVE trước đây chưa chạy trong preflight Cloudflare.
- Sửa parser: nhận diện LIVE, LIVE NOW, IN PROGRESS, Trực tiếp/Đang diễn ra và nhóm LIVE; hỗ trợ ngày giờ ISO cùng dấu phân cách ngày tháng phổ biến. Vẫn yêu cầu giờ hợp lệ/cặp đấu và giữ nguyên lọc sự kiện quá cũ.
- Khi feed tải thành công nhưng không có event, dòng trạng thái hiện số mục đã parse, mục có giờ, có dấu LIVE và có cặp đấu.
- HTML dùng asset path mới live-core-livefix-20261014.js và live-ui-livefix-20261014.js để tránh nhận nhầm JavaScript cũ từ edge cache.
- Bổ sung regression fixture và đưa `scripts/test-live-feed.js` vào preflight; production smoke chạy thêm chẩn đoán parser trên feed thực.
- **Production xác nhận:** [Cloudflare smoke #38485043959 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38485043959). Worker deploy và toàn bộ smoke test đã qua.
- **Feed thật:** 938 mục M3U, 421 có giờ thi đấu, 49 mục có dấu LIVE, 45 nguồn đủ điều kiện và 9 sự kiện đã được parser gom nhóm. Trang chủ và `/api/live-feed` đều qua smoke test.
- **Xác nhận thực tế:** người dùng đã kiểm tra lại mục LIVE trên NM7 TV Web và xác nhận hoạt động bình thường sau khi tải lại trang.
- Smoke lần đầu dừng ở assertion playlist cũ yêu cầu `VTV6 HD`; đã đồng bộ expectation theo tên thực `VTV6`, sau đó workflow hoàn tất thành công.
- **Phạm vi:** chỉ NM7 TV Web và Cloudflare Worker; không sửa NM7 TV Android hoặc NM7 Mobile.

Production: https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---
# Cập nhật mới nhất — tự ẩn nút fullscreen và thanh điều hướng PC (13/10/2026)

- **Hành vi khi phát:** nút ⛶ và thanh nút điều hướng xuất hiện khi mở player hoặc khi người dùng bấm vào màn hình. Sau khoảng 2,4 giây không thao tác, cả hai tự ẩn.
- **Khi UI đã ẩn:** rê chuột không làm các nút bật lên liên tục; click/chạm mới đánh thức UI. Khi UI đang hiện, di chuyển chuột tiếp tục gia hạn thời gian để thao tác.
- **Giữ nguyên click/focus PC:** phần sửa focus theo tọa độ click và thao tác click nền player để mở nút điều hướng được giữ nguyên.
- **Kiểm thử và cache:** smoke test production vừa phát hiện CDN trả bytes JS cũ dù HTML đã mới; vì vậy player script đang hoạt động được chuyển sang asset path duy nhất `app-safari-policy-pc-controls.js`, thay vì chỉ tăng query cache-buster. Regression/smoke phải đọc đúng file này và kiểm tra ẩn đồng thời nút fullscreen cùng các nút điều hướng.
- **Phạm vi:** chỉ NM7 TV Web/Cloudflare Worker. Không sửa NM7 TV Android hoặc NM7 Mobile.

**Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---

# Cập nhật mới nhất — click player mở thanh tùy chọn, không tạm dừng; nút fullscreen luôn hiện (13/10/2026)

- **Click trái vào hình đang phát trên PC:** mở thanh tùy chọn như ảnh tham chiếu: Danh sách kênh, tua lùi 10 giây, phát/tạm dừng, tua tới 30 giây và CH+. Click nền/video không gọi togglePlay và không làm dừng luồng.
- **Tạm dừng chủ động:** chỉ nút ▶/Ⅱ trong thanh tùy chọn mới thực hiện lệnh phát/tạm dừng. Click vào nút hoặc điều khiển khác không bị đổi thành lệnh mở thanh.
- **Nút fullscreen:** bỏ timeout/CSS tự ẩn, luôn hiển thị và có thể bấm suốt lúc player mở.
- **Focus và phạm vi:** focus bám đúng phần tử dưới con trỏ; không mô phỏng điều hướng TV khi di chuyển chuột PC. Điều hướng TV/gamepad vẫn riêng cho thiết bị TV. Chỉ thay đổi NM7 TV Web và Cloudflare Worker; không đụng NM7 TV Android hoặc NM7 Mobile.
- **Kiểm thử/deploy:** [Cloudflare workflow #38339057021 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38339057021). Preflight JS/regression, deploy Worker, smoke trang chủ, tab PC, player-click/fullscreen, Bản tin và status publish đều PASS.

**Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---

# Cập nhật mới nhất — click chuột trái PC và tự ẩn nút fullscreen (13/10/2026)

- **Click trái trên video PC:** khi player đang phát, click trái vào vùng video/nền player sẽ được xử lý thành phát/tạm dừng; click trên nút fullscreen, điều khiển, danh sách chọn kênh hoặc nút nguồn chính thức không bị chuyển thành lệnh tạm dừng. Chỉ áp dụng desktop pointer.
- **Focus theo con trỏ:** pointerdown focus phần tử tương tác ở đúng vị trí click; click video focus về video. Chuyển động chuột không còn giả lập hướng TV, tránh focus tự nhảy.
- **Tự ẩn fullscreen:** trên PC nút ⛶ hiện khi mở player hoặc khi có di chuyển/bấm chuột và tự ẩn sau 2,4 giây không hoạt động. Di chuyển chuột/click lại sẽ hiện nút; khi đóng player timer được hủy. Mobile/touch không dùng CSS auto-hide desktop.
- **Bảo toàn TV:** remote/gamepad và pointer navigation dành cho TV được giữ riêng. Không sửa NM7 TV Android hoặc NM7 Mobile.
- **Kiểm thử/deploy:** preflight kiểm tra click trái và timer; smoke sau deploy tải trực tiếp HTML/JS từ Cloudflare Worker.

**Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---

# Cập nhật mới nhất — sửa focus chuột PC và giữ nút toàn màn hình luôn hiện (13/10/2026)

> **Trạng thái:** Đã triển khai lên Cloudflare Worker production; toàn bộ preflight và production smoke test thành công trong [workflow #38333287831 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38333287831).

- **Focus chuột PC:** chuyển động con trỏ không còn phát lệnh điều hướng TV lên/xuống/trái/phải. Khi nhấn chuột, phần tử tương tác ở tọa độ click được focus; nếu click vùng video đang phát thì focus video thay vì giữ focus cũ ở danh sách kênh.
- **Giữ riêng điều hướng TV:** pointer gestures, click-to-row bookkeeping và gamepad tiếp tục dành cho thiết bị TV. Không thay đổi NM7 TV Android hoặc NM7 Mobile.
- **Nút toàn màn hình:** bỏ bộ đếm 2,4 giây, bỏ CSS tự ẩn và listener đánh thức UI. Nút ⛶ luôn hiển thị, nhận click trong suốt thời gian player mở, kể cả khi không di chuyển chuột.
- **Cache và regression:** tăng cache key của app-safari-policy.js; mở rộng scripts/test-menu-fullscreen.js và cập nhật các test dùng cache key. Deploy preflight kiểm tra focus chuột, logic TV-only và nút fullscreen cố định; production smoke tải HTML/JS trực tiếp từ Cloudflare.
- **Phạm vi triển khai:** chỉ phuongnm7/nm7-tv-web trên Cloudflare Worker.

**Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---

# Cập nhật mới nhất — nút toàn màn hình tự ẩn và phục hồi cử chỉ chuột PC (13/10/2026)

> **Trạng thái:** Đã merge PR [#30](https://github.com/phuongnm7/nm7-tv-web/pull/30) và triển khai production thành công trong [Cloudflare workflow #38331632803 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38331632803).

- **Nút fullscreen:** khi mở trình phát, nút ⛶ xuất hiện tạm thời. Sau 2,4 giây không có thao tác, nút mờ/ẩn và không chặn video. Nút hiện lại khi có di chuyển chuột, click, pointer down, chạm màn hình hoặc thay đổi trạng thái fullscreen.
- **Điều hướng bằng chuột trên PC:** nguyên nhân cũ là bộ nhận hướng chỉ chạy trên thiết bị được nhận diện là TV. Đã bổ sung chế độ desktop pointer (viewport từ 1025px và pointer chính xác), đưa thao tác di chuyển chuột vào bộ điều hướng bốn hướng. Một cử chỉ cần khoảng 44px di chuyển; tích lũy được đặt lại khi đổi hướng hoặc ngừng di chuyển để tránh nhiễu.
- **Giữ hành vi thiết bị khác:** ngưỡng điều hướng TV giữ nguyên; vòng lặp gamepad chỉ chạy ở chế độ TV; sự kiện touch trên mobile vẫn có thể làm hiện nút fullscreen.
- **Regression:** [Web Browser Validation #38331475642 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38331475642) và [Browser HLS E2E #38331475558 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38331475558).
- **Production smoke:** [#38331632803 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38331632803). Log xác nhận `PC_MENU_FULLSCREEN_MOUSE_AUTOHIDE_PRODUCTION_SMOKE_OK`, `DESKTOP_HOME_TABS_PRODUCTION_SMOKE_OK` và các smoke test trang chủ/Bản tin.
- **Phạm vi:** chỉ NM7 TV Web/Cloudflare; không sửa NM7 TV Android hoặc NM7 Mobile, không triển khai ứng dụng lên Vercel.

**Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---

# Cập nhật mới nhất — khôi phục menu PC và thêm nút toàn màn hình (13/10/2026)

> **Trạng thái:** Đã merge vào nhánh ổn định và triển khai lên Cloudflare Worker production. Workflow [#38330129984 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38330129984).

- **PR:** [#29 — Fix desktop hamburger menu and add fullscreen player control](https://github.com/phuongnm7/nm7-tv-web/pull/29), merge commit [`b2a9552`](https://github.com/phuongnm7/nm7-tv-web/commit/b2a955284c64d602046ef42d091c58b6321b10ec).
- **Menu PC:** nguyên nhân là CSS desktop chủ động ẩn `#mobileMenuBtn`. Đã bỏ quy tắc ẩn và đảm bảo nút ☰ hiển thị/nhận focus trên PC; giao diện mobile vẫn giữ nguyên.
- **Toàn màn hình:** thêm nút ⛶ cố định trong trình phát trên PC và mobile. Hỗ trợ Fullscreen API chuẩn/WebKit, cập nhật trạng thái nút khi vào/thoát, thoát toàn màn hình khi đóng trình phát và dùng fallback video fullscreen của Safari iOS khi có hỗ trợ.
- **Kiểm thử:** [desktop/mobile regression #38330010608](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38330010608), [Web Browser Validation #38330006331](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38330006331), [preview regression #38330010441](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38330010441) đều đạt.
- **Production smoke test:** log xác nhận `PC_MENU_FULLSCREEN_PRODUCTION_SMOKE_OK`; đã tải HTML và script đang được Cloudflare phục vụ, kiểm tra nút ☰, nút toàn màn hình, ba tab YouTube/LIVE/Bản tin cùng API fullscreen/WebKit fallback.
- **Phạm vi:** chỉ NM7 TV Web và workflow kiểm thử của repo này; không thay đổi NM7 TV Android hoặc NM7 Mobile, không dùng Vercel để triển khai ứng dụng.

**Production:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/

---

# Cập nhật mới nhất — khôi phục thanh YouTube / LIVE / Bản tin trên PC (13/10/2026)

> **Nguyên nhân:** `#homeTabs` mặc định bị ẩn và chỉ được bật trong media query dành cho màn hình cảm ứng. PC dùng chuột nên ba nút không xuất hiện dù đã có trong HTML.

- **Bản sửa:** PR [#28](https://github.com/phuongnm7/nm7-tv-web/pull/28) đã merge vào nhánh ổn định.
- **Thay đổi:** bật thanh tab trên màn hình desktop rộng hơn 1024px với con trỏ chính xác; giữ nguyên bố cục mobile và ẩn nút menu mobile trên PC.
- **Regression test:** `scripts/test-desktop-home-tabs.js`, được thêm vào bước kiểm tra trước deploy của Cloudflare.
- **Production:** đã triển khai thành công lên Cloudflare Worker trong [workflow #38328207828 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38328207828). Cả kiểm tra hồi quy desktop/mobile `DESKTOP_HOME_TABS_REGRESSION_OK` lẫn smoke test Worker và Bản tin production đều đạt.
- **Kết quả:** ba nút YouTube, LIVE, Bản tin có mặt trong HTML; CSS desktop hiển thị thanh tab ở viewport rộng hơn 1024px với con trỏ chính xác; quy tắc mobile được giữ nguyên.
- **Phạm vi:** chỉ NM7 TV Web/Cloudflare; không sửa NM7 TV Android, NM7 Mobile, không dùng Vercel làm nơi triển khai ứng dụng.

---
# Cập nhật mới nhất — sửa gom nhóm LIVE theo trận đã triển khai production (12/10/2026)

> **Trạng thái phát hành:** PR #27 đã được squash-merge vào nhánh ổn định và Worker production đã deploy thành công. Regression xác nhận các luồng cùng trận được gom thành một thẻ với nhiều server; các trận khác vẫn tách riêng.

- **Nhánh stable:** `stable/nm7-tv-web-2026-10-09`
- **PR tính năng LIVE:** [#26 — Add independent LIVE events to NM7 TV Web](https://github.com/phuongnm7/nm7-tv-web/pull/26)
- **PR sửa gom server theo trận:** [#27 — Fix grouping of same LIVE fixture across commentator/server variants](https://github.com/phuongnm7/nm7-tv-web/pull/27)
- **Commit runtime đã merge/deploy:** [`01527437e13af02461526efa86d9e026e7f7168a`](https://github.com/phuongnm7/nm7-tv-web/commit/01527437e13af02461526efa86d9e026e7f7168a)
- **Production Cloudflare:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/
- **Production deploy + smoke:** [workflow #38250837941 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38250837941).
- **Regression grouping:** [workflow #38250716920 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38250716920). Bốn luồng Hougang United–Balestier Khalsa được xác nhận thành một trận với bốn server.

## Mục LIVE đã phát hành

- Feed LIVE độc lập lấy từ `https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u` qua `/api/live-feed`, không phụ thuộc playlist do người dùng nhập.
- Phân tích kickoff UTC+7, lọc sự kiện kết thúc/quá cũ và gom luồng theo cùng cặp đội. Hậu tố như `(BLV ĐỎM)`, `(BÒ TƯƠI)`, `(CÔNG CHẤT)`, `(Tv)` không còn tạo thẻ trùng; chúng vẫn được giữ làm nhãn server.
- Hiển thị `Đã live N phút`, cập nhật mỗi 60 giây; feed tự làm mới mỗi 5 phút.
- Có chọn server trên thẻ sự kiện và trong player; khi đóng LIVE khôi phục trạng thái IPTV thông thường.
- Parser cache-buster: `live-core.js?v=20261012-live-core2`; script giao diện: `live.js?v=20261012-live-ui2`.
- Regression xác nhận cú pháp, parser LIVE và các hồi quy playlist/UI; production workflow xác nhận Worker, homepage, feed, playlist, YouTube và Bản tin/GetOut thành công.
- Chỉ sửa NM7 TV Web/Cloudflare. Không thay đổi NM7 TV Android hoặc NM7 Mobile; ứng dụng không được triển khai lên Vercel.

---
# NM7 TV Web — Bản ổn định

NM7 TV Web là giao diện IPTV trên trình duyệt, lấy giao diện/hành vi của **NM7 TV Android 1.0.69** làm chuẩn. Tài liệu này mô tả bản ổn định hiện tại; nhật ký chẩn đoán theo từng ngày nằm trong [PROGRESS.md](PROGRESS.md).

## Mục LIVE — đã merge vào stable (12/10/2026)

Mục LIVE đã được tích hợp vào nhánh `stable/nm7-tv-web-2026-10-09` qua PR [#26](https://github.com/phuongnm7/nm7-tv-web/pull/26), squash commit [`ba6eaaf`](https://github.com/phuongnm7/nm7-tv-web/commit/ba6eaaf2ea1ae4f59da5fad360784347348b5410). Workflow [#38218369492](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38218369492) xác nhận syntax, Live parser/regression, regression playlist/UI, preview deployment và smoke test đều PASS.

- Feed LIVE độc lập lấy từ `https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u` qua `/api/live-feed`; không phụ thuộc playlist do người dùng nhập.
- Lọc sự kiện LIVE, phân tích kickoff UTC+7, nhóm nhiều server cùng trận, bỏ sự kiện kết thúc/cũ và hiển thị số phút đã live.
- Nhãn thời lượng cập nhật mỗi 60 giây; feed tự làm mới mỗi 5 phút.
- Dùng player hiện có, cho phép chọn server trên thẻ và trong player; khôi phục trạng thái IPTV thường khi đóng LIVE.
- Sửa validation M3U để xử lý đúng `#EXTM3U`, BOM và khoảng trắng đầu dòng; tăng cache-buster `live.js?v=20261012-live-ui2`.
- **Production deploy:** chỉ được xác nhận sau khi workflow Cloudflare production và smoke test production hoàn tất thành công. Preview hiện có tại https://nm7-tv-web-live-preview.phuongnm7-iptv.workers.dev/.
- Không sửa NM7 TV Android hoặc NM7 Mobile.

## Mốc chính thức hiện tại

| Hạng mục | Giá trị |
|---|---|
| Repository | [phuongnm7/nm7-tv-web](https://github.com/phuongnm7/nm7-tv-web) |
| Nhánh stable | `stable/nm7-tv-web-2026-10-09` |
| Mã runtime đã deploy/xác minh | `8f513632a0b51b57a42d795968bb62aa2d5b764b` |
| Production | https://nm7-tv-web.phuongnm7-iptv.workers.dev/ |
| Lần deploy/smoke test gần nhất đạt | [Cloudflare workflow #38103299751 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38103299751) |
| Baseline UI | NM7 TV Android 1.0.69 |
| Ngày chốt trạng thái | 11/10/2026 |

**Đây là mốc chuẩn cho các phiên bản kế tiếp.** Mọi nhánh phát triển mới phải được tạo từ HEAD mới nhất của `stable/nm7-tv-web-2026-10-09`. Không lấy nhánh thử nghiệm cũ làm nền và không lấy repository NM7 Android/Mobile làm nền.

## Phạm vi triển khai và kiến trúc

Ứng dụng NM7 TV Web được phục vụ bởi **Cloudflare Workers**:

- `worker.js`: định tuyến request, xử lý playlist API, nhập nguồn và proxy stream.
- `wrangler.toml`: cấu hình Worker `nm7-tv-web`, static assets và Service Bindings.
- `web-tv/index.html`: giao diện chính và các asset.
- `web-tv/app-safari-policy-pc-controls.js`: script player đang được trang chính nạp (file asset path riêng để tránh edge cache cũ).
- `web-tv/app.js`: script ứng dụng được duy trì song song; khi sửa logic chung cần kiểm tra các thay đổi liên quan ở cả hai file.
- `web-tv/youtube.js`: launcher điều hướng YouTube.
- `web-tv/mobile-background.js`: Media Session/Picture-in-Picture khi browser hỗ trợ.
- `.github/workflows/cloudflare-deploy.yml`: tự động chạy kiểm thử, deploy Cloudflare và smoke test production.
- `scripts/test-sport-playlist-refresh.js`, `scripts/test-ipad-landscape-menu.js`: regression tests cho các lỗi đã sửa gần nhất.

Lưu ý rõ về Vercel: URL `https://nm7-tv-web.vercel.app/api/vietmitv-merge` còn được dùng làm **upstream playlist của Truyền hình preset 1**. Đây không phải nơi chạy giao diện NM7 TV Web; không triển khai ứng dụng lên Vercel và không thay đổi dự án Vercel khi xử lý NM7 TV Web.

## Tính năng trong bản ổn định

### Giao diện và điều khiển

- Giao diện TV theo chuẩn NM7 TV Android 1.0.69, có nhóm kênh, logo, danh sách và menu tùy chọn.
- Hỗ trợ bố cục responsive cho điện thoại/iPad.
- Điều hướng bằng phím remote TV và focus cho các thành phần giao diện.
- Nút menu ☰ ở góc trên bên trái hoạt động trên iPad nằm ngang, gồm trường hợp Safari dùng “Yêu cầu trang web cho máy tính”. Bản sửa nhận diện iPadOS Macintosh/MacIntel bằng nhiều điểm chạm và tải script mới qua cache-buster.
- Có launcher YouTube chính thức; NM7 Web không thay thế giao diện hoặc tài khoản YouTube.

### Nguồn Truyền hình

Có hai preset và lựa chọn mặc định theo thiết bị:

- **Android và Windows:** mặc định preset 2.
- **iPhone/iPad/iPod:** mặc định preset 1; iPadOS desktop mode được nhận diện.
- **Thiết bị khác:** mặc định preset 1 nếu không có quy tắc cụ thể khác.

API:
- `/api/playlist?source=tv&default=1` — preset 1 (VietMiTV Merge).
- `/api/playlist?source=tv&default=2` — preset 2 (nguồn playlist truyền hình khác đã cấu hình trong Worker).

VTV1 của preset 1 dùng nguồn đã cấu hình trong playlist preset này. Không tự ý thêm lại VTVGO hoặc đổi nguồn mặc định khi không có yêu cầu.

### Nguồn Thể thao

- Nguồn chính là playlist động: `https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u`.
- Nguồn GitHub Raw `sports-auto.m3u` chỉ là dự phòng.
- Mỗi lần mở hoặc tải lại Thể thao sử dụng `refresh=1` để bỏ qua cache playlist nội bộ của Worker NM7 Web.
- Service Binding `THETHAO_SOURCE` giải quyết lỗi gọi Worker nguồn qua URL `workers.dev` bằng Fetch API thông thường.
- API làm mới: `/api/playlist?source=sport&refresh=1`.

Số lượng kênh là dữ liệu động. Smoke test ngày 10/10/2026 ghi nhận 1.028 kênh ở đường nguồn tùy chỉnh; không được coi con số này là số lượng cố định hoặc cam kết mọi kênh đều đang phát.

### Thêm nguồn IPTV

- Thêm nguồn qua URL bằng `/api/source?u=<URL_playlist_đã_encode>`.
- Có hỗ trợ nhập tệp `.m3u` và `.m3u8` cục bộ, giới hạn 20 MB.
- Tệp cục bộ được trình duyệt đọc qua File API, không upload nội dung lên server.
- Parser giữ metadata có trong nguồn như `tvg-id`, `tvg-logo`, `group-title`, URL stream, header và metadata DRM trong giới hạn dữ liệu nguồn cung cấp.
- Worker xử lý đường tải nguồn, URL tương đối và các header M3U được hỗ trợ. Một URL có thể vẫn thất bại nếu upstream yêu cầu xác thực, chặn môi trường Cloudflare hoặc thay đổi định dạng.

### Playback và proxy

Các nhánh phát hiện có trong baseline gồm HLS, DASH/DRM, FLV và MPEG-TS; khả năng sử dụng từng nhánh phụ thuộc browser, codec, DRM/giấy phép, header và chính sách của nhà cung cấp.

- Shaka Player 5.2.12.
- hls.js 1.7.3.
- flv.js 1.6.2.
- mpegts.js 1.8.2.
- Worker có các đường proxy/điều phối manifest và segment cho các trường hợp được hỗ trợ.
- Sửa lỗi ưu tiên proxy HLS/segment của SCTV4K và đường TCP streaming có điều kiện cho một dạng nguồn Stalker/Xtream; logic này có regression checks và được giữ trong nhánh stable.
- `/api/stream` là entrypoint proxy stream được sử dụng trong các luồng hỗ trợ.

**Giới hạn:** smoke test về parser, HTTP status hoặc manifest không chứng minh mọi kênh chạy được trên mọi thiết bị. Safari/iOS không được coi là hỗ trợ mọi nguồn DASH/DRM ClearKey; những nguồn đó có thể cần nguồn HLS/FairPlay hợp lệ hoặc ứng dụng chính thức của nhà cung cấp.

### Chạy nền và YouTube

- IPTV dùng Media Session và Picture-in-Picture khi browser/OS cung cấp API tương ứng.
- PiP, khóa màn hình và phát nền phụ thuộc khả năng và chính sách của thiết bị.
- Nút YouTube mở trang YouTube chính thức.
- `tizen-youtube-host/` là scaffold/native EWK host phục vụ nghiên cứu lọc request. Chưa tuyên bố YouTube ad-free hoàn chỉnh trên Samsung Tizen cho tới khi build/sign/install và kiểm tra E2E trên TV thật.

### Bản tin GetOut

- Đã phát hành tại `/ban-tin.html` với ba phần **Highlight**, **Xem lại** và **Tin thể thao (ON Plus)**.
- API `/api/news?source=highlights|onplus|replay`; `refresh=1` buộc lấy mới từ nguồn. Cache thường 60 giây, danh sách tự kiểm tra lại sau 90 giây và tiền tải hai tab chưa mở sau khi Highlights hiển thị.
- Xem lại ưu tiên tên đội nhà/đội khách; thumbnail được tải qua Worker `/api/image` với Referer/Origin nhà cung cấp để tránh lỗi CDN 403 khi hotlink trực tiếp.
- ON Plus giữ nguyên nested HLS dạng `...mp4/index.m3u8`; nội dung Premium/protected không bị vượt xác thực hoặc DRM.
- Regression tests của Bản tin chạy trước production deploy; workflow Cloudflare thêm smoke test sau deploy cho API, title Xem lại và byte ảnh thumbnail thật.
## API chính

| Endpoint | Mục đích |
|---|---|
| `GET /api/playlist?source=tv&default=1` | Truyền hình preset 1 |
| `GET /api/playlist?source=tv&default=2` | Truyền hình preset 2 |
| `GET /api/playlist?source=sport&refresh=1` | Làm mới nguồn Thể thao, bỏ qua cache |
| `GET /api/source?u=<URL_đã_encode>` | Nhập playlist tùy chỉnh |
| `/api/stream` | Proxy/điều phối các stream được hỗ trợ |
| `GET /api/news?source=...` | Danh sách Highlights, ON Plus và Xem lại |
| `GET /api/news/play?source=...` | Resolve luồng HLS/MP4 công khai được hỗ trợ |
| `GET /api/image?u=...&r=...` | Proxy ảnh thumbnail với referrer của nhà cung cấp |

## Kiểm thử và xác nhận production gần nhất

Workflow [#38103299751](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38103299751) chạy trên nhánh stable ở runtime commit `8f513632a0b51b57a42d795968bb62aa2d5b764b` đã **SUCCESS**, bao gồm deploy Cloudflare Worker và YouTube proxy.

- Syntax check và regression test cho player, nguồn Thể thao, menu iPad, Bản tin GetOut, parser thumbnail và URL media ON Plus đều đạt trước deploy.
- Smoke test Worker production hiện có đạt: preset Truyền hình, player/Safari policy, YouTube launcher, menu iPad và nhập nguồn tùy chỉnh.
- Bản tin production API: Highlights 40 mục; Tin thể thao ON Plus 60 mục/60 URL ảnh; Xem lại GetOut 30 mục/30 URL ảnh.
- Tải ảnh thật sau deploy: ON Plus 3/3 ảnh JPEG hợp lệ (HTTP 206 khi yêu cầu Range); Xem lại 3/3 ảnh JPEG hợp lệ qua proxy Worker (HTTP 200). Smoke test kiểm tra đủ tên hai đội trên toàn bộ 30 bản ghi Xem lại.
- Preview E2E trước khi phát hành xác nhận HLS manifest và tài nguyên con cho Highlights, ON Plus và Xem lại. Cache-hit được đo trong workflow preview khoảng 0,07 giây cho ON Plus và 0,065 giây cho Xem lại ở một lượt kiểm tra; không phải cam kết độ trễ mọi mạng/thiết bị.
- Source-import smoke test production ở lượt deploy: `CLOUDFLARE_TARGET_SOURCE_SMOKE_OK channels=995 fetchMode=nm7-ua`. Số lượng playlist là dữ liệu động, không phải con số cố định.

Kiểm thử tự động không thay thế việc thử mọi kênh trên từng model TV/iPad, đặc biệt với nguồn có giới hạn vùng, codec hoặc DRM.
## Quy trình phát triển tiếp theo

1. Tạo nhánh `feature/*` hoặc `fix/*` từ HEAD mới nhất của `stable/nm7-tv-web-2026-10-09`.
2. Trước khi sửa, xác định file và hành vi thực sự liên quan; giữ thay đổi cô lập, không làm sạch/tái cấu trúc phần không liên quan.
3. Chạy các kiểm thử liên quan. Tối thiểu với player/UI: `node --check web-tv/app-safari-policy.js`, `node --check web-tv/app.js`, `node --check web-tv/youtube.js`; test nguồn Thể thao và menu iPad:
   - `node scripts/test-sport-playlist-refresh.js`
   - `node scripts/test-ipad-landscape-menu.js`
4. Chạy workflow Cloudflare đầy đủ và kiểm tra URL production sau deploy. Phân biệt rõ code đã sửa, deploy có thành công, smoke test nào đã qua và những gì cần test trên thiết bị thật.
5. Chỉ đưa bản mới thành mốc stable sau khi kiểm thử liên quan đạt và đã xác nhận không làm hỏng hành vi hiện tại.
6. Không chỉnh NM7 TV Android, NM7 Mobile, hay cấu hình deploy Vercel. Không thay nguồn/preset mặc định ngoài phạm vi yêu cầu.

## Tài liệu liên quan

- [Tiến độ và nhật ký chẩn đoán chi tiết](PROGRESS.md)
- [Quy định mốc ổn định](STABLE_BASELINE.md)
- [Nhánh stable](https://github.com/phuongnm7/nm7-tv-web/tree/stable/nm7-tv-web-2026-10-09)
- [Workflow Cloudflare gần nhất đã thành công](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38064641220)


## Bản tin kiểu GetOut — đã phát hành chính thức (11/10/2026)

PR [#25](https://github.com/phuongnm7/nm7-tv-web/pull/25) đã được squash-merge vào `stable/nm7-tv-web-2026-10-09` và deploy/smoke-test tại runtime commit `8f513632a0b51b57a42d795968bb62aa2d5b764b`. Trang chính thức: https://nm7-tv-web.phuongnm7-iptv.workers.dev/ban-tin.html. Nhánh `feature/getout-ban-tin-20261010` và Worker preview được giữ làm lịch sử kiểm thử; không triển khai ứng dụng lên Vercel, không sửa NM7 Mobile hoặc NM7 TV Android.

- Trang: `/ban-tin.html`; từ màn hình chính và side menu, nút Bản tin được nối trong script đang thực sự được tải là `app-safari-policy-pc-controls.js`.
- API: `/api/news?source=highlights|onplus|replay`, dùng allowlist nguồn cố định, timeout và cache metadata 60 giây dùng Cache API của Cloudflare; `refresh=1` bỏ qua cache khi cần dữ liệu mới ngay.
- Highlights 24h: parser theo cấu trúc GetOut đã phân tích trong APK (`article.cate-24h-foot-home-latest-list__box`, `p.cate-24h-foot-home-latest-list__name`) cùng endpoint AJAX tải thêm.
- Xem lại: đọc base URL từ cấu hình công khai GetOut `leeshin5757/getout/txt/btv` (hiện trả `https://bongplus.vip`); gọi endpoint replay và parse đúng `result.records[*]`. Trường `url1` trả link HLS đến `static.wex1sora.com/.../index.m3u8`, được chuẩn hóa thành URL phát trực tiếp. Bản web không trích xuất khóa hoặc vượt DRM; nếu luồng không thể phát trực tiếp, người xem có thể mở trang nhà cung cấp.
- Player độc lập hỗ trợ HLS native hoặc Hls.js và MP4, có nút quay lại/đóng và fallback mở nguồn. Với ON Plus, Worker đọc `initVideo` từ dữ liệu trang video công khai và giữ nguyên đường dẫn HLS chính thức dạng `...mp4/index.m3u8`; trước đây regex dừng ở `.mp4` nên nhận nhầm URL thành MP4 và upstream trả HTTP 400. Nội dung `is_protected`/Premium bị từ chối thay vì tìm cách vượt quyền truy cập hoặc DRM.
- Nguồn cụ thể cho nhãn `HighLight #2` và `HighLight #3` trong APK chưa xác định chắc chắn; chưa tuyên bố đây là bản sao hoàn chỉnh toàn bộ GetOut.

Kiểm thử Cloudflare preview sau khi dọn mã chẩn đoán: [workflow #38098170780 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38098170780). Kết quả: Highlights tải HLS manifest và tài nguyên con qua proxy NM7; Tin thể thao giữ đúng URL HLS ON Plus dạng `...mp4/index.m3u8` và tải được manifest/tài nguyên con; Xem lại tải HLS manifest và tài nguyên con. Workflow có regression test riêng cho nested HLS URL, MP4 thông thường và HLS có query string. Kiểm thử HTTP tự động không thay thế kiểm tra playback trên iPad/Safari và TV browser.

URL preview: https://nm7-tv-web-news-preview.phuongnm7-iptv.workers.dev/ban-tin.html

## Bản tin GetOut — thumbnail, cập nhật dữ liệu và tốc độ (preview, 11/10/2026)

- ON Plus: parser tìm URL ảnh trong trường thumbnail/cover lồng nhau và trong thuộc tính lazy-load (`data-src`, `data-lazy-src`, `srcset`, `data-srcset`, `style background-image`), bỏ qua giá trị placeholder như `image: "name"`.
- Xem lại: ưu tiên thumbnail/cover của sự kiện, chỉ dùng logo đội bóng làm dự phòng.
- Giao diện có nút **Cập nhật** để gọi `refresh=1`, tự kiểm tra lại sau 90 giây; cập nhật cùng tab giữ danh sách cũ trong khi chờ. Hai tab còn lại được tiền tải sau khi Highlights hiển thị.
- Cache thông thường dùng Cloudflare Cache API 60 giây. Nút Cập nhật luôn bỏ qua cache và fetch lại nguồn. CI đo riêng tốc độ upstream và cache-hit.
- Workflow preview [#38100679308](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38100679308): ON Plus 60/60 mục có URL ảnh, Xem lại 30/30; kiểm tra manifest HLS và tài nguyên con thành công. Fetch buộc làm mới đo được ~5,29 giây cho ON Plus và ~1,67 giây cho Xem lại trong lượt kiểm tra đó; thời gian thực tế thay đổi theo provider.
- Tại thời điểm đo này, tính năng còn ở feature branch/Worker preview. Sau đó PR #25 đã được merge và deploy chính thức; xem mục “Kiểm thử và xác nhận production gần nhất” ở đầu README. Vẫn cần kiểm tra thêm trên iPad/Safari và trình duyệt TV thật.
### Hiệu quả tải đã đo trong workflow preview mới nhất — 11/10/2026

- Workflow [#38100923816 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38100923816), commit `fd110f09bdc84405c32bca2aead4181be0f6e344`.
- Bắt buộc lấy mới (`refresh=1`): ON Plus ~4,62 giây; Xem lại ~1,22 giây ở lần đo này.
- Đọc cache ngay sau đó: ON Plus ~0,064 giây; Xem lại ~0,046 giây. Đây là phép đo trong cùng workflow, không phải cam kết độ trễ cho mọi mạng/thiết bị.
- API: ON Plus 60/60 mục có URL ảnh, Xem lại 30/30; playback probe tải được HLS manifest và tài nguyên con. Việc ảnh thực sự hiển thị còn phụ thuộc CDN và cần xác minh trên Safari/TV browser.
- Danh sách được tiền tải cho hai tab chưa mở sau khi Highlights lên màn hình; nút **Cập nhật** vẫn buộc đọc nguồn gốc để ưu tiên độ mới.
### Xem lại — xác nhận 403 ảnh và chuyển qua proxy Worker (11/10/2026)

- Ảnh chụp từ thiết bị cho thấy 30/30 mục có trường `image` nhưng không hiển thị ảnh. Smoke test HTTP sau đó tái hiện lỗi: `static.wex1sora.com/.../cover.jpg` trả `403 text/html`, không phải ảnh; vì vậy kiểm tra chỉ đếm URL trước đây đã cho kết quả sai.
- Đã đổi thẻ Xem lại sang URL cùng origin `/api/image`, Worker fetch ảnh với `Referer` và `Origin` của GetOut/Bongplus và kiểm tra `Content-Type` ảnh. Không còn yêu cầu trình duyệt người dùng hotlink trực tiếp qua CDN.
- Workflow preview được sửa để tải thực tế một mẫu thumbnail qua proxy, xác minh HTTP 200, MIME `image/*`, byte ảnh hợp lệ; sẽ báo lỗi nếu không lấy được ảnh thực chứ không chỉ dựa vào chuỗi URL.
- Chỉ làm trên nhánh `feature/getout-ban-tin-20261010`/Worker preview; production và stable không đổi.
### Xác nhận cuối ảnh Xem lại — 11/10/2026

- Workflow [#38101801473 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38101801473) tải thử 6 thumbnail qua `/api/image`: **6/6 trả HTTP 200, MIME `image/jpeg`, byte ảnh JPEG hợp lệ** (khoảng 55–160 KB mỗi ảnh trong mẫu).
- Kiểm tra URL CDN trực tiếp trước sửa trả HTTP 403. Sau khi chuyển ảnh qua Worker và gửi `Referer`/`Origin` của nguồn GetOut, các mẫu ảnh tải thành công.
- Ở thời điểm xác minh ảnh preview này, stable/production chưa được cập nhật. Sau đó PR #25 được merge và deploy thành công; mở trang Bản tin chính thức hoặc bấm **Cập nhật** để lấy danh sách mới.
### Sửa tiêu đề Xem lại: tên hai đội (11/10/2026)

- Ảnh người dùng xác nhận thumbnail đã hiện nhưng tiêu đề chỉ còn Italian Serie A vs / English Premier League vs. Lỗi nằm ở thứ tự ưu tiên trường: title tổng quát của provider được dùng trước tên hai đội, và object homeTeam/awayTeam có thể khiến parser bỏ qua homeName/awayName.
- Thêm replayTeamName() để ưu tiên trường tên đội trực tiếp rồi tìm tiếp trong object/nested metadata; replayMatchTitle() ưu tiên Tên đội nhà vs Tên đội khách trước title chung. Fallback không còn kết thúc bằng vs rỗng.
- API replay trả thêm homeName và awayName; regression test dùng fixture tên trực tiếp, object lồng nhau và title lỗi. Smoke test kiểm tra title không kết thúc bằng vs thiếu đội khách.
- Đây là trạng thái trước khi phát hành; phần sửa sau đó đã được merge/deploy qua PR #25, như ghi nhận tại đầu README.
## Nhật ký phát hành chính thức — Bản tin GetOut (11/10/2026)

- PR [#25 — NM7 TV Web: Hoàn thiện mục Bản tin GetOut](https://github.com/phuongnm7/nm7-tv-web/pull/25) — **MERGED** dạng squash.
- Runtime production: `8f513632a0b51b57a42d795968bb62aa2d5b764b`; Cloudflare deployment và smoke test: [workflow #38103299751 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38103299751).
- Production smoke: Highlights 40 mục; ON Plus 60/60 mục có URL ảnh; Xem lại 30/30 mục có URL ảnh và 30/30 bản ghi có tên cả hai đội. Tải thật 3/3 ảnh mẫu mỗi nguồn ON Plus/Xem lại thành công.
- Workflow `cloudflare-deploy.yml` đã có regression tests Bản tin trước deploy và smoke test production sau deploy.
- Phạm vi chỉ NM7 TV Web/Cloudflare Worker; không thay đổi NM7 Mobile hoặc NM7 TV Android. Trang chính thức: https://nm7-tv-web.phuongnm7-iptv.workers.dev/ban-tin.html.
## 11/10/2026 — Bỏ tiêu đề tĩnh gây chồng lên nút Bản tin trên mobile

- Ảnh kiểm tra trên mobile portrait cho thấy chữ `Danh sách kênh TV` được đặt giữa thanh tab và chồng lên nút **Bản tin**. Đây là nội dung tĩnh trong `web-tv/index.html`, không phải tiêu đề cần cho điều hướng.
- Để vùng `#homeTitle` rỗng và ẩn khỏi accessibility tree; giữ nguyên bố cục tab, ☰, YouTube, Bản tin và điều hướng danh sách kênh trong menu/player.
- Thêm `scripts/test-home-title-mobile-overlap.js` vào kiểm thử trước deploy và smoke test trang production sau deploy để xác nhận chữ tĩnh không quay lại.
- Phạm vi: NM7 TV Web qua Cloudflare Workers; không sửa NM7 Mobile hoặc NM7 TV Android.
### Mobile portrait: bỏ tiêu đề tĩnh khỏi thanh tab (11/10/2026)

- Bỏ chữ `Danh sách kênh TV` tĩnh khỏi vùng giữa thanh tab; giữ nguyên menu ☰, YouTube, Bản tin và nút điều hướng danh sách kênh ở menu/player.
- Trang HTML gốc trả `Cache-Control: no-store, no-cache, must-revalidate` để Chrome/Safari không giữ trang chủ cũ sau khi cập nhật Cloudflare.
- Thêm regression test và smoke test production có retry trong thời gian Cloudflare edge propagation. Smoke đầu tiên ngay sau deploy vẫn nhận HTML cũ, nên bổ sung kiểm tra chờ cập nhật edge.

## 16/10/2026 — sửa nguồn playlist mặc định sau khi chuyển repo

- Default 1 dùng trực tiếp playlist hiện hành trong repo mới: `https://raw.githubusercontent.com/dungntk9/Iptv-phuongnm7/main/IPTV_Gop_VMTTV_vAppTV.m3u`; bỏ upstream `nm7-tv-web.vercel.app/api/vietmitv-merge`.
- Default 2 tiếp tục dùng URL Worker mặc định hiện có: `https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/`; fallback vẫn là `https://iptv-live-merge.phuongnm7-iptv.workers.dev/playlist.m3u`.
- Cập nhật smoke test theo nhóm thực tế của danh mục đang sinh động; xác minh nhóm TV/VTVcab/Thể Thao/SCTV và các luồng DASH/ClearKey SCTV15, SCTV17, SCTV22.
- Mã đã commit trên nhánh stable. Chưa đánh dấu production hoàn tất trước khi workflow Cloudflare chạy xanh và xác minh hai preset mặc định trả danh sách kênh hợp lệ.


## Released 18/10/2026 — hide match title and source URL during LIVE playback

- Standard release merged into `main` by PR [#1](https://github.com/cnktvpc/nm7-tv-web/pull/1), merge commit `2eaca1ce2bc955603284648c2edb5496580e89d6`.
- When a match is opened from the LIVE section, the player now hides `#playerTop`, the UI strip that displayed the match/team title and stream URL over the video.
- The fix is scoped to LIVE playback. Ordinary IPTV channel playback keeps its title/source metadata, and the existing player controls and LIVE server picker are unchanged.
- The active runtime is versioned as `app-safari-policy-mobile-controls.js?v=20261018-live-hide-overlay1`; Worker-side response rewriting covers the already-deployed asset set and is safe when the updated source assets are later deployed normally.
- Production Cloudflare Worker `nm7-tv-web` has been updated successfully; latest deployment version `9e0fdbe8-d890-4d12-941f-93805fa86014`, serving 100% traffic. Existing `ASSETS`, `PLAYLIST_SOURCE`, and `THETHAO_SOURCE` bindings were preserved.
- Verification: targeted LIVE overlay regression [PASS](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39054612269) and browser validation [PASS](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39054612245).
- The production site is [nm7-tv-web.phuongnm7-iptv.workers.dev](https://nm7-tv-web.phuongnm7-iptv.workers.dev/). Provider-burned watermark/text that is already part of the video itself is outside the web-player overlay fix.


## Production follow-up released — PC/mobile LIVE overlay fallback (2026-10-18)

- Follow-up deployed after the first production check still showed the overlay in the desktop player.
- The production Worker now rewrites both app-safari-policy-mobile-controls.js and app-safari-policy-pc-controls.js, using cache-busters ending in 20261018-live-hide-overlay2.
- LIVE playback is detected from S.livePlaybackContext or S.liveSectionActive; this covers older LIVE UI state that did not populate the playback context expected by the first patch.
- Production deployment on Worker nm7-tv-web: deployment cf99b603-8ac0-4cc2-ac66-d03fd4e16bbb, version e5a003e3-ae20-45d4-b1e7-cab737cfc807, 100% traffic. Existing ASSETS, PLAYLIST_SOURCE, and THETHAO_SOURCE bindings verified unchanged.
- API verification confirmed the new PC/mobile cache-busters, LIVE state fallback, PC asset route, and existing API live-feed and playlist handlers in the deployed Worker bundle.
- Source changes and regression coverage are on branch fix/live-overlay-production-runtime-fallback-20261018; the dedicated browser validation workflow passed on the branch before final documentation updates.


## LIVE title overlay follow-up — direct container hide (2026-10-18)

- The user reported that production had hidden the stream URL but still showed the match title. The previous fix relied on a LIVE CSS class, which was not sufficient in the deployed runtime path.
- New candidate branch `fix/live-title-explicit-hide-20261018` explicitly detects a LIVE event from `S.livePlaybackContext`, `S.liveSectionActive`, `c.liveEventId`, `c.group === 'LIVE'`, or `S.source === 'live'`, then sets `#playerTop.style.display = 'none'` at player-open time. Normal IPTV playback resets the inline display.
- The Worker fallback now replaces the player initialization even when a previous class-marker already exists, and the cache-buster advances to `20261018-live-hide-overlay3`.
- Release is pending targeted tests and production HTML/JS smoke verification; do not treat the old overlay2 release as the final fix.


## Production follow-up released — explicit LIVE title hide (2026-10-18)

- The user-reported residual team title was caused by the previous Worker rewrite only changing the player CSS class and skipping transformation when the older class marker was already present. Mobile CSS had hidden the source URL, but the title container remained visible in production.
- The updated Worker now always matches and rewrites the active player initialization (PC or mobile), detects LIVE using `livePlaybackContext`, `liveSectionActive`, `liveEventId`, the `LIVE` group, or source `live`, and sets `#playerTop.style.display = 'none'` directly. Normal IPTV playback resets the inline display to the default.
- HTML and asset responses use cache-buster `20261018-live-hide-overlay3`; additional LIVE-only CSS guards the title and container.
- Production Worker `nm7-tv-web` deployment `b42df3e0-0d2f-4fb1-9ef4-8f99a6252ae1`, version `93b106c6-9dbc-4e34-94f7-888b5984fec7`, serving 100% traffic. Verified preserved bindings: `ASSETS`, `PLAYLIST_SOURCE` -> `phuongnm7-playlist`, `THETHAO_SOURCE` -> `thethaonm7`.
- Existing `/api/live-feed` and `/api/playlist` routes remain in the deployed bundle. Regression workflow PASS: https://github.com/cnktvpc/nm7-tv-web/actions/runs/39084780733. Browser validation PASS: https://github.com/cnktvpc/nm7-tv-web/actions/runs/39084788415.
- This direct-hide patch is intended to fix the production-only behavior where the test Worker already worked. It has been deployed; final device/browser verification remains recommended after one hard refresh.

## Mốc mới nhất — sửa nút fullscreen và toast tua trên mobile (14/10/2026)

- Player điện thoại/tablet: nút fullscreen tự ẩn sau 2,4 giây không thao tác, chạm/touchmove hiện lại. Chỉ ẩn nút fullscreen; thanh điều khiển playback không bị ẩn theo.
- Bỏ toast `Luồng này không hỗ trợ tua` khi nguồn không có duration hoặc không hỗ trợ seek; nút tua trở thành thao tác im lặng để không che thanh điều khiển.
- Đổi runtime sang `app-safari-policy-mobile-controls.js?v=20261014-mobile-autohide1` nhằm tránh cache JS cũ; giữ nguyên logic PC đang ổn định.
- Thêm kiểm tra hồi quy `scripts/test-menu-fullscreen.js` và Cloudflare production smoke riêng cho mobile player.
- Nhánh thực hiện: `fix/mobile-player-controls-20261014`; chỉ NM7 TV Web/Cloudflare, không sửa NM7 TV Android hoặc NM7 Mobile.
- **PR đã merge:** [PR #32](https://github.com/phuongnm7/nm7-tv-web/pull/32); commit runtime merge `e96f9413478d4b7bec93f080ec5d949adfb36ba4` vào nhánh stable.
- **Deploy + production smoke:** [workflow #38520866144 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38520866144). Cloudflare deploy, smoke tổng thể, PC player và mobile player đều PASS; marker mobile: `MOBILE_PLAYER_AUTOHIDE_PRODUCTION_SMOKE_OK`.
- Smoke production xác nhận HTML trỏ tới `app-safari-policy-mobile-controls.js?v=20261014-mobile-autohide1`; timer 2,4 giây/touch wake, mobile chỉ ẩn nút fullscreen và không còn toast tua không hỗ trợ. PC smoke vẫn PASS.
- Đã cập nhật assertion smoke cũ để theo dõi asset mobile active; workflow cuối cùng hoàn thành thành công.
- Cần kiểm tra trực tiếp trên trình duyệt điện thoại sau khi reload để xác nhận giao diện/UX ở thiết bị người dùng; automation không thay thế kiểm thử vật lý.

---

## Mốc mới nhất — khắc phục LIVE không hiển thị trên Web (14/10/2026)

- Sửa parser LIVE có thể loại sạch feed M3U hợp lệ nếu marker đổi khỏi emoji xanh hoặc ngày giờ chuyển định dạng. Hỗ trợ LIVE/LIVE NOW/IN PROGRESS/Trực tiếp/Đang diễn ra, trạng thái từ group-title và ngày giờ ISO.
- Khi tải feed thành công nhưng chưa tạo được event, UI hiển thị số mục đã parse, mục có giờ, có dấu LIVE và có cặp đấu thay vì chỉ báo chung chung.
- Tạo asset path mới live-core-livefix-20261014.js và live-ui-livefix-20261014.js nhằm tránh edge cache trả JavaScript cũ.
- Thêm fixture regression; bật node scripts/test-live-feed.js trong preflight Cloudflare; smoke production chạy chẩn đoán trên feed thật.
- PR [#31](https://github.com/phuongnm7/nm7-tv-web/pull/31) đã squash-merge vào `stable/nm7-tv-web-2026-10-09` (commit `e9b17d83b474a6119ea5f98ba050ad1ce2cde338`).
- **Deploy + production smoke:** [workflow #38485043959 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38485043959). Deploy Worker, trang chủ, LIVE feed, playlist, player PC và Bản tin đều PASS.
- **Chẩn đoán feed thật:** 938 dòng sự kiện/kênh trong M3U; 421 mục parse được giờ, 49 mục có marker LIVE, 45 nguồn đủ điều kiện và 9 sự kiện đã gom nhóm. Bài test ghi `NM7_LIVE_FEED_RUNTIME_DIAGNOSTICS` và `NM7_LIVE_FEED_TESTS_OK`.
- **Xác nhận người dùng:** mục LIVE trên Web đã hiển thị bình thường sau khi tải lại; yêu cầu được xác nhận hoàn tất.
- Một lượt smoke trước đó dừng do assertion cũ `VTV6 HD`; cập nhật theo upstream `VTV6` và chạy lại thành công.
- **Phạm vi:** chỉ NM7 TV Web/Cloudflare, không thay đổi NM7 TV Android hoặc NM7 Mobile.

---
## Mốc mới nhất — tự ẩn nút fullscreen và thanh nút điều hướng trên PC (13/10/2026)

- Khôi phục timer tự ẩn sau 2,4 giây không thao tác cho giao diện player desktop.
- Khi vào trạng thái idle, CSS cùng ẩn cả `#playerFullscreenBtn` và thanh nút điều hướng `#ctrl`; không còn thanh nút nằm cố định trên hình khi đang phát.
- Khi UI đã ẩn, rê chuột không tự đánh thức. Nhấn chuột/chạm màn hình sẽ hiện UI và gia hạn timer; trong lúc UI đang hiện, di chuyển chuột tiếp tục gia hạn thời gian thao tác.
- Giữ nguyên logic bấm chuột PC hiện tại: focus đúng phần tử dưới con trỏ và click vùng nền player để mở thanh nút. Không thay đổi điều hướng TV/remote hoặc NM7 TV Android/NM7 Mobile.
- **Cache asset:** do smoke production phát hiện Cloudflare vẫn trả script cũ ở URL `app-safari-policy.js` dù HTML đã deploy mới, player hiện được nạp từ `app-safari-policy-pc-controls.js?v=20261013-pc-click-autohide-player-controls3&news=20261010`. File này chứa đúng mã đã kiểm thử; workflow smoke tải trực tiếp unique asset path.

---

## Mốc mới nhất — click player mở thanh tùy chọn, không tạm dừng; nút fullscreen luôn hiện (13/10/2026)

- **Sửa hành vi click PC:** click trái lên hình/nền player giờ gọi openPlayerOptionsFromMouse(): bật #ctrl và đưa focus vào thanh điều khiển. Hành động này không gọi togglePlay(), vì vậy chỉ bấm nút ▶/Ⅱ mới tạm dừng/phát.
- **Thanh tùy chọn:** giữ bố cục thanh điều khiển hiện có (Danh sách kênh, -10s, ▶/Ⅱ, +30s, CH+ và nút Server nếu là Live) như ảnh người dùng gửi. Click trên các nút điều khiển hoặc fullscreen vẫn xử lý riêng, không bị coi là click nền.
- **Fullscreen:** loại bỏ bộ đếm PLAYER_UI_HIDE_TIMER/PLAYER_UI_HIDE_DELAY và CSS ẩn nút khi idle. Nút ⛶ luôn hiển thị/có thể bấm khi player đang mở.
- **Focus:** con trỏ PC không còn phát giả lập lệnh bốn hướng TV; focus được xử lý theo phần tử click. Giữ logic remote/gamepad/navigation riêng cho thiết bị TV.
- **Kiểm thử/deploy:** [Cloudflare workflow #38339057021 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38339057021). Preflight JS/regression, deploy Worker, smoke trang chủ, tab PC, player-click/fullscreen, Bản tin và status publish đều PASS. Smoke riêng player in marker `PC_PLAYER_CLICK_OPENS_CONTROLS_FULLSCREEN_PERSISTENT_PRODUCTION_SMOKE_OK`.
- **Cache:** app-safari-policy.js?v=20261013-pc-click-opens-controls-fullscreen-persistent1&news=20261010.
- **Phạm vi:** chỉ NM7 TV Web / Cloudflare Worker.

---

## Mốc mới nhất — xử lý click chuột trái trên player PC và tự ẩn fullscreen (13/10/2026)

- **Lỗi click:** bản trước chỉ focus phần tử ở pointerdown nhưng không có handler click trên vùng video. Thêm click handler cho desktop pointer: click trái lên video/nền player gọi play/pause; click các nút điều khiển, fullscreen, quick channel và nút nguồn chính thức được loại khỏi handler để không chặn hành động riêng.
- **Focus:** click/focus theo phần tử ở tọa độ con trỏ; chuyển động chuột không được chuyển thành lệnh điều hướng TV. Luồng pointer/remote/gamepad cho TV được giữ riêng.
- **Nút fullscreen:** timer 2,4 giây trên desktop. Nút hiện khi mở player, di chuyển chuột, click/pointerdown hoặc thay đổi trạng thái fullscreen; tự ẩn sau thời gian không thao tác. CSS ẩn chỉ áp dụng PC, không áp dụng mobile/touch.
- **Test:** scripts/test-menu-fullscreen.js kiểm tra auto-hide, bắt click trái, play/pause và loại trừ click nút điều khiển. Production smoke tải trực tiếp script/HTML từ Cloudflare và kiểm tra cùng hành vi dự kiến.
- **Cache:** app-safari-policy.js?v=20261013-pc-click-autohide-fix2&news=20261010.
- **Phạm vi:** chỉ NM7 TV Web/Cloudflare Worker; không sửa NM7 TV Android hoặc NM7 Mobile.

---

## Mốc mới nhất — sửa focus chuột PC và giữ nút toàn màn hình luôn hiện (13/10/2026)

- **Nguyên nhân focus loạn:** bản trước đưa pointermove trên PC vào bộ tvNavigate(dir), khiến di chuyển chuột tự đổi focus/điều khiển player. Đã loại bỏ giả lập hướng bằng chuột trên PC; pointer navigation, click-to-row và gamepad tiếp tục chỉ gắn với TV-like device.
- **Focus theo click:** bindDesktopMouseFocus() chỉ chạy trên desktop pointer. Khi nhấn chuột, phần tử tương tác tại tọa độ click được focus bằng focus({preventScroll:true}); click vùng video khi đang phát focus video thay vì để focus cũ ở danh sách kênh. Di chuyển chuột không tự tạo lệnh lên/xuống/trái/phải.
- **Nút fullscreen:** xóa timer 2,4 giây, helper ẩn/hiện có timer, listener wake UI và CSS auto-hide. Nút ⛶ mặc định luôn hiển thị và có thể bấm trong suốt thời gian player mở.
- **Kiểm thử:** scripts/test-menu-fullscreen.js kiểm tra focus theo pointerdown, TV-only directional gestures, fullscreen luôn hiện và fallback WebKit/iOS; các test cache-key liên quan đã đồng bộ. Workflow deploy có smoke test kiểm tra chính HTML/JS được Cloudflare Worker phục vụ sau deploy.
- **Cloudflare production:** [Deploy + smoke workflow #38333287831 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38333287831). Preflight regression, deploy Worker, kiểm tra tab PC, focus chuột/native pointer, nút fullscreen luôn hiện, API Bản tin và ảnh thumbnail đều đạt; log có marker `PC_NATIVE_MOUSE_FULLSCREEN_PERSISTENT_PRODUCTION_SMOKE_OK` và `CLOUDFLARE_PRODUCTION_STATUS_PUBLISHED success`.
- **Cache:** app-safari-policy.js?v=20261013-pc-native-mouse-fullscreen-persistent1&news=20261010.
- **Phạm vi:** chỉ NM7 TV Web/Cloudflare Worker. Không sửa NM7 TV Android hoặc NM7 Mobile.

---

## Mốc mới nhất — tự ẩn nút fullscreen và khôi phục điều hướng chuột PC (13/10/2026)

- **PR:** [#30 — Auto-hide fullscreen control and restore PC mouse gestures](https://github.com/phuongnm7/nm7-tv-web/pull/30), đã merge vào `stable/nm7-tv-web-2026-10-09`.
- **Commit runtime:** [`73a57e23b8ff9e7f7914a660fa32c23794be206c`](https://github.com/phuongnm7/nm7-tv-web/commit/73a57e23b8ff9e7f7914a660fa32c23794be206c).
- **Nút fullscreen tự ẩn:** dùng lớp `player-ui-idle` để ẩn bằng opacity/visibility và tắt pointer events sau 2,4 giây không thao tác. Chuột di chuyển/bấm, pointer down, touch hoặc trạng thái fullscreen thay đổi sẽ hiện lại; khi đóng player timer được hủy.
- **Cử chỉ chuột PC:** nguyên nhân là `onTvPointerMove` chỉ chấp nhận `isTvLikeDevice()`, khiến PC Windows/macOS thông thường bị bỏ qua. Đã thêm `isDesktopPointerMode()` dựa trên `(min-width:1025px) and (pointer:fine)`; bind pointermove trên desktop và đưa cử động có chủ đích ≥44px vào bộ `tvNavigate(dir)`. Hướng mới bắt đầu accumulator mới; nếu chuột nghỉ hơn 650ms thì accumulator được reset. Hạn chế điều hướng do rung nhỏ.
- **Bảo toàn tương thích:** nhánh TV vẫn dùng threshold 6 như trước và logic edge bridge hiện có; gamepad polling chỉ chạy trên TV. Mobile vẫn dùng touch để hiện điều khiển.
- **Regression tests:** mở rộng `scripts/test-menu-fullscreen.js` để kiểm tra auto-hide và PC mouse mode; các test cache-buster của preset mặc định, Sport, iPad landscape và Bản tin được cập nhật.
- **Cloudflare preflight:** một lần đầu phát hiện assertion cũ yêu cầu listener fullscreen gọi trực tiếp hàm update; test đã được đồng bộ với listener mới có wake-on-interaction. Sau sửa, toàn bộ preflight qua và deploy production thành công.
- **CI:** [Web Browser Validation #38331475642 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38331475642); [Browser HLS E2E #38331475558 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38331475558).
- **Production:** [Cloudflare deploy + smoke #38331632803 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38331632803). Log chứa `PC_MENU_FULLSCREEN_MOUSE_AUTOHIDE_PRODUCTION_SMOKE_OK` và `DESKTOP_HOME_TABS_PRODUCTION_SMOKE_OK`.
- **Production URL:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/
- **Phạm vi:** chỉ NM7 TV Web; không thay đổi NM7 TV Android hoặc NM7 Mobile, không dùng Vercel.

---

## Mốc mới nhất — menu PC và toàn màn hình trình phát đã triển khai (13/10/2026)

- **PR:** [#29 — Fix desktop hamburger menu and add fullscreen player control](https://github.com/phuongnm7/nm7-tv-web/pull/29), đã squash-merge vào `stable/nm7-tv-web-2026-10-09`.
- **Commit runtime:** [`b2a955284c64d602046ef42d091c58b6321b10ec`](https://github.com/phuongnm7/nm7-tv-web/commit/b2a955284c64d602046ef42d091c58b6321b10ec).
- **Lỗi menu PC:** quy tắc desktop đã ẩn `#mobileMenuBtn` bằng `display:none!important`. Đã loại bỏ quy tắc đó, bổ sung hiển thị nút ☰ trên PC và cho phép focus bàn phím; vẫn giữ cách hiển thị trên mobile.
- **Lỗi fullscreen:** trước đây player chưa có nút toàn màn hình hoặc logic điều khiển tương ứng. Đã thêm nút ⛶ trong player cho PC/mobile; hỗ trợ Fullscreen API chuẩn và WebKit, cập nhật nhãn/trạng thái, thoát fullscreen khi đóng player và dùng fallback `video.webkitEnterFullscreen()` của Safari iOS khi khả dụng.
- **Cache và regression:** tăng cache-buster của `app-safari-policy.js`; đồng bộ test preset, Sport, Bản tin và iPad landscape với cache key mới. Thêm `scripts/test-menu-fullscreen.js` và tích hợp vào kiểm tra trước deploy/PR.
- **CI:** [Desktop home tabs regression #38330010608](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38330010608), [Web Browser Validation #38330006331](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38330006331), [preview regression #38330010441](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38330010441) đều PASS.
- **Cloudflare production:** [workflow #38330129984 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38330129984). Smoke test riêng cho production đạt với marker `PC_MENU_FULLSCREEN_PRODUCTION_SMOKE_OK`, xác nhận HTML/script đang được Worker phục vụ có nút menu PC, nút fullscreen, ba tab chính và logic fullscreen tiêu chuẩn/WebKit/Safari.
- **Production URL:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/
- **Phạm vi:** chỉ NM7 TV Web. Không sửa NM7 TV Android hoặc NM7 Mobile, không triển khai ứng dụng lên Vercel.

---

## Mốc mới nhất — sửa tab điều hướng trên PC (13/10/2026)

- **PR:** [#28 — Fix missing YouTube, LIVE and Bản tin tabs on desktop](https://github.com/phuongnm7/nm7-tv-web/pull/28), đã squash-merge.
- **Nguyên nhân:** CSS đặt `#homeTabs{display:none}` mặc định và chỉ bật trong media query `max-width:1024px` + `pointer:coarse`; trình duyệt PC dùng chuột không thỏa điều kiện đó.
- **Sửa:** thêm media query desktop `min-width:1025px` + `pointer:fine` để hiển thị thanh YouTube, LIVE và Bản tin; ẩn nút menu mobile và lớp tiêu đề rỗng trên desktop.
- **Hồi quy:** thêm `scripts/test-desktop-home-tabs.js` kiểm tra các nút hiện diện, quy tắc desktop và quy tắc mobile; tích hợp vào bước test trước deploy Cloudflare.
- **Trạng thái deploy:** ĐÃ TRIỂN KHAI thành công lên Cloudflare Worker production trong [workflow #38328207828 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38328207828).
- **Kiểm tra trước deploy:** cú pháp JavaScript đạt; `scripts/test-desktop-home-tabs.js` chạy thành công và log ghi `DESKTOP_HOME_TABS_REGRESSION_OK` — đủ ba tab YouTube, LIVE, Bản tin; quy tắc desktop và mobile được kiểm tra.
- **Smoke test production:** deploy Worker và YouTube proxy thành công; homepage, nền, điều hướng YouTube, playlist và API/thumbnail Bản tin đều đạt. Log workflow ghi `MOBILE_HOME_TITLE_OVERLAP_SMOKE_OK` và `CLOUDFLARE_PRODUCTION_STATUS_PUBLISHED success`.
- **Theo dõi runner:** một số lần chạy trước có `runner_id=0`/không có log, nhưng lần chạy mới đã được cấp runner và toàn bộ job qua. Nguyên nhân gốc của các lần khởi chạy thất bại trước không xác định được; trạng thái cuối hiện tại là thành công.
- **Phạm vi:** chỉ NM7 TV Web/Cloudflare; không thay đổi NM7 TV Android hoặc NM7 Mobile, không triển khai ứng dụng lên Vercel.

### Nhật ký sửa lỗi PC — 13/10/2026
- So sánh ảnh PC và mobile: HTML có đủ `btnYouTubeTab`, `btnLiveTab`, `btnNewsTab`, nhưng thanh cha bị ẩn do CSS responsive chỉ dành cho touch.
- PR #28 merge vào `stable/nm7-tv-web-2026-10-09`; thêm test hồi quy trước phát hành.
- Cần xác minh workflow Cloudflare production và người dùng kiểm tra thực tế trên PC sau khi cập nhật.

---
# NM7 TV Web — Tiến độ và trạng thái chuẩn

> **Nguồn sự thật cho trạng thái hiện tại nằm trong phần “Mốc ổn định hiện tại” bên dưới.** Các mục sau đó là nhật ký theo thời điểm; một số mục mô tả chẩn đoán hoặc trạng thái trước khi được sửa, không được dùng thay cho trạng thái hiện tại.

## Mốc mới nhất — sửa gom nhóm server LIVE theo trận đã triển khai (12/10/2026)

- **Repository:** [phuongnm7/nm7-tv-web](https://github.com/phuongnm7/nm7-tv-web)
- **Nhánh stable:** `stable/nm7-tv-web-2026-10-09`.
- **PR tính năng LIVE:** [#26](https://github.com/phuongnm7/nm7-tv-web/pull/26); **PR sửa gom nhóm:** [#27](https://github.com/phuongnm7/nm7-tv-web/pull/27), đã squash-merge.
- **Commit runtime đang phát hành:** [`01527437e13af02461526efa86d9e026e7f7168a`](https://github.com/phuongnm7/nm7-tv-web/commit/01527437e13af02461526efa86d9e026e7f7168a).
- **Production Cloudflare Worker:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/.
- **Production deploy + smoke:** [workflow #38250837941 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38250837941).
- **LIVE grouping regression:** [workflow #38250716920 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38250716920). Test xác nhận 10 bản ghi đầu vào thành hai trận khác nhau; trận Manchester City có hai server hợp lệ (server đã kết thúc bị loại), bốn luồng Hougang United–Balestier Khalsa gom thành một trận có bốn server.
- **Nguyên nhân:** Web trước đây giữ hậu tố trong ngoặc ở phần tên trận, làm cùng trận bị chia ra nhiều thẻ. Đã đồng bộ cách tách hậu tố với `LiveEvent.java` trên NM7 TV Android nhưng chỉ thay đổi mã NM7 TV Web.
- **Cache-buster parser:** `live-core.js?v=20261012-live-core2`.
- **Giới hạn phạm vi:** chỉ NM7 TV Web/Cloudflare; không sửa NM7 TV Android, NM7 Mobile hoặc triển khai app lên Vercel.

### Nhật ký sửa gom nhóm server — 12/10/2026
- Loại hậu tố nguồn trong dấu `(...)` và `[...]` khỏi khóa nhận diện trận trước khi so sánh; vẫn giữ các nhãn bình luận viên/transport trong lựa chọn server.
- Thêm regression với bốn nguồn `BLV ĐỎM`, `BÒ TƯƠI`, `CÔNG CHẤT`, `Tv`, kiểm tra một card/bốn server và đảm bảo trận khác vẫn tách biệt.
- Regression preview PASS; PR #27 merge; production workflow #38250837941 PASS.
- README/PROGRESS được cập nhật sau khi xác nhận deploy production thành công.
## Mốc ổn định hiện tại — xác nhận sau sửa gom nhóm LIVE (12/10/2026)

- **Repository:** [phuongnm7/nm7-tv-web](https://github.com/phuongnm7/nm7-tv-web)
- **Nhánh stable duy nhất để làm gốc:** `stable/nm7-tv-web-2026-10-09`
- **Mã runtime đã triển khai và kiểm tra gần nhất:** `01527437e13af02461526efa86d9e026e7f7168a`
- **Production Cloudflare Worker:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/
- **Workflow deploy production xác nhận thành công:** [Run #38250837941](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38250837941) — SUCCESS.
- **Baseline giao diện TV:** NM7 TV Android 1.0.69.
- **Phạm vi:** chỉ NM7 TV Web và Worker/proxy liên quan của dự án này. Không thay đổi NM7 TV Android hoặc NM7 Mobile.
- **Nơi chạy ứng dụng:** Cloudflare Workers. URL VietMiTV Merge trên Vercel được dùng như **nguồn dữ liệu playlist của Truyền hình mặc định 1**, không phải nơi deploy ứng dụng NM7 TV Web; không triển khai ứng dụng lên Vercel.

Sau commit mã ứng dụng `a5a3a637...`, việc cập nhật tài liệu có thể tạo thêm commit tài liệu trên cùng nhánh. Commit tài liệu không thay đổi runtime; nhánh stable vẫn là gốc chuẩn để tạo các nhánh phát triển tiếp theo.

## Phát hành chính thức — Bản tin GetOut (11/10/2026)

- **PR:** [#25](https://github.com/phuongnm7/nm7-tv-web/pull/25) đã squash-merge vào `stable/nm7-tv-web-2026-10-09`.
- **Runtime production:** `8f513632a0b51b57a42d795968bb62aa2d5b764b`.
- **Cloudflare production workflow:** [#38103299751 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38103299751); deploy Worker, YouTube proxy và tất cả smoke test production đều đạt.
- **URL chính thức:** https://nm7-tv-web.phuongnm7-iptv.workers.dev/ban-tin.html
- **Nội dung phát hành:** trang Bản tin với Highlights 24h, Xem lại GetOut và Tin thể thao ON Plus; API `/api/news`, refresh cưỡng bức, cache Cloudflare 60 giây, tự refresh 90 giây và tiền tải các tab chưa mở.
- **Xem lại:** parser ưu tiên tên đội nhà/đội khách. Smoke test production xác nhận đủ tên hai đội cho 30/30 bản ghi và không có tiêu đề kết thúc bằng “vs” thiếu đội khách.
- **Thumbnail:** CDN GetOut trả 403 khi gọi trực tiếp nên Xem lại dùng `/api/image` với Referer/Origin nhà cung cấp. Production smoke xác minh 3/3 ảnh ON Plus (HTTP 206, JPEG) và 3/3 ảnh Xem lại qua proxy (HTTP 200, JPEG).
- **Production API:** Highlights 40 mục; ON Plus 60 mục/60 URL ảnh; Xem lại 30 mục/30 URL ảnh. Source-import smoke cùng workflow ghi nhận 995 kênh ở thời điểm kiểm tra; số lượng là dữ liệu động.
- **Playback:** preview E2E trước phát hành đã tải HLS manifest và tài nguyên con cho cả ba phần. Production smoke xác minh API, title và thumbnail; không suy diễn rằng mọi kênh đều phát được trên mọi TV/iPad nếu chưa test trực tiếp.
- **Phạm vi:** chỉ NM7 TV Web/Cloudflare. Không sửa NM7 Mobile hoặc NM7 TV Android; không chuyển ứng dụng sang Vercel.
## Tóm tắt trạng thái production

### Những phần đã sửa và được giữ trong mốc hiện tại

- Nguồn **Thể thao** ưu tiên playlist động từ Worker `thethaonm7`; GitHub Raw là nguồn dự phòng. Mỗi lần mở/tải lại Thể thao gửi `refresh=1` để bỏ qua cache playlist 30 giây của Worker NM7 Web.
- Nhập playlist URL qua `/api/source` được hỗ trợ bằng đường Worker-to-Worker Service Binding cho `thethaonm7`; đã sửa lỗi URL trả 404 khi gọi bằng Fetch API thông thường.
- Nhập tệp `.m3u`/`.m3u8` cục bộ tối đa 20 MB bằng File API; tệp được đọc trong trình duyệt, không upload lên máy chủ.
- Nguồn Truyền hình có hai preset. Mặc định tự chọn theo thiết bị: Android và Windows chọn preset 2; iPhone/iPad/iPod chọn preset 1; các thiết bị khác dùng preset 1 mặc định. iPadOS Safari ở chế độ “Yêu cầu trang web cho máy tính” được nhận diện qua Macintosh/MacIntel kết hợp nhiều điểm chạm.
- VTV1 của preset 1 dùng nguồn trong playlist mặc định 1 theo cấu hình hiện tại; không tự ý thêm lại nguồn VTVGO đã bị loại bỏ.
- Nút menu ☰ trên iPad nằm ngang đã được sửa bằng nhận diện iPadOS desktop mode; đã tăng cache-buster cho script đang được `index.html` nạp.
- Các đường xử lý playback hiện có cho HLS/DASH/DRM, fallback của Safari, proxy HLS/segment, SCTV4K và luồng Stalker/Xtream qua Cloudflare được giữ trong baseline. Khả năng phát một kênh cụ thể vẫn phụ thuộc nguồn, codec, DRM, browser và thiết bị.

### Kiến trúc triển khai

- `worker.js`: Worker router, playlist API và các đường proxy stream.
- `wrangler.toml`: Worker `nm7-tv-web`, static assets từ `web-tv/`, Service Bindings `PLAYLIST_SOURCE` và `THETHAO_SOURCE`.
- `web-tv/index.html`: trang chính; script giao diện/player đang nạp là `web-tv/app-safari-policy-pc-controls.js` (file active có path riêng để tránh CDN cache cũ). `web-tv/app.js` cũng được duy trì và cần kiểm tra đồng bộ về hành vi khi sửa logic chung.
- `.github/workflows/cloudflare-deploy.yml`: kiểm tra JavaScript/regression, deploy Cloudflare Worker, deploy YouTube proxy theo workflow hiện hành và chạy smoke test production.
- `tizen-youtube-host/`: mã nguồn/scaffold native EWK host nghiên cứu. Chưa tuyên bố chặn quảng cáo YouTube hoàn chỉnh trên Samsung Tizen cho tới khi build/cài và kiểm tra thiết bị thật.

### API chính

| API | Mục đích |
|---|---|
| `/api/playlist?source=tv&default=1` | Truyền hình preset 1 |
| `/api/playlist?source=tv&default=2` | Truyền hình preset 2 |
| `/api/playlist?source=sport&refresh=1` | Tải mới nguồn Thể thao, bỏ qua cache playlist |
| `/api/source?u=<URL_đã_encode>` | Nạp playlist URL tùy chỉnh |
| `/api/stream` | Proxy/điều phối các luồng được hỗ trợ bởi Worker |

### Kiểm chứng đã hoàn tất

Workflow [#38064641220](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38064641220) trên nhánh stable hoàn tất **SUCCESS**, bao gồm:
- Syntax check cho `app-safari-policy.js`, `app.js` và `youtube.js`.
- Regression test `SPORT_PLAYLIST_REFRESH_TESTS_OK`.
- Regression test `IPAD_LANDSCAPE_MENU_REGRESSION_TESTS_OK`.
- Deploy Worker và YouTube proxy thành công.
- Production smoke test cho playlist mặc định, endpoint nhập nguồn, UI/player, Safari DRM policy, YouTube launcher và nút menu iPad.
- Smoke test nguồn tùy chỉnh trả 1.028 kênh tại thời điểm kiểm tra; số lượng kênh là dữ liệu động và có thể thay đổi theo nguồn upstream.

Người dùng đã xác nhận nguồn Thể thao cập nhật được và nút menu iPad nằm ngang đã hoạt động. Kiểm thử tự động không đồng nghĩa mọi kênh đều phát trên mọi thiết bị; không được suy diễn PASS của smoke test thành xác nhận cho tất cả nguồn/DRM.

## Quy tắc phát triển từ mốc này

1. **Mọi tính năng/fix tiếp theo phải tạo nhánh mới từ HEAD mới nhất của `stable/nm7-tv-web-2026-10-09`.** Không lấy nhánh thử nghiệm cũ, NM7 Android hoặc NM7 Mobile làm nền.
2. Không phát triển trực tiếp lên nhánh stable; chỉ đưa thay đổi vào stable sau khi các kiểm thử liên quan đạt và production deploy đã được xác minh.
3. Sửa đúng phạm vi yêu cầu; giữ nguyên các hành vi đang chạy tốt. Không tự ý thay playlist mặc định, nguồn URL, UI, DRM, proxy, hoặc cấu hình deploy nếu yêu cầu không đụng tới.
4. Triển khai runtime của NM7 TV Web bằng **Cloudflare Workers**. Không tự chuyển app sang Vercel hoặc thay đổi dự án Vercel; URL Vercel nếu còn trong cấu hình chỉ là upstream playlist đã được nêu rõ.
5. Không sửa repository/build/cấu hình của NM7 TV Android hoặc NM7 Mobile.
6. Trước khi chốt bản mới: chạy syntax check; các regression test liên quan; Cloudflare workflow và smoke test production; ghi commit/run URL cùng kết quả vào tài liệu. Nêu rõ phần nào đã test tự động và phần nào đã test bằng thiết bị thực tế.

## Lịch sử chi tiết

Các mục bên dưới là nhật ký công việc theo thời điểm. Khi mô tả cũ khác với “Mốc ổn định hiện tại”, trạng thái ở đầu file này và các lần cập nhật mới hơn là trạng thái có hiệu lực.

## iOS DASH/ClearKey fallback — 2026-10-06

- Confirmed provider sources in the current playlist are DASH/ClearKey for SCTV17, SCTV22, On Sports, and On Sports+; there is no provider-supplied FairPlay/HLS input.
- Safari/iOS web playback cannot be enabled by changing the DASH manifest or proxying it. Inline Safari playback requires an authorized FairPlay/HLS source and provider license integration.
- Added first-party handoff buttons for On Sports → VTVprime, SCTV22 → VTVgo, and SCTV17 → the official SCTV iOS app listing. Provider login/subscription may be required.
- On Sports+ has no verified official per-channel destination yet and therefore remains explicitly without a handoff button.
- This is an iOS viewing workaround through provider platforms, not inline playback in NM7 TV. Validate each provider destination/account entitlement on a real iPhone before claiming playback success.


## YouTube gốc + AdBlock kiểu Cốc Cốc — 2026-10-06

### Nghiên cứu

- Đối chiếu trang YouTube chính thức của Cốc Cốc: Cốc Cốc công khai việc tích hợp Adblock Plus và cập nhật liên tục để xử lý cơ chế chống chặn quảng cáo của YouTube.
- Kết luận kỹ thuật: JavaScript Web của NM7 không thể trở thành lớp network blocker cho youtube.com sau khi điều hướng sang origin khác. Same-Origin Policy ngăn truy cập DOM cross-origin; iframe không giải quyết được request interception.
- Tizen 3.0 có EWK request interception, phù hợp với kiến trúc browser-layer filter.

### Đã sửa

- Xóa YouTube Web Shell/Piped/Invidious khỏi luồng người dùng.
- web-tv/youtube.js hiện chỉ điều hướng đến YouTube gốc và hỗ trợ deep-link video.
- web-tv/app.js và web-tv/app-safari-policy.js gọi cùng launcher YouTube gốc.
- Worker xóa các endpoint proxy Piped /api/youtube/*.
- Cloudflare smoke test đổi từ kiểm tra Piped stream sang kiểm tra official YouTube launcher.
- Thêm tizen-youtube-host/: native EWK WebView, URL request interception, bộ lọc ad URL bảo thủ, response 204 cho URL quảng cáo rõ ràng, JS fallback bấm Skip/xử lý overlay và manifest TV API 3.0.

### Trạng thái kiểm thử

- JavaScript launcher đã được kiểm tra cấu trúc và không còn gọi Piped API.
- Worker không còn route /api/youtube/*.
- Chưa có kết quả build/install native host trên Samsung UA49M5500 Tizen 3.0 vì môi trường hiện tại không có Samsung Tizen SDK/thiết bị ký và TV thật để chạy E2E.
- Do đó chưa tuyên bố thành công tuyệt đối đối với YouTube ad-free trên TV.

### Kiến trúc mục tiêu

NM7 TV Web → https://www.youtube.com/ → Native Tizen EWK host → request interception + page-level fallback


## Chạy nền mobile — 2026-10-06

### IPTV

- Thêm `web-tv/mobile-background.js`.
- Dùng Media Session API để đưa metadata và Play/Pause/tua vào khu vực điều khiển media của browser/OS khi browser hỗ trợ.
- Thêm nút **◩ Chạy nền** trong player mobile.
- Safari/WebKit: ưu tiên `webkitSetPresentationMode('picture-in-picture')`; browser chuẩn: dùng `requestPictureInPicture()` khi khả dụng.
- Theo dõi `visibilitychange`, `pagehide`, `pageshow` nhưng không tự phá player khi ứng dụng chuyển nền.
- Khi thiết bị/browser không có PiP, không giả vờ hỗ trợ; Media Session vẫn được duy trì nơi có thể.

### YouTube

- YouTube vẫn mở bằng trang YouTube chính thức.
- NM7 Web không thể ép `youtube.com` chạy nền trái với chính sách của YouTube bằng JavaScript cross-origin.
- Google hiện xác nhận background playback trên mobile browser là tính năng của YouTube Premium.

### Kiểm tra

- `mobile-background.js` đã thêm vào `index.html`.
- `app.js` và `app-safari-policy.js` đã đồng bộ hook nút **Chạy nền**.
- Cloudflare workflow có smoke test cho Media Session, PiP, WebKit presentation mode và visibility handling.
- Cần kiểm tra thiết bị thật: Android Chrome khóa màn hình/chuyển app; iPhone/iPad Safari PiP/chuyển app/khóa màn hình.

### Trạng thái

**Đã triển khai lớp Web cần thiết cho IPTV background playback.** Khả năng cuối cùng vẫn phụ thuộc browser/OS; YouTube gốc tuân theo giới hạn của YouTube.
## YouTube AdShield mobile — 2026-10-06

### Nguyên nhân được xác nhận

Ảnh test cho thấy quảng cáo được render bởi chính YouTube gốc trong player. NM7 Web trước đó điều hướng thẳng sang `youtube.com`, nên sau khi chuyển origin NM7 không còn kiểm soát network request của YouTube.

Bộ lọc YouTube hiện tại của uBlock xử lý cả `adPlacements`, `adSlots`, `playerAds`, `get_watch`, `youtubei/v1/player` và một số request `googlevideo.com/initplayback`; do đó bộ lọc URL nhỏ của NM7 trước đây không đủ. citeturn413338search0turn413338search2

### Đã triển khai trên nhánh Android test

- Nhánh: `fix/youtube-webview-adshield-20261006`.
- Tạo từ baseline NM7 TV 1.0.69 `build/1.0.65-logo-fit-clean`.
- Thêm `YouTubeHostActivity` dùng WebView chính thức.
- Thêm `YouTubeRequestBlocker` cho request quảng cáo rõ ràng.
- Thêm `youtube_adshield.js` bằng document-start injection; WebView 1.15.0 hỗ trợ API document-start và minSdk 23. citeturn413338search7
- Android Chrome launcher trên NM7 Web thử `nm7youtube://open?url=...` để chuyển từ browser sang host khi host đã được cài.

### CI

Các run Android gần nhất trên nhánh này fail trong khoảng 2–4 giây, không có step/log. Vì vậy chưa có APK build được xác nhận từ CI và chưa có kiểm thử Android thật.

### Kết luận

Chrome/Safari thuần không thể biến thành lớp network adblock của YouTube chỉ bằng JavaScript của NM7. Giải pháp đang thử nghiệm là browser-layer native host, gần kiến trúc của trình duyệt có adblock. Đây vẫn là WIP cho tới khi test thiết bị thật.


## Web-only YouTube diagnostic — 2026-10-06
- Mobile proxy fallback and first-party request headers updated.
- Browser-level production verification is being added to the deployment workflow.


## 2026-10-06 — YouTube mở trực tiếp origin chính thức

Qua kiểm thử Chromium thực tế, reverse-proxy Cloudflare vẫn có thể trả về HTML/skeleton của YouTube nhưng các luồng dữ liệu phía sau bị YouTube rate-limit hoặc lỗi 401/403, dẫn tới trang đứng ở trạng thái loading. Vì vậy reverse-proxy không còn là đường mặc định của người dùng.

- web-tv/youtube.js hiện mở trực tiếp https://www.youtube.com/ hoặc URL video chính thức.
- Không đổi giao diện hay tài khoản của YouTube; người dùng nhận đúng trang YouTube chính thức của trình duyệt.
- Worker nm7-youtube-proxy vẫn được giữ để chẩn đoán/thử nghiệm và chỉ proxy khi thêm ?proxy=1; không dùng làm đường mặc định.
- Đây là thay đổi để ưu tiên tính ổn định: YouTube không bị kẹt skeleton do lớp proxy trung gian.
- Chặn quảng cáo ở tầng trình duyệt vẫn cần native browser host (như EWK trên Tizen) hoặc trình duyệt có bộ lọc riêng; JavaScript của NM7 không thể biến một tab youtube.com thành adblocker network-level.


## 2026-10-08 — Tiếp tục từ mốc YouTube gốc

- Đã rà soát lại branch `fix/youtube-original-coccoc-adblock-20261006`.
- Xác nhận lỗi của YouTube E2E run #21 không phải do launcher: bài test cũ yêu cầu URL phải là `www.youtube.com`, trong khi YouTube mobile hợp lệ chuyển sang `https://m.youtube.com/`.
- Đã sửa workflow `.github/workflows/youtube-e2e.yml` để chấp nhận cả `www.youtube.com` và `m.youtube.com` khi xác nhận official YouTube origin.
- Không thay đổi player IPTV, DRM, UI Android 1.0.69 hoặc pipeline playlist.
- Native Tizen YouTube host vẫn ở trạng thái source scaffold; chưa có bằng chứng build/sign/E2E trên Samsung UA49M5500 Tizen 3.0 trong môi trường hiện tại.
- Lần kiểm tra tiếp theo phải chạy lại YouTube E2E sau commit sửa test; chỉ đánh dấu thành công khi workflow pass và, riêng adblock Tizen, vẫn cần build/cài/test thiết bị thật.


## 2026-10-08 — Responsive mobile layout + YouTube home shortcut

- Giữ nguyên toàn bộ baseline Android TV 1.0.69, player, DRM, playlist, remote navigation và local M3U.
- Ẩn nút **Chọn ứng dụng** (button cạnh logo YouTube) khỏi thanh đầu trang chủ trên mọi chế độ; nút YouTube gốc vẫn giữ nguyên.
- Thiết bị touch/mobile ở portrait dùng lưới **3 cột**; ở landscape dùng **4 cột**. Khoảng cách và chiều cao thẻ được giảm để tận dụng diện tích màn hình, nhưng không thay đổi thứ tự kênh.
- Native Tizen YouTube host bổ sung nút nổi **⌂ NM7** trong trang YouTube gốc và phím **Home/XF86Home/XF86HomePage** để quay thẳng về trang chủ NM7.
- Browser web thuần không thể chèn nút vào youtube.com sau khi đã chuyển origin do same-origin isolation; vì vậy shortcut một chạm trong YouTube được thực hiện ở native host. Trên mobile browser thuần, nút Home/điều hướng tab vẫn thuộc quyền kiểm soát của browser.
- Chưa đánh dấu native adblock thành công: vẫn cần build/sign và E2E trên Samsung UA49M5500 Tizen 3.0.


## 2026-10-08 — Fix D-pad scrolling trên TV/Google TV

- Xác định nguyên nhân: trang chính dùng `#homeRows` làm scroll container nhưng logic điều khiển TV chỉ đổi focus giữa các nhóm và phụ thuộc vào `scrollIntoView()`; đồng thời mọi `keydown` lặp (`e.repeat`) bị bỏ qua. Trên một số TV/Google TV browser, cách này khiến ↑↓ không cuộn trang thực tế.
- Đã bổ sung cuộn chủ động bằng `scrollTop` cho `#homeRows`, tự đưa hàng đang focus vào vùng nhìn thấy.
- Khi đang ở hàng đầu/cuối, ↑/↓ có fallback cuộn theo từng đoạn trang, nên D-pad vẫn có tác dụng ngay cả khi không còn nhóm kênh kế tiếp.
- Không bỏ qua `keydown` lặp đối với ↑↓, cho phép giữ phím để cuộn liên tục.
- Bổ sung nhận diện Android/Google TV key codes: D-pad `19/20/21/22`, OK `23/66`, Back `4`, cùng các dạng `Arrow*`/`DPAD_*`.
- Ép `#homeRows` thành scroll container riêng bằng `overflow-y: scroll` và giữ nguyên giao diện/kích thước TV hiện tại.
- Đồng bộ `web-tv/app.js` với `web-tv/app-safari-policy.js`.
- Thêm bước `node --check` cho JS TV trước Cloudflare deployment.
- Không thay đổi playlist, player, DRM, giao diện Android 1.0.69, YouTube hoặc các tính năng khác.


## 2026-10-08 — Phân tích video Google TV và sửa spatial navigation

- Đã xem trực tiếp video 223453.mp4. Lỗi thể hiện ở tầng focus/navigation: điều khiển dừng ở mép ô đang nhìn thấy, không đi được xuống hàng/nhóm bên dưới và không đi tiếp sang ô kế tiếp đúng theo bố cục 3/4 cột.
- Nguyên nhân gốc: CSS responsive đã chuyển các nhóm kênh thành CSS Grid 3/4 cột, nhưng thuật toán D-pad cũ vẫn coi mỗi group là một hàng logic và `S.col` là chỉ số tuyến tính. Vì vậy vị trí vật lý của các ô không còn tương ứng với `row/col` logic.
- Đã thay điều hướng trang chủ bằng **spatial navigation theo vị trí thật của DOM**: ↑/↓ tìm ô gần nhất theo trục dọc; ←/→ tìm ô kế tiếp theo hàng hiển thị; không còn phụ thuộc số cột cố định.
- Khi hết visual row ở đầu/cuối viewport, hệ thống vẫn cuộn `#homeRows` theo trang; khi còn visual row kế tiếp, focus chuyển trực tiếp tới ô đó và tự đưa vào vùng nhìn thấy.
- Đã bổ sung native spatial-focus fallback cho Android/Google TV: các card được để `tabindex=0`, cho phép TV browser tự di chuyển focus giữa các button khi D-pad không phát `keydown` theo chuẩn web.
- Bổ sung nhận diện Android/Google TV và trạng thái focus rõ ràng để nhìn thấy ô đang được chọn trên TV.
- `web-tv/app.js` và `web-tv/app-safari-policy.js` đã được đồng bộ.
- Kiểm tra CI: bước `node --check` cho `app.js`, `app-safari-policy.js`, `youtube.js` đã PASS trên commit trước đó. Deployment Cloudflare hiện đang **không thể hoàn tất do Cloudflare API token trong GitHub Actions trả Authentication error 10000 / Too many authentication failures 10502**; đây là lỗi credential của CI, không phải lỗi JavaScript vừa sửa.
- Không thay đổi playlist, DRM, player, UI Android 1.0.69 hay logic phát kênh.


## 2026-10-09 — Sửa phát nhóm VTV dự phòng trên iPad Web

- Đối chiếu playlist production: nhóm `VTV dự phòng` có 10 kênh; VTV2 HD, VTV3 HD, VTV4 HD, VTV5 HD, VTV7 HD và VTV8 HD chỉ có candidate DASH ClearKey. Các kênh cùng tên trong nhóm `VTV` có candidate HLS không DRM tương thích hơn với native HLS trên Safari.
- Nguyên nhân trong web: `addAppleHlsAlternatives()` chỉ tìm ứng viên thay thế trong cùng nhóm, nên không phát hiện HLS cùng tên ở nhóm `VTV`; đồng thời `startupCandidateIndex()` ưu tiên DASH ClearKey trước HLS trên iPad. `startDash()` sau đó đi thẳng tới màn hình fallback Safari và không thử được HLS tương ứng.
- Sửa `web-tv/app-safari-policy.js` và đồng bộ `web-tv/app.js`: với iPad, tìm thêm HLS không DRM từ kênh trùng tên giữa `VTV dự phòng` và `VTV`; ưu tiên HLS không DRM trước DASH ClearKey. Giữ nguyên kênh/candidate gốc và không xoá metadata hay DRM.
- Thêm regression checks trong Cloudflare deployment workflow cho cross-group HLS fallback và chính sách HLS-first trên iPad.
- Chẩn đoán production lấy được 479 kênh, trong đó 10 kênh thuộc nhóm `VTV dự phòng`. CI xác nhận deploy mới và các smoke test hiện có; cần tiếp tục xác nhận phát thực tế trên Safari/iPad để khẳng định CDN HLS đang hoạt động tại thời điểm xem.


## 2026-10-09 — Điều tra playback nhóm Thể Thao trên iPad Safari

- Đã triển khai cơ chế HLS-first và ghép candidate HLS chéo nhóm theo alias kênh chính xác (ví dụ VTV6), cùng fallback mở trang dịch vụ chính thức khi Safari không phát được DASH/ClearKey.
- Kiểm tra playlist production: nhóm `Thể Thao` hiện có 10 kênh. HTV Thể Thao có HLS; VTV6 có HLS trùng kênh ở nhóm VTV; On Sports có URL HLS cũ nhưng các endpoint đã trả 404/530 trong probe; phần lớn các kênh ON/SCTV khác chỉ có DASH ClearKey trong danh sách hiện tại.
- Kiểm tra nhiều mirror HLS cho SCTV15/17/22 và ON Sports/Football/News/Golf. Một số manifest SCTV15/17 chỉ trả `#EXTM3U` khi request có Referer SCTV Online, nhưng cùng URL qua Worker trả 404 và request không có Referer trả HTML; các mirror khác trả 403/404/502/204 rỗng hoặc DNS failure. Chưa tìm được HLS nào có thể xác nhận phát qua worker/iPad cho những kênh này.
- Đã bỏ candidate HLS SCTV15/17 chết qua proxy để tránh thử nguồn chắc chắn lỗi; giữ nguyên candidate DASH/ClearKey gốc. Không thay/xóa khóa DRM. Safari sẽ chuyển sang đường mở trang ON Plus/VTVgo/HTV chính thức được ánh xạ theo kênh khi không còn nguồn inline dùng được.
- Deploy và smoke test xác nhận code/playlist vẫn hợp lệ; **chưa xác nhận toàn bộ nhóm Thể Thao phát inline trên iPad**. Các kênh DASH/ClearKey cần nguồn HLS thực sự đang hoạt động hoặc player/platform có khả năng giải mã tương thích; không coi fallback sang trang ngoài là phát inline thành công.


## 2026-10-09 — Hiện nút menu trên iPad ngang

- Nguyên nhân: nút `#mobileMenuBtn` chỉ được bật trong media query `max-width:1024px`. Khi iPad xoay ngang và Safari dùng viewport rộng hơn 1024 CSS px, body vẫn ở `mobile-mode` nhưng nút quay về `display:none`.
- Sửa `web-tv/index.html`: thêm quy tắc `body.mobile-mode #mobileMenuBtn` trong nhánh `pointer:coarse`, luôn hiện nút ☰ cho thiết bị touch/mobile ở cả ngang và dọc, kể cả iPad ngang có viewport rộng.
- Thêm smoke check cho CSS menu ngang trong Cloudflare deploy workflow.


## 2026-10-09 — VietMiTV Merge làm mặc định 1 cho Truyền hình (chỉ NM7 Web)

- Đổi upstream mặc định 1 trong `worker.js` và `api/playlist.js` thành `https://nm7-tv-web.vercel.app/api/vietmitv-merge`.
- Chuyển nguồn truyền hình cũ `https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/` xuống mặc định 2; vẫn giữ các nguồn cũ còn lại làm fallback cho truy vấn tổng hợp không chọn preset.
- `/api/playlist?source=tv&default=1` thử VietMiTV Merge trước, sau đó tự fallback về mặc định 2 nếu endpoint lỗi hoặc trả playlist rỗng. `default=2` chỉ dùng nguồn cũ.
- Web UI mặc định dùng preset 1; hộp thoại **Chỉnh sửa nguồn → Nguồn mặc định** có nút **Dùng mặc định 1** và **Dùng mặc định 2**. Cache key và schema được tách theo preset để không giữ nhầm playlist cũ.
- Đồng bộ frontend `web-tv/app.js` và `web-tv/app-safari-policy.js`; cập nhật cache-buster script trong `web-tv/index.html`. Không chỉnh repository NM7 Mobile hoặc NM7 TV Android.
- Cloudflare Deploy #426 xác nhận: preset 1 trả 359 kênh và upstream đúng URL VietMiTV Merge; preset 2 trả playlist cũ 515 kênh. Smoke tests và JavaScript syntax đều PASS. YouTube Original E2E #112 cũng PASS.
- Regression checks mới xác nhận cả hai upstream, hai route preset và lựa chọn trong UI.

- Cập nhật xác nhận cuối ngày 09/10/2026: commit `ebd9906582a815173ec570059a6d17252d37bf16` đã deploy thành công (Deploy #426) và E2E #112 thành công. Phạm vi chỉ là NM7 TV Web.


## 2026-10-09 — Chốt NM7 TV Web stable baseline

- Tạo nhánh `stable/nm7-tv-web-2026-10-09` làm nền chuẩn cho các lần phát triển tiếp theo.
- Commit production dùng để chốt mốc: `52a51a8447735259db92f33cf5a67748cdf94c40`.
- Bằng chứng: Cloudflare Deploy #428 = SUCCESS; YouTube Original E2E #114 = SUCCESS.
- Tạo `STABLE_BASELINE.md` và cập nhật `README.md` nêu quy tắc: các branch feature/fix sau này phải được tạo từ nhánh stable này; không dựa vào NM7 Mobile/NM7 TV Android hay baseline cũ khác.
- Không thay đổi mã ứng dụng trong đợt chốt stable này; chỉ thêm tài liệu. Tất cả thay đổi tính năng tiếp theo phải làm ở branch mới, không sửa trực tiếp nhánh stable.
- Phạm vi: riêng repository `phuongnm7/nm7-tv-web`.


## 2026-10-09 — VTV1 lấy nguồn trực tiếp từ playlist mặc định 1

### Thay đổi mã nguồn

- Nhánh: `fix/vtv1-single-source-hide-default-urls-20261009`.
- Trong `worker.js` đã xóa ba URL VTV1 hardcode: hai URL FPT và URL VTVGo; xóa luôn logic tự chèn các URL đó và logic ép chọn VTVGo/ứng viên thứ ba.
- Worker không còn tự thay nguồn VTV1 bằng URL VTVGo. Kênh VTV1 giữ các ứng viên do playlist Mặc định 1 trả về.
- Giữ nguyên upstream Mặc định 1: `https://nm7-tv-web.vercel.app/api/vietmitv-merge`; không thay URL mặc định toàn playlist.
- Tăng cache schema lên `20261009-vietmitv-defaults-2` và cập nhật version tham chiếu script để tránh cache danh sách kênh cũ.
- Không sửa NM7 Mobile/Android, không đổi nguồn thể thao, không deploy dedicated YouTube reverse proxy trên nhánh này.

### Triển khai

- Production Cloudflare: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`.
- Cloudflare Deploy #435: **SUCCESS** — [workflow run](https://github.com/phuongnm7/nm7-tv-web/actions/runs/37931847498).
- JavaScript syntax check: **SUCCESS**.
- Deploy to Cloudflare Workers: **SUCCESS**.
- Smoke test YouTube redirect/ad guard: **SUCCESS**.
- Smoke test deployed Cloudflare Worker: **SUCCESS**.
- Dedicated YouTube reverse proxy: **SKIPPED** theo điều kiện của nhánh, tránh tác động dịch vụ không liên quan.
- Kiểm tra mã nguồn xác nhận URL VTVGo và danh sách VTV1 hardcode đã bị loại khỏi Worker.

### Lưu ý kiểm thử

Smoke test không xác minh được video VTV1 phát xuyên suốt trên TV thật. Cần kiểm tra trực tiếp trên NM7 TV Web sau khi tải lại trang. Nếu vẫn không phát, bước tiếp theo là kiểm tra ứng viên VTV1 thực tế trong JSON của API Mặc định 1 và phản hồi HLS của chính URL đó; không tự chèn lại nguồn ngoài playlist.


## 2026-10-10 — Tự chọn nguồn mặc định theo nền tảng trình duyệt

### Yêu cầu

- Android: trang chủ tự mở **Nguồn mặc định 2**.
- iOS/iPadOS: trang chủ tự mở **Nguồn mặc định 1**.
- Không tác động NM7 Mobile, NM7 TV Android, Worker, danh sách nguồn, hay các nhánh/phiên bản production khác.

### Cách triển khai

- Nhánh riêng: `feat/auto-device-tv-preset-android-ios-20261010`, tạo từ `stable/nm7-tv-web-2026-10-09`; không sửa trực tiếp nhánh stable.
- Phát hiện Android bằng User-Agent và `navigator.userAgentData.platform` khi có.
- Phát hiện iPhone/iPad/iPod bằng User-Agent/platform; hỗ trợ iPadOS dùng desktop website bằng `navigator.platform === 'MacIntel'` và `navigator.maxTouchPoints > 1`.
- Gán preset ngay khi khởi tạo state, trước khi đọc local cache; như vậy cache key và danh sách ban đầu cũng dùng đúng preset của thiết bị.
- Startup truyền preset đã nhận diện vào loader. Việc đổi nguồn thủ công trong hộp thoại vẫn giữ nguyên; khi chuyển sang Thể thao rồi quay lại Truyền hình, menu tiếp tục dùng preset hiện tại thay vì ép về 1.
- Nếu không nhận diện được Android/iOS (desktop, Tizen TV hoặc thiết bị khác), giữ hành vi mặc định 1 hiện tại.
- Nếu API preset 2 lỗi và chưa có cache preset 2, báo lỗi rõ ràng thay vì âm thầm nạp playlist preset 1; vẫn giữ cache/playlist hiện có nếu đã có.
- Áp dụng cùng logic cho `web-tv/app-safari-policy.js` và `web-tv/app.js`; tăng cache-buster trong `web-tv/index.html` để tránh trình duyệt dùng script cũ. Không thay URL mặc định, logic API/Worker, player hoặc DRM.

### Kiểm thử tự động

- Thêm `scripts/test-device-default-preset.js` với các trường hợp Android User-Agent, Android Client Hints, iPhone, iPad, iPadOS desktop mode, desktop và Samsung Tizen TV.
- Cập nhật `.github/workflows/web-browser-validation.yml` để kiểm tra cú pháp cả hai file player và chạy test preset.
- Nhánh tính năng không nằm trong danh sách nhánh của Cloudflare production deploy; thay đổi này không tự triển khai lên dịch vụ đang chạy.
- Kiểm thử GitHub Actions `Web Browser Validation` đã **PASS**: [run #286](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38005309930). Node syntax checks đều đạt; regression test xác nhận 7 trường hợp trên mỗi file player (Android UA, Android Client Hints, iPhone, iPad, iPadOS desktop mode, desktop và Samsung Tizen), giữ preset khi quay lại Truyền hình, trạng thái lỗi preset 2 và cache-buster của script đang được trang sử dụng.
- Không chạy Cloudflare production deploy. Nhánh tính năng không nằm trong danh sách deploy; nhánh stable, Worker đang chạy và các repository NM7 khác không bị thay đổi.


## Cloudflare isolated device-preset test (2026-10-10)
- Added `wrangler.device-test.toml` with Worker name `nm7-tv-web-device-test`; it reuses the existing `worker.js`, `web-tv` assets, and `phuongnm7-playlist` service binding.
- Added `.github/workflows/cloudflare-device-test.yml`. It deploys only the isolated test Worker and checks both TV playlist endpoints. It does not run `wrangler.toml` and does not deploy the production Worker `nm7-tv-web`.
- Test branch: `test/cloudflare-device-preset-20261010`. Production app source and production deployment workflow are unchanged by this test-specific commit.

- 2026-10-10: Updated isolated device detection so Windows desktop browsers open TV preset 2; added regression coverage and cache-buster update. Android remains preset 2; iOS/iPadOS remains preset 1. Production Worker unchanged.

## 2026-10-10 — Cập nhật device preset và triển khai production

### Quy tắc preset theo thiết bị

- **Android:** tự mở Nguồn mặc định 2.
- **Windows:** tự mở Nguồn mặc định 2.
- **iPhone/iPad/iPod:** tự mở Nguồn mặc định 1; nhận diện cả iPadOS bật chế độ desktop bằng `MacIntel` và `maxTouchPoints > 1`.
- **macOS, Samsung Tizen TV và thiết bị khác/không nhận diện:** giữ Nguồn mặc định 1.
- Người dùng vẫn được đổi preset thủ công; lựa chọn hiện tại được giữ khi chuyển giữa Truyền hình và Thể thao.
- Nhận diện preset xảy ra trước khi đọc cache. Nếu preset 2 lỗi và không có cache phù hợp, báo lỗi rõ ràng thay vì âm thầm dùng playlist preset 1.
- Đồng bộ logic ở `web-tv/app.js` và `web-tv/app-safari-policy.js`; cập nhật cache-buster ở `web-tv/index.html`.
- Regression test bao phủ Android UA/Client Hints, Windows, iPhone, iPad, iPadOS desktop mode, macOS/desktop và Samsung Tizen.

### Merge và production deploy

- Đã merge thay đổi tính năng vào nhánh ổn định `stable/nm7-tv-web-2026-10-09` qua [PR #18](https://github.com/phuongnm7/nm7-tv-web/pull/18).
- Đã cập nhật `README.md` ghi rõ quy tắc theo thiết bị, phạm vi thay đổi và kết quả deploy.
- Đã thêm nhánh stable vào trigger push của `.github/workflows/cloudflare-deploy.yml` để cập nhật production từ nhánh ổn định.
- Commit kích hoạt deploy: `b018f28dd163d75f2c8a46ff990532bdcdea05ec`.
- **Cloudflare Deploy #438: SUCCESS** — [GitHub Actions run](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38010319718).
- Các bước đều PASS: JavaScript syntax check, deploy Cloudflare Worker, deploy dedicated YouTube reverse proxy, YouTube redirect/ad-guard smoke test và production Worker smoke test.
- Phạm vi chỉ là repository `phuongnm7/nm7-tv-web`. Không sửa NM7 Mobile hoặc NM7 TV Android; không thay URL nguồn, API playlist, player hoặc DRM trong thay đổi preset này.


## 2026-10-10 — Sửa lỗi proxy HLS SCTV4K và xử lý kênh quốc tế (đã deploy)

### Chẩn đoán SCTV4K

- API Worker production trả SCTV4K với một ứng viên HLS từ vietanhtv.id.vn. Manifest gốc trả HTTP 200 và có nội dung HLS.
- Các segment .ts con tải trực tiếp trả HTTP 400; khi tải qua Worker proxy, upstream có lúc trả 200 nhưng khai báo MIME application/vnd.apple.mpegurl dù nội dung là segment nhị phân.
- Nguyên nhân code xác định: worker.js cũ quyết định rewrite manifest dựa trên Content-Type, nên segment MPEG-TS bị đọc/ghi lại như văn bản HLS. Đây là nguyên nhân cụ thể có thể tạo màn hình đen ở SCTV4K.

### Code đã sửa ở nhánh cô lập

- worker.js: nhận diện phần mở rộng media trước khi xử lý manifest; giữ nguyên bytes cho .ts, .m2ts, .m4s, .mp4 và một số định dạng audio/video khác, đặt MIME phù hợp; chỉ rewrite HLS/DASH manifest thật.
- web-tv/app.js và web-tv/app-safari-policy.js: chỉ đánh dấu player chạy sau khi có bằng chứng playback thực tế; tăng độ tin cậy watchdog/fallback direct → proxy; ghi nguyên nhân lỗi cuối trong status; sửa chuỗi xuống dòng bị escape hai lần.
- Thêm scripts/test-worker-hls-segments.js: giả lập upstream gửi bytes TS nhưng khai báo sai application/vnd.apple.mpegurl; xác nhận Worker trả video/mp2t và byte-for-byte không đổi; xác nhận HLS manifest thật vẫn được rewrite.
- Thêm scripts/test-playback-startup-fallback.js: regression checks cho cả hai file player.
- Cập nhật .github/workflows/web-browser-validation.yml để chạy test mới và kiểm tra cú pháp Worker dạng ES module.

### Kết quả kiểm thử và phạm vi

- Web Browser Validation #303: SUCCESS — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38021405853. Các bước JS syntax check, regression checks và required assets đều PASS.
- Đã merge PR #19 vào `stable/nm7-tv-web-2026-10-09`, commit `034de12128fba712cb51af388c491ed434c0ae33`.
- Deploy #442: **SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38021648048. Tất cả smoke test production đều PASS sau khi sửa bộ test để không giả định vị trí kênh động ở cuối nhóm Thể thao.
- Chẩn đoán sau triển khai #10: https://github.com/phuongnm7/nm7-tv-web/actions/runs/38021737310. Hai segment SCTV4K qua Worker proxy trả HTTP 200 với `Content-Type: video/mp2t`; kết quả `SCTV4K_PROXY_SEGMENT_MIME_PASS`. Log đã che path/query có thể chứa chữ ký stream.
- Playwright Browser remote + HLS E2E vẫn lỗi ở `hls.js bufferAddCodecError` với fixture HLS do runner CI; không đánh dấu E2E playback thành công. Các test cú pháp, regression player và test bảo toàn bytes của segment Worker đều PASS.
- DAZN PPV FHD không xuất hiện trong playlist mặc định 1, mặc định 2 hoặc Thể thao. Cần entry M3U hoặc URL nguồn tùy chỉnh thực tế để chẩn đoán chính xác; không tự ý thay/chèn URL.
- Phạm vi: chỉ NM7 TV Web. Không thay URL mặc định và không sửa NM7 Mobile/Android.

## 2026-10-10 — Sửa độ trễ HLS và hỗ trợ nguồn M3U tùy chỉnh có header

### SCTV4K bị chờ 15 giây

- Video người dùng gửi cho thấy player đợi watchdog 15 giây mới chuyển từ URL trực tiếp qua Worker proxy; hình chỉ bắt đầu xuất hiện sau đó.
- Sửa hai entrypoint player: HLS network/CORS error trực tiếp chuyển qua proxy ngay; lỗi HTTP 4xx/5xx trên manifest/segment cũng đổi đường ngay; watchdog khởi động HLS giảm từ 15 giây xuống 8 giây.
- Tăng query cache-buster ở index.html để không giữ lại file player cũ.

### Nguồn kênh quốc tế tùy chỉnh

- Video thứ hai hiển thị “Đang xác định định dạng”, sau đó thử proxy nhưng báo lỗi video.
- Probe cũ chỉ gọi HEAD và bỏ qua header tùy chỉnh; một số host chặn HEAD hoặc yêu cầu Referer/Origin/User-Agent nên loại stream có thể bị nhận dạng sai.
- /api/probe dùng headersFromQuery, thử HEAD trước và chuyển GET Range giới hạn nếu HEAD lỗi hoặc không đủ xác định loại stream; nhận diện HLS/DASH từ header hoặc phần đầu manifest.
- Parser M3U cả phía Worker và player đọc #EXTHTTP JSON và giữ User-Agent, Referer/Referrer, Origin cùng header tùy chỉnh.
- Worker rewrite DASH BaseURL và các URI segment tuyệt đối qua /api/dash-resource cùng miền; request segment giữ source headers, được giải quyết tới URL upstream và trả dữ liệu nhị phân đúng kiểu media.

### Regression tests

- scripts/test-custom-m3u-headers-probe.js — kiểm tra #EXTHTTP, header propagation và HEAD → GET Range fallback.
- scripts/test-worker-dash-proxy.js — kiểm tra proxy segment DASH và bảo toàn bytes/media MIME.
- scripts/test-worker-hls-segments.js — kiểm tra proxy HLS không giải mã segment MPEG-TS thành text.
- scripts/test-playback-startup-fallback.js — kiểm tra failover HLS ngay khi gặp lỗi mạng/HTTP và timeout ngắn.
- Web Browser Validation đã pass ở các commit kiểm thử trước đó; bản cuối có thêm cache-buster và đang chờ workflow mới xác nhận.
- Playwright runner không có H.264 decoder (codec capability false), nên test E2E xác minh manifest/segment trả 200 khi codec không có; nếu H.264 có sẵn, vẫn yêu cầu video.currentTime tăng.
- Chỉ đổi NM7 TV Web; không đụng nguồn mặc định, NM7 Mobile hoặc NM7 TV Android. Chưa merge nhánh fix mới / chưa deploy cho tới khi xác nhận test cuối.

## 2026-10-10 — Kết quả cuối: sửa SCTV4K và nguồn M3U tùy chỉnh đã triển khai

- PR #20 đã merge vào `stable/nm7-tv-web-2026-10-09`; commit: `61b76745edeee6c516a6fd7a0e7f5f511c0d8d36`.
- **Cloudflare Deploy #445: SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38023516146. Toàn bộ syntax/deploy/production smoke tests PASS.
- **Web Browser Validation: SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38023401289. Các regression test gồm header tùy chỉnh, GET Range probe, segment HLS và DASH proxy đều PASS.
- **Browser E2E: SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38023401145. Điều hướng remote và tải playlist/segment HLS trả HTTP 200; máy ảo CI không có decoder H.264 nên test không thể xác nhận giải mã video thực tế.
- SCTV4K: HLS network/CORS hoặc HTTP 4xx/5xx chuyển qua đường proxy ngay; HLS startup watchdog giảm từ 15 giây xuống 8 giây; cache-buster được đổi để lấy player mới.
- Nguồn tùy chỉnh: #EXTHTTP được parse và header User-Agent/Referer/Origin/header khác được bảo toàn. Probe dùng GET Range nếu HEAD bị chặn/không xác định được loại. DASH BaseURL/segment tuyệt đối được proxy qua Worker cùng miền và giữ header cần thiết.
- Địa chỉ kiểm thử chính thức: `https://nm7-tv-web.phuongnm7-iptv.workers.dev/`.
- Chỉ NM7 TV Web thay đổi; không đổi URL playlist mặc định, không sửa NM7 Mobile/Android.

## 2026-10-10 — SCTV4K vẫn đen sau fallback: phân tích video và sửa lần hai

### Kết quả chẩn đoán trực tiếp

- Lỗi trong video: player đã thử proxy nhưng timeout ở 8 giây; màn hình vẫn đen.
- Manifest SCTV4K trực tiếp trả HTTP 200, nhưng các segment TS trực tiếp trả HTTP 400.
- Worker proxy tải lại segment thành công HTTP 200, MIME `video/mp2t`, bytes hợp lệ theo sync MPEG-TS.
- `ffprobe` xác nhận nguồn video là HEVC/H.265 Main 3840×2160 25 fps, segment mẫu khoảng 3.9 MB và ít nhất 8 MB. Vì vậy watchdog 8 giây không phù hợp với luồng này.

### Code sửa trên branch

- Worker đánh dấu SCTV4K từ host `vietanhtv.id.vn` dùng proxy trước tiên.
- `app.js` và `app-safari-policy.js` xác minh identity của HLS instance trong callbacks; bỏ qua sự kiện lỗi đến muộn từ instance đã hủy để không phá lượt proxy mới.
- HLS watchdog riêng cho SCTV4K/vietanhtv là 45 giây; HLS khác vẫn dùng timeout ngắn. Lỗi HTTP 4xx/5xx hoặc lỗi mạng được xử lý ngay.
- Cache-buster mới đảm bảo thiết bị tải file player đã sửa.
- Regression test mới xác minh candidate SCTV4K được đánh dấu proxy-first và không ảnh hưởng candidate HLS khác.

### Kết quả CI

- Live diagnostic #38024197006: https://github.com/phuongnm7/nm7-tv-web/actions/runs/38024197006.
- Web Browser Validation #38024369674: **SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38024369674.
- Browser E2E #38024369686: **SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38024369686. Runner xác nhận các lượt tải manifest và segment cho fixture, nhưng không có decoder H.264; chưa thể dùng CI để xác nhận playback thật của HEVC 4K.
- Code trên nhánh `fix/sctv4k-proxy-retry-state-20261010`, chưa deploy lúc ghi nhận. Không thay đổi playlist mặc định, NM7 Mobile hoặc NM7 TV Android.


## 2026-10-10 — Follow-up based on video 224589

- Re-ran a live diagnostic against the official Cloudflare Worker. SCTV4K's manifest on `vietanhtv.id.vn` returns HTTP 200 directly, but direct child `.ts` media requests return HTTP 400. Fetching the same manifest through `/api/stream` returns HTTP 200, and proxied media segments return HTTP 200 with `video/mp2t`.
- Root cause of the current black screen/long wait: the player still selected direct-first for this known source and the SCTV4K special case expanded the startup watchdog to 45 seconds. This overrode the earlier 8-second HLS timeout.
- New isolated branch `fix/sctv4k-proxy-retry-state-20261010`: start SCTV4K/VietAnhTV HLS via the working Worker proxy first in both player entrypoints; remove 45-second override; cap HLS watchdog at 8 seconds; bump cache-buster; add regression assertions.
- Diagnostic workflow: https://github.com/phuongnm7/nm7-tv-web/actions/runs/38024005264 (PASS). This is a source/segment HTTP diagnostic, not a claim that device playback has already been verified.

## 2026-10-10 — SCTV4K proxy-first correction

- Root cause confirmed against production: direct SCTV4K HLS manifest returns HTTP 200, but its TS child requests return HTTP 400. Previous behavior still allowed direct attempt first and could leave startup waiting.
- Worker now tags the `vietanhtv.id.vn` candidate `forceProxy: true`; both web player entrypoints enforce proxy-first for this host.
- Bounded the known 4K watchdog to 15 seconds (removed the 45-second wait) and bumped the active player cache-buster.
- Added regression test `scripts/test-sctv4k-proxy-preference.js`; full Web Browser Validation PASS: https://github.com/phuongnm7/nm7-tv-web/actions/runs/38025807061.
- Browser HLS E2E is pending; CI lacks H.264 decoder, so actual device playback remains required.
- DAZN was not found in server presets 1/2 or sports playlists. It is likely in the user's custom/local source; exact URL/entry must be provided to inspect the upstream and headers. No source defaults, NM7 Mobile, or NM7 TV Android changed.

## 2026-10-10 — Điều tra video 224593: SCTV4K còn chậm và kênh thể thao quốc tế bị đen

### Quan sát từ video và chẩn đoán trước đó

- Video mới cho thấy các kênh như `UK - SKY SPORTS+ 12 FHD`, `UK - SKY SPORTS+ 39 FHD` và `UK - TNT SPORTS 1 FHD` đi từ trạng thái xác định định dạng sang thử nguồn có gắn nhãn proxy, nhưng màn hình vẫn đen.
- Các kênh này không nằm trong ba playlist do Worker phục vụ (TV preset 1, TV preset 2, Thể thao) ở lượt chẩn đoán trước. Nhiều khả năng chúng đến từ nguồn M3U cục bộ/tùy chỉnh. Video không hiển thị đủ URL và các dòng header để xác định upstream status, cấu hình DRM hoặc codec; không được suy đoán rằng proxy 200 đồng nghĩa phát được.
- Với SCTV4K, diagnostic production xác nhận manifest trực tiếp HTTP 200 nhưng TS child segments trực tiếp HTTP 400; hai segment mẫu qua Worker proxy HTTP 200 và `video/mp2t`. Lượt kiểm tra trước đó nhận diện stream là HEVC/H.265 3840×2160. Điều này giải thích vì sao proxy-first là cần thiết, nhưng chưa giải thích được toàn bộ độ trễ đến khung hình đầu tiên trên thiết bị thật.

### Sửa lỗi trên nhánh cô lập

Nhánh: `fix/sports-hls-startup-proxy-20261010`. **Chưa merge vào stable và chưa deploy production.**

- `worker.js`: thêm nhận diện nội dung dựa trên tối đa 4 KB đầu của bản sao response. HLS ở URL không có đuôi và MIME `text/plain` được rewrite giống manifest HLS bình thường; segment TS/fMP4 bị gắn sai MIME được chuyển tiếp dạng nhị phân thay vì bị đọc như văn bản.
- `web-tv/app.js` và `web-tv/app-safari-policy.js`: tuần tự hóa chuyển candidate để lỗi HLS.js và lỗi media element không gây retry đua nhau; nếu candidate proxy-first thất bại ở proxy thì chuyển candidate kế tiếp, không chờ thêm một chu kỳ watchdog để thử lại đúng proxy đó.
- HLS.js bật fragment prefetch và Web Worker trên trình duyệt không phải Tizen; vẫn giữ worker tắt với UA Tizen/SMART-TV cũ. Tăng cache-buster của script đang được trang sử dụng.
- Regression bổ sung: manifest HLS extensionless + `text/plain`; segment URI tương đối được rewrite; bảo toàn User-Agent/Referer/header tùy chỉnh; segment TS không có extension nhưng bị gắn MIME HLS phải được giữ nguyên byte; kiểm tra retry không đua và HLS prefetch.

### Kết quả kiểm thử

- Web Browser Validation #388: **SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38027250808. Syntax, regression checks và required assets đều PASS.
- Browser remote + HLS E2E #419: **SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38027250824. Đây là fixture HLS phục vụ test UI; không chứng minh các URL thể thao thật đã phát được, và không giải mã HEVC 4K trên TV thật.
- Không thay đổi playlist/URL mặc định, không merge/deploy, không sửa NM7 Mobile hoặc NM7 TV Android.

### Còn phải xác minh trước khi phát hành

- Cần lấy đúng một entry đang lỗi từ nguồn M3U tùy chỉnh: dòng `#EXTINF`, các dòng `#EXTHTTP`/`#EXTVLCOPT` nếu có, và URL stream. Có thể che token nhạy cảm sau khi giữ lại hostname và cấu trúc đường dẫn phù hợp. Sau đó phải kiểm tra status và Content-Type của manifest, URI con, segment/fragment, header bắt buộc, codec/DRM và thời gian tải thực.
- Độ trễ SCTV4K cần đo từ khi bấm kênh đến các mốc manifest, segment đầu, `loadeddata`/`playing` và khung hình giải mã trên thiết bị. E2E CI giả lập không thay thế phép đo đó.

## 2026-10-10 — Video 224593: source latency and unquoted M3U User-Agent fix

### Evidence from production Cloudflare

- Diagnostic run #26: https://github.com/phuongnm7/nm7-tv-web/actions/runs/38027633710 (**SUCCESS**; path/query values remain redacted in logs).
- SCTV4K manifest returned HTTP 200 but needed about 3.46 s for direct response headers; through the Worker, about 3.01 s. Direct media segments returned HTTP 400.
- The live manifest has target duration 6 s, six listed segments and no `#EXT-X-ENDLIST`; the media sequence changed between direct and proxy requests. Long-lived manifest caching is unsafe because stale entries may point to segments that have rolled out of the live window.
- One proxied TS segment sample timed out while reading after 12 s; another returned 4,417,248 bytes in 4.689 s. ffprobe reports HEVC Main, 3840×2160, 25 fps. Prior samples were also several MB and had variable response times. This is strong evidence that upstream startup latency and 4K segment delivery/decoding are contributors; the browser watchdog alone is not the cause.

### M3U parser bug found and fixed in this branch

- A saved user sports M3U uses lines like `#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Linux; Android 15) ...` without quotes around the full value.
- The old regex captured only up to the first whitespace, truncating the UA and potentially causing a provider to reject the playlist or return HTML instead of HLS. Native playback can still work because its parser retains the full value.
- Patched `worker.js`, `web-tv/app.js` and `web-tv/app-safari-policy.js` to capture and trim the entire unquoted User-Agent value. Referer and Origin are retained.
- Extended `scripts/test-custom-m3u-headers-probe.js`: it loads a representative unquoted-User-Agent M3U entry, checks the full value in the parsed candidate, and asserts the exact UA, Referer and Origin reach the GET Range probe. Static regression assertions cover both web player entrypoints.

### Current branch test results

- Web Browser Validation #397: **SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38027577281.
- Browser remote + HLS E2E #428: **SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38027577190.
- Live diagnostic #26: **SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38027633710.
- These checks validate parser/proxy logic and a controlled HLS fixture. They do not prove the three named real sports channels now play; their exact M3U entries were not available in the server presets or found in the older saved M3U file, and no target-device playback has yet been verified.
- Branch remains `fix/sports-hls-startup-proxy-20261010`. No merge/deploy or source URL changes. Do not deploy before confirming at least one actual failing sports entry through manifest, variant/segment and playback on the target device.

### Follow-up diagnostic #27 — saved sports M3U sample

- Diagnostic #27: https://github.com/phuongnm7/nm7-tv-web/actions/runs/38027818973 (**SUCCESS**).
- The representative saved Film4k TNT Sports 1 endpoint returned HTTP **403** with `application/json` both when sent the full User-Agent and when sent the truncated `Mozilla/5.0`; the proxied request also returned 403. The new User-Agent parser fix is real and regression-tested, but this one live endpoint currently does not establish that UA truncation alone caused that stream’s failure.
- SCTV4K re-check: manifest response took ~4.0 s direct / ~2.2 s through proxy. The first proxied TS sample was ~3.9 MB and took ~5.7 s total; ffprobe confirmed HEVC 3840×2160 25 fps. Direct segment still returned HTTP 400. The manifest is live and its media sequence continues to change.
- The names in video 224593 (UK - SKY SPORTS+ 12 FHD, UK - SKY SPORTS+ 39 FHD, UK - TNT SPORTS 1 FHD) are not in the inspected production presets and were not found verbatim in the older saved M3U files available to this chat. The representative probe above is a separate, older `film4k.net` entry and must not be presented as proof about the exact video URLs.
- Web Browser Validation #400: **SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38027818980. Browser remote + HLS E2E #431: **SUCCESS** — https://github.com/phuongnm7/nm7-tv-web/actions/runs/38027818989.
- No production deployment, merge to stable, playlist URL change, or changes to NM7 Mobile/Android.


## 2026-10-10 — Stalker/Xtream TCP socket qua Cloudflare Worker

- Nguyên nhân đã tái hiện: URL Stalker trả 302 sang IP stream; theo redirect bằng Fetch API trong Worker nhận 403, nhưng TCP socket qua Cloudflare tới đích được allowlist trả HTTP 200 `video/mp2t` cùng byte sync MPEG-TS hợp lệ.
- `worker.js`: thêm handler TCP streaming bằng `cloudflare:sockets`, có allowlist cố định theo host/path/extension và IP/cổng đích; truyền tiếp body theo luồng, không cache hay buffer toàn bộ stream.
- `web-tv/app.js` và `web-tv/app-safari-policy.js`: vẫn dùng proxy cùng origin Cloudflare Worker; không dùng Vercel làm đường phát.
- Regression tests: `test-worker-hls-segments.js`, `test-stalker-default-user-agent.js`, `test-playback-startup-fallback.js`, `test-sctv4k-proxy-preference.js` và các bài test header/DASH hiện có.
- [Cloudflare TCP socket diagnostic #38038333778](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38038333778): HTTP 200, `video/mp2t`, MPEG-TS sync hợp lệ.
- [Web Browser Validation #38038333749](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38038333749): PASS.
- [Browser remote + HLS E2E #38038333758](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38038333758): PASS.
- Người dùng đã xác nhận bản test Cloudflare này hoạt động; bản này được đưa vào nhánh ổn định. Kết quả deploy production được theo dõi riêng.

Phạm vi: chỉ NM7 TV Web/Cloudflare Worker. Không sửa NM7 Mobile hoặc NM7 TV Android; không chuyển luồng phát video sang Vercel.


## 2026-10-10 — Sửa lỗi thêm nguồn URL trên NM7 TV Web (Cloudflare)

### Nguyên nhân đã xác minh
- URL nguồn thể thao `https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u` trả HTTP 200 và nội dung M3U khi được gọi trực tiếp từ runner.
- Cùng URL đó trả HTTP 404 khi Worker NM7 TV Web gọi qua `fetch()`; thử thêm User-Agent Chrome cũng vẫn 404.
- Kết quả này chứng minh URL playlist không bị mất. Vấn đề nằm ở giao tiếp Worker-to-Worker qua URL `workers.dev`, không phải parser M3U hay thao tác chọn tệp.

### Bản sửa đã chuyển vào nhánh ổn định
- `worker.js`: thêm `fetchPlaylistTarget()`; với host thể thao `thethaonm7.phuongnm7-iptv.workers.dev`, dùng binding `THETHAO_SOURCE` thay vì gọi URL công khai bằng Fetch API. Đường này được dùng cho nguồn thể thao mặc định và nhập URL tùy chỉnh; các host khác vẫn theo đường tải hiện có.
- `sourceResponse()`: thêm lần thử User-Agent trình duyệt dự phòng và báo mã HTTP/Content-Type rõ hơn khi nguồn vẫn lỗi.
- `wrangler.toml`: khai báo Service Binding `THETHAO_SOURCE = thethaonm7`.
- `.github/workflows/cloudflare-deploy.yml`: thêm production smoke test cho URL đang lỗi và báo trạng thái kiểm thử.
- Không đổi URL nguồn chính/dự phòng, giao diện, player, DRM, nhóm playlist mặc định, hoặc logic ứng dụng Android/Mobile.

### Kết quả kiểm thử
- Worker thử nghiệm Cloudflare: nguồn đang lỗi nhập thành công **1.010 kênh**; hai playlist mặc định trả lần lượt 300 và 595 kênh.
- Production Cloudflare, kiểm tra read-only từ runner: API `/api/source` trả **1.010 kênh**. Workflow kiểm tra: [#38061701828](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38061701828) (**SUCCESS**).
- Người dùng đã xác nhận thao tác thêm nguồn trên NM7 TV Web hoạt động sau sửa.
- Phạm vi chỉ `phuongnm7/nm7-tv-web` và Cloudflare Worker. Không sửa NM7 TV Android hoặc NM7 Mobile; không chuyển dự án sang Vercel.


## 2026-10-10 — Sửa nút “Tải lại nguồn” cho Thể thao

### Nguyên nhân
- Nút tải lại đã gọi `loadSource('sport', true)`, bỏ qua cache ở giao diện.
- Tuy nhiên, URL mặc định gọi `/api/playlist?source=sport`; Worker có `playlistCache` TTL 30 giây và route cũ không nhận biết yêu cầu làm mới. Vì vậy, API vẫn trả danh sách cũ dù người dùng bấm tải lại.
- Nhập URL trực tiếp dùng `/api/source`, là route khác không dùng `playlistCache`; điều này giải thích vì sao tải lại URL thủ công cập nhật được còn nguồn Thể thao mặc định thì chưa.

### Bản sửa
- `web-tv/app.js` và `web-tv/app-safari-policy.js`: mỗi lần mở hoặc tải lại nguồn Thể thao đều thêm `refresh=1` vào API.
- `worker.js`: route `/api/playlist` chuyển cờ `refresh=1` vào `playlistResponse()`; cờ này bỏ qua cache 30 giây chỉ cho yêu cầu được đánh dấu. Nguồn khác giữ nguyên chính sách cache.
- Phản hồi thành công từ lượt làm mới có trường `refreshed:true` để smoke test xác minh API đã nhận đúng yêu cầu.
- `web-tv/index.html`: tăng cache-buster của `app-safari-policy.js` để tránh dùng script cũ từ cache trình duyệt.
- Thêm `scripts/test-sport-playlist-refresh.js` và thêm bước kiểm tra trong workflow Cloudflare production.

### Phạm vi
Chỉ sửa luồng nguồn Thể thao của NM7 TV Web/Cloudflare. Không sửa NM7 TV Android hoặc NM7 Mobile; không thay đổi nguồn URL, playlist mặc định khác, giao diện hay logic phát video.


## 2026-10-10 — Sửa tiếp: nguồn Thể thao mặc định phải dùng danh sách động

### Nguyên nhân bổ sung
- Lượt chẩn đoán trước cho thấy API đã nhận `refresh=1`, nhưng nó vẫn lấy nguồn đầu tiên trong `SOURCES.sport`: GitHub Raw `sports-auto.m3u`. URL này trả 783 kênh ở lượt test, trong khi URL Worker động `thethaonm7.../playlist.m3u` trả hơn 1.000 kênh.
- Vì nguồn GitHub vẫn hợp lệ và có playlist, Worker không rơi xuống nguồn dự phòng. Do đó chỉ bỏ qua cache là chưa đủ; ưu tiên nguồn mới nhất cũng phải sửa.

### Bản sửa
- Đổi thứ tự `SOURCES.sport`: Worker động `https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u` đứng trước; GitHub Raw thành nguồn dự phòng.
- Giữ `refresh=1` để bỏ qua cache 30 giây của Worker NM7 TV Web.
- Bổ sung test hồi quy kiểm tra cả cờ refresh lẫn thứ tự nguồn; Cloudflare production smoke test yêu cầu API trả đúng upstream Worker động.

### Kết quả production
- Cloudflare Deploy [#38064028213](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38064028213): **SUCCESS**.
- `/api/playlist?source=sport&refresh=1` trả **1.028 kênh**, `refreshed:true`, upstream chính xác là `https://thethaonm7.phuongnm7-iptv.workers.dev/playlist.m3u`.
- Kiểm thử regression `SPORT_PLAYLIST_REFRESH_TESTS_OK`; các smoke test playlist và nhập nguồn tùy chỉnh cũng PASS.

Phạm vi chỉ NM7 TV Web/Cloudflare; không thay đổi NM7 TV Android hoặc NM7 Mobile.


## 2026-10-10 — Sửa nút menu ba gạch khi iPad nằm ngang

### Nguyên nhân
- Khi bật “Yêu cầu trang web cho máy tính”, Safari trên iPadOS có thể dùng User-Agent/navigator.platform mang giá trị Macintosh/MacIntel.
- Bộ nhận diện thiết bị trước đây chỉ coi thiết bị cảm ứng là thiết bị di động khi kích thước màn hình tối đa không vượt quá 1024 px. Ở chế độ ngang rộng, body.mobile-mode không được bật; nút ☰ vốn dựa vào trạng thái này để hiện nên bị ẩn.
- Ở chế độ dọc, media query theo chiều rộng vẫn có thể hiện nút, khiến lỗi chỉ xuất hiện khi xoay ngang.

### Bản sửa
- Cả web-tv/app.js và web-tv/app-safari-policy.js nhận diện thêm iPadOS chạy desktop mode bằng Macintosh/MacIntel kết hợp với navigator.maxTouchPoints > 1, không phụ thuộc độ rộng màn hình.
- Giữ xử lý resize và orientationchange để cập nhật bố cục sau khi xoay thiết bị.
- Tăng cache-buster của script đang được index.html sử dụng để trình duyệt tải mã mới.
- Thêm scripts/test-ipad-landscape-menu.js và đưa vào workflow Cloudflare; smoke test production kiểm tra script hiện hành có chứa nhận diện iPad desktop mode.

### Phạm vi
Chỉ sửa NM7 TV Web và triển khai qua Cloudflare Worker. Không thay đổi NM7 TV Android, NM7 Mobile, logic phát video hoặc cấu hình Vercel.


## 10/10/2026 — Tích hợp thử mục Bản tin GetOut

- Tạo nhánh tính năng `feature/getout-ban-tin-20261010` từ stable `stable/nm7-tv-web-2026-10-09`.
- Thêm nút Bản tin trên thanh tab hiện có; thêm trang độc lập `web-tv/ban-tin.html`.
- Thêm endpoint Cloudflare Worker `/api/news` với allowlist nguồn 24h Highlights, ON Plus và BongTV; cache dữ liệu 120 giây; không nhận URL tùy ý từ người dùng.
- Trang có danh mục, thẻ video, tải lại và mở video/trang gốc trong iframe; nút “Mở nguồn” dự phòng nếu nhà cung cấp chặn nhúng.
- Chưa deploy production. Scraping có thể cần tinh chỉnh theo HTML thực tế; cần test danh sách và playback trên desktop, iPad/Safari và TV browser trước khi merge.


## 10/10/2026 — Hoàn thiện luồng mở Bản tin và tích hợp provider theo phân tích APK GetOut

### Lỗi nút Bản tin không mở
- Nguyên nhân được xác định từ mã thật: `index.html` nạp `app-safari-policy.js`, còn listener trước đó chỉ được thêm vào `app.js`. Nút nhìn thấy trên màn hình do đó chưa có handler trong script active.
- Đã thêm handler của nút Bản tin vào script active; mục Bản tin trong side menu được bổ sung route riêng đến `/ban-tin.html`.
- Cache-buster giữ nguyên chuỗi `ipad-landscape-menu1` mà test menu iPad đang kiểm tra, đồng thời thêm query `news=20261010` để tải mã mới.

### Tích hợp GetOut theo provider, không xem như một playlist M3U
- Highlights 24h: parser theo article selector được xác định từ APK và AJAX endpoint “load more”; validates link theo host 24h, đọc metadata tiêu đề/ảnh và bổ sung scraper dự phòng.
- Xem lại: Worker đọc host từ cấu hình GitHub công khai GetOut `leeshin5757/getout/txt/btv`, kiểm tra host HTTPS theo allowlist rồi xây đường dẫn `/gateway-api/sp/sports/anon/getReplay?pageNo=1&pageSize=30`. Giữ HLS/MP4 trực tiếp nếu bản ghi API trả về, kèm Referer/Origin tương ứng; không trích khóa DRM hay bỏ qua xác thực.
- Trang Bản tin có player riêng cho HLS native/Hls.js và MP4, dọn trạng thái khi đóng player, đồng thời có fallback mở trang nguồn khi URL không phát được/nguồn không cho nhúng. API lỗi trả lại URL nguồn để giao diện vẫn có lựa chọn mở nguồn.
- ON Plus vẫn là adapter metadata/phần liên kết công khai. APK có nhiều nhánh parse và cơ chế resolve riêng; chưa khẳng định luồng playback tương đương 100% và không vượt DRM.
- Chưa xác nhận được nguồn chính xác của hai mục `HighLight #2` và `HighLight #3` từ bằng chứng phân tích tĩnh hiện có. Cần tiếp tục xác định bằng phân tích cấu hình/adapter trước khi nói đã sao chép toàn bộ GetOut.

### Kiểm tra / an toàn triển khai
- Đã thêm `scripts/test-getout-news-entry.js` để kiểm tra nút màn hình chính, listener trong script thực sự active, đường dẫn side menu, route Worker, 3 tab, player và cú pháp inline JavaScript.
- Workflow chuyên biệt `.github/workflows/getout-news-preview.yml` thực hiện syntax check và regression tests trước khi deploy; deploy chỉ bằng `wrangler.preview.toml` (Worker riêng `nm7-tv-web-news-preview`), sau đó smoke-test homepage, trang `/ban-tin.html`, active script và API Highlights.
- **Không thay đổi Worker production hoặc nhánh stable; PR #25 vẫn là bản tính năng chưa merge.** Địa chỉ test: https://nm7-tv-web-news-preview.phuongnm7-iptv.workers.dev/ban-tin.html
- Lượt kiểm cuối trước cập nhật ghi chép: [GitHub Actions #38071099800](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38071099800) đạt `success` trên commit `f5336dc41cde49fc86d407a5fe6991fc25cd06bb`. Kết quả smoke test: Highlights 40 mục, ON Plus 40 mục, replay 30 mục và direct HLS/MP4 count 30; syntax checks và regression tests đều qua. Kiểm tra tự động xác nhận phản hồi/API và đường dẫn UI, nhưng không thay thế việc bấm thử trên thiết bị thật để xác minh CORS, codec và khả năng phát cuối cùng.


### Kiểm chứng chi tiết schema GetOut BTV và playback — 10/10/2026
- Smoke test trên Worker preview cho thấy endpoint thật trả `success/message/needConfirm/code/result`; danh sách nằm ở `result.records` (30 bản ghi), không phải một trường `videos` bên trong từng bản ghi như parser cũ giả định.
- Record thực tế có `url1`, `title`, `label1`, `homeName`, `awayName`, `homeLogo`, `awayLogo`, `image`, `matchTime`, `competitionName`. `url1` là HLS ở dạng `https://static.wex1sora.com/.../index.m3u8`; Worker chuẩn hóa nó bằng pathname thay vì chỉ kiểm tra đuôi trên chuỗi URL.
- Giao diện dùng HLS native (Safari) hoặc Hls.js khi trình duyệt hỗ trợ; nếu trình phát trực tiếp không hoạt động, nút “Mở nguồn” chuyển sang trang nhà cung cấp thay vì cố nhúng link m3u8 thô vào iframe.
- Lượt smoke test preview đã quan sát được `highlights=40`, `onplus=40`, `replay=30`. Workflow đã được tăng cường để báo lỗi nếu endpoint replay trả HTTP 200 nhưng không có nội dung hoặc không có URL media trực tiếp.
- Đã gỡ phần debug schema tạm sau khi xác định các trường, không còn endpoint debug công khai trong Worker.
- Các lượt CI thành công trước bước tích hợp HLS trực tiếp chỉ xác nhận logic và API listing; phải dùng workflow mới nhất sau những commit cuối để xác nhận regression/syntax/deploy. Cần người dùng thử phát thực tế trên iPad/Safari và các trình duyệt TV vì kiểm tra HTTP không xác nhận được CORS/codec/khả năng phát cuối cùng.

## 11/10/2026 — Fix ON Plus Tin thể thao: giữ nguyên nested HLS URL

- Điều tra dữ liệu trang video công khai và Next.js `__NEXT_DATA__`/`/_next/data/.../video.json`: các video công khai không bảo vệ có URL HLS chính thức dạng `https://vod.onplus.com.vn/hls/vod/newonsports/...mp4/index.m3u8`.
- Nguyên nhân gốc: regex cũ chỉ nhận đến phần `.mp4`, cắt bỏ `/index.m3u8`; proxy vì vậy gửi yêu cầu tới URL MP4 không hoàn chỉnh và upstream trả HTTP 400.
- Sửa `extractProviderMedia()` để nhận trọn đường dẫn nested HLS `.mp4/index.m3u8`, đồng thời giữ hỗ trợ URL MP4 thông thường và HLS có query string.
- Thêm `scripts/test-onplus-media-url.js` để kiểm tra hồi quy ba dạng URL; workflow preview chạy test này trước deploy.
- Kiểm chứng đầu-cuối trước khi dọn mã chẩn đoán: [workflow #38097937340](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38097937340) đạt SUCCESS. Log xác nhận OnPlus trả HLS manifest HTTP 206; `/api/stream` tải manifest và tài nguyên con thành công. Highlights và Xem lại cũng tải được HLS manifest/tài nguyên con.
- Sau khi gỡ mã chẩn đoán tạm, [workflow #38098170780](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38098170780) đạt SUCCESS: `ONPLUS_MEDIA_URL_REGRESSION_OK`, Highlights 40 mục, ON Plus 61 mục, Xem lại 30 mục; playback probe đều tải được HLS manifest và tài nguyên con.
- Đã xác nhận video mẫu có `is_protected=false`; nội dung Premium/`is_protected` vẫn bị từ chối, không tìm cách vượt xác thực hoặc DRM.
- Phạm vi vẫn chỉ là nhánh `feature/getout-ban-tin-20261010` và Worker preview riêng. Không cập nhật stable, không merge PR #25, không triển khai production và không sửa NM7 Mobile/NM7 TV Android. Kiểm thử trên trình duyệt thật vẫn cần thiết để đánh giá trải nghiệm/codec từng thiết bị.

## 11/10/2026 — Sửa thumbnail và tối ưu cảm giác tải Bản tin (preview)

- ON Plus dùng field picker đệ quy để tìm thumbnail/cover lồng nhau, lọc placeholder, hỗ trợ `data-src`, `data-lazy-src`, `srcset`, `data-srcset`, và CSS background image; allowlist ảnh có thêm CDN `vtvcab.vn`.
- Xem lại ưu tiên ảnh cover/thumbnail trận trước logo đội; smoke test ghi nhận 30/30 mục có URL ảnh. ON Plus ghi nhận 60/60 có URL ảnh.
- Bản tin có nút Cập nhật cưỡng bức (`refresh=1`) và tự kiểm tra lại sau 90 giây. Khi refresh cùng tab, danh sách cũ tiếp tục hiển thị cho tới khi nhận dữ liệu mới; sau khi Highlights lên màn hình, hai nguồn còn lại được tiền tải.
- Cache list được đặt 60 giây để cân bằng độ mới và tốc độ; explicit refresh bỏ qua cả cache isolate và edge. Workflow log thời gian upstream và cache-hit thành hai số riêng.
- Bằng chứng playback [workflow #38100679308](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38100679308): tải HLS manifest/segment thành công cho Highlights, ON Plus và Xem lại. Lượt force refresh: ON Plus ~5,29 giây; replay ~1,67 giây; chưa đại diện tốc độ cache hit.
- Chỉ deploy Worker preview riêng; stable/production không đổi, PR #25 chưa merge. Cần người dùng xác minh giao diện và ảnh tải thực tế trên thiết bị.
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
- Giao diện preview được giữ ở URL hiện tại; mở lại trang hoặc bấm **Cập nhật** để lấy danh sách mới. Stable/production chưa được cập nhật; PR #25 vẫn chưa merge.
### Sửa tiêu đề Xem lại: tên hai đội (11/10/2026)

- Ảnh người dùng xác nhận thumbnail đã hiện nhưng tiêu đề chỉ còn Italian Serie A vs / English Premier League vs. Lỗi nằm ở thứ tự ưu tiên trường: title tổng quát của provider được dùng trước tên hai đội, và object homeTeam/awayTeam có thể khiến parser bỏ qua homeName/awayName.
- Thêm replayTeamName() để ưu tiên trường tên đội trực tiếp rồi tìm tiếp trong object/nested metadata; replayMatchTitle() ưu tiên Tên đội nhà vs Tên đội khách trước title chung. Fallback không còn kết thúc bằng vs rỗng.
- API replay trả thêm homeName và awayName; regression test dùng fixture tên trực tiếp, object lồng nhau và title lỗi. Smoke test kiểm tra title không kết thúc bằng vs thiếu đội khách.
- Chỉ sửa feature branch và Worker preview riêng; stable/production không đổi.
## 11/10/2026 — Phát hành Bản tin lên stable/production

- PR #25 đã merge dạng squash; commit runtime được deploy là `8f513632a0b51b57a42d795968bb62aa2d5b764b`.
- Workflow Cloudflare production #38103299751 SUCCESS; mới bổ sung bước kiểm tra syntax/regression trước deploy và smoke test Bản tin sau deploy.
- Production smoke xác nhận Highlights 40; ON Plus 60 mục/60 URL ảnh; Xem lại 30 mục/30 URL ảnh và 30/30 bản ghi có tên đội. Ba ảnh mẫu của từng nguồn ON Plus/Xem lại tải thực tế và có MIME/byte ảnh hợp lệ.
- Tiến độ lịch sử phía dưới mô tả các trạng thái trong lúc phát triển preview; phần “Mốc ổn định hiện tại” ở đầu file là nguồn đúng cho trạng thái hiện hành.
## 11/10/2026 — Fix chữ “Danh sách kênh TV” chồng nút Bản tin trên mobile portrait

- Bằng chứng: ảnh chụp người dùng cho thấy nhãn ở giữa thanh tab bị đè lên nút Bản tin khi màn hình dọc; màn hình ngang ít gặp hơn.
- Thay `<div id="homeTitle">Danh sách kênh TV</div>` bằng vùng rỗng `<div id="homeTitle" aria-hidden="true"></div>`; không thay đổi nút ☰, YouTube, Bản tin hoặc control quay lại danh sách kênh.
- Thêm regression test `scripts/test-home-title-mobile-overlap.js`, chạy trước deploy trong `.github/workflows/cloudflare-deploy.yml`; production smoke cũng xác nhận nhãn tĩnh không còn và các tab vẫn tồn tại.
- Sẽ coi hoàn tất sau khi workflow Cloudflare production triển khai và smoke test thành công. Chỉ thay đổi NM7 TV Web; không chỉnh NM7 Mobile hoặc NM7 TV Android.
## 11/10/2026 — Xử lý HTML cũ sau deploy cho fix thanh tab mobile

- Commit đầu `0ec4194ab7da250669fd6974526780d3f82c9e96` đã deploy Worker thành công và test source đạt, nhưng smoke ngay sau deploy nhận HTML cũ ở edge và báo `MOBILE_HOME_TITLE_OVERLAP_FAIL`; không coi kết quả đó là hoàn tất.
- Để hạn chế trình duyệt giữ trang chủ cũ, Worker đặt `Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache`, `Expires: 0` cho `/` và `/tv`. Asset HTML có comment phiên bản mới để bảo đảm nội dung thực sự đổi.
- Smoke test được đổi thành retry tối đa 6 lần với khoảng nghỉ 3 giây, kiểm tra chữ `Danh sách kênh TV` không còn và ba nút menu/YouTube/Bản tin vẫn hiện.
- Chỉ NM7 TV Web/Cloudflare; không sửa NM7 Mobile hoặc NM7 TV Android.

## 12/10/2026 — Xác nhận sửa lỗi M3U của mục LIVE và cập nhật tài liệu

### Nguyên nhân
- Ảnh người dùng gửi hiển thị lỗi “Nguồn không trả về M3U hợp lệ”, trong khi feed LIVE được thiết kế lấy từ upstream playlist riêng.
- `web-tv/live.js` có regex kiểm tra `#EXTM3U` bị escape thừa. Kết quả là chuỗi playlist hợp lệ có thể bị từ chối trước khi parser đọc các entry.
- Không có đủ căn cứ để kết luận upstream feed bị hỏng; lỗi được xác định ở bước validation của Web.

### Thay đổi
- Sửa kiểm tra tiêu đề thành regex xử lý đúng `#EXTM3U`, bỏ BOM UTF-8 đầu file và chấp nhận khoảng trắng đầu dòng.
- Đổi cache-buster trong `web-tv/index.html` thành `live.js?v=20261012-live-ui2` để tránh dùng bundle cũ trong cache.
- Bổ sung/cập nhật assertion trong `scripts/test-live-feed.js` để ngăn lỗi validation và marker phiên bản tái diễn.
- Cập nhật README mô tả nguyên nhân, thay đổi, phạm vi deploy và kết quả kiểm thử.

### Kết quả kiểm tra
- Workflow [#38218369492 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38218369492), commit [a224decbf11a4ab72a1c9e7d031a5e781844d3fc](https://github.com/phuongnm7/nm7-tv-web/commit/a224decbf11a4ab72a1c9e7d031a5e781844d3fc).
- Job syntax/Live regression: PASS.
- Live-feed parser/integration regression: PASS.
- Regression playlist và UI hiện có: PASS.
- Deploy Worker preview riêng: PASS.
- Smoke test trang chủ, endpoint Live feed và API IPTV không đổi: PASS.

### Trạng thái phát hành và phạm vi
- Nhánh: `feature/live-section-2026-10-12`; PR [#26](https://github.com/phuongnm7/nm7-tv-web/pull/26) vẫn chưa merge.
- Preview: https://nm7-tv-web-live-preview.phuongnm7-iptv.workers.dev/
- Không deploy production, không cập nhật nhánh stable và không sửa NM7 TV Android/NM7 Mobile.
- Người dùng đã xác nhận bản sửa hoạt động. Các kiểm thử tự động và smoke test đã qua; không diễn giải chúng thành bằng chứng rằng mọi kênh/luồng đều phát tốt trên mọi thiết bị.

## 12/10/2026 — Khắc phục trùng thẻ LIVE và xác nhận production

### Hiện tượng và nguyên nhân
- Video người dùng gửi cho thấy cùng trận Hougang United vs Balestier Khalsa xuất hiện nhiều hàng; phần khác nhau là hậu tố tên luồng như `(BLV ĐỎM)`, `(BÒ TƯƠI)`, `(CÔNG CHẤT)`, `(Tv)`.
- Bộ phân tích Web giữ nhãn trong ngoặc khi tách tên hai đội nên khóa nhận diện trận khác nhau. Các nhãn này là tên nguồn/bình luận viên, không phải tên đội.

### Bản sửa
- Đồng bộ quy tắc nhận diện từ `LiveEvent.java` của NM7 TV Android: loại hậu tố ngoặc đơn/ngoặc vuông khỏi tên chuẩn của trận trước khi so khớp.
- Các hậu tố bị loại khỏi khóa trận vẫn được giữ làm nhãn server; nhãn nhóm nguồn cũng được giữ.
- Bump cache-buster parser thành `live-core.js?v=20261012-live-core2`.
- Chỉ sửa repository `phuongnm7/nm7-tv-web`; không thay đổi repository NM7 TV Android hoặc NM7 Mobile.

### Bằng chứng kiểm thử
- Regression workflow [#38250716920 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38250716920): cú pháp JavaScript, Live parser/integration và các hồi quy playlist/UI đều PASS.
- Fixture gồm 10 bản ghi cho hai trận khác nhau; trận Manchester City vs Arsenal có hai nguồn hợp lệ và loại nguồn kết thúc; bốn luồng Hougang–Balestier trở thành **một trận với bốn server**.
- Production workflow [#38250837941 — SUCCESS](https://github.com/phuongnm7/nm7-tv-web/actions/runs/38250837941): deploy Cloudflare Worker, kiểm tra homepage/script/feed/playlist, YouTube và Bản tin/GetOut đều PASS.
- Commit runtime: [`01527437e13af02461526efa86d9e026e7f7168a`](https://github.com/phuongnm7/nm7-tv-web/commit/01527437e13af02461526efa86d9e026e7f7168a).
- Production URL: https://nm7-tv-web.phuongnm7-iptv.workers.dev/.
- Kiểm thử tự động xác nhận logic gom nhóm và smoke API/UI; không thay cho kiểm tra thủ công trên thiết bị thật về bố cục, điều khiển hoặc khả năng phát từng luồng.


## 16/10/2026 — sửa nguồn playlist mặc định sau khi chuyển repo

- Default 1 dùng trực tiếp playlist hiện hành trong repo mới: `https://raw.githubusercontent.com/dungntk9/Iptv-phuongnm7/main/IPTV_Gop_VMTTV_vAppTV.m3u`; bỏ upstream `nm7-tv-web.vercel.app/api/vietmitv-merge`.
- Default 2 tiếp tục dùng URL Worker mặc định hiện có: `https://phuongnm7-playlist.phuongnm7-iptv.workers.dev/`; fallback vẫn là `https://iptv-live-merge.phuongnm7-iptv.workers.dev/playlist.m3u`.
- Cập nhật smoke test theo nhóm thực tế của danh mục đang sinh động; xác minh nhóm TV/VTVcab/Thể Thao/SCTV và các luồng DASH/ClearKey SCTV15, SCTV17, SCTV22.
- Mã đã commit trên nhánh stable. Chưa đánh dấu production hoàn tất trước khi workflow Cloudflare chạy xanh và xác minh hai preset mặc định trả danh sách kênh hợp lệ.


---

## 2026-10-18 — candidate: hide team name and source URL during LIVE playback

- Requested issue: when opening a match from the LIVE section, the team name and source URL were visible at the upper-left of the player and covered the broadcast picture.
- Root cause in the current source: `openPlayer(c)` always populated `#playerTitle` from `c.name` and `#playerMeta` from `c.url`; the top metadata strip was shown for all playback contexts.
- Fix on isolated branch `fix/live-player-hide-title-source-20261018`: `openPlayer` sets class `live-playback` when `S.livePlaybackContext` is active; `web-tv/index.html` uses `#player.live-playback #playerTop{display:none!important;}`.
- Normal channel playback keeps the existing metadata strip. No stream URL, live feed logic, playlist routing, player controls, or Worker logic was changed.
- Added `scripts/test-live-player-hide-metadata.js` and isolated workflow `.github/workflows/test-live-player-metadata.yml`.
- Verification: JavaScript syntax PASS; the targeted LIVE-only metadata regression workflow PASS: [run #39053254347](https://github.com/cnktvpc/nm7-tv-web/actions/runs/39053254347).
- Other imported browser/HLS workflows were triggered by the `fix/**` branch and some fail in unrelated baseline checks (including a stale cache-buster assertion and the existing local HLS fixture/browser startup); these do not indicate that the targeted CSS/class regression failed.
- Status: candidate only. Not merged to `main`; no Cloudflare Worker production deployment was run. Needs a preview/manual playback check before production promotion.

# Mời riêng đối tác Hoàng Long

V1 dành cho vài đối tác được quản lý chọn. Giữ `PARTNER_NETWORK_ENABLED=true` và `PARTNER_NETWORK_PUBLIC_REGISTRATION=false`. Không thay đổi catalog, mẫu, báo giá, đơn hàng hoặc quyền nhân viên. Không cần migration hay dịch vụ email mới.

## Luồng sử dụng

1. Quản lý/admin đã xác minh email mở `/admin/partner-network` và mục **Mời riêng đối tác**.
2. Nhập đúng email người được mời; tên chỉ là thông tin tuỳ chọn cho thư mời.
3. Nếu email chưa có tài khoản Auth, Supabase gửi thư mời tới `/partners/auth/invite`. Người nhận mở thư, xác minh email rồi được đưa tới `/partners/network`.
4. Nếu tài khoản đã có, hệ thống cho phép tài khoản đó hoàn tất hồ sơ mà không tạo lại hay gửi thêm email. Gửi họ đường dẫn `https://www.hoanglongtra.com/partners/network`; họ tự yêu cầu liên kết đăng nhập bằng email của mình.
5. Người được mời gửi hồ sơ. Hồ sơ vẫn **pending**; quản lý duyệt riêng, chốt điều kiện và cấp mã trước khi người đó được gửi khách giới thiệu.

Chỉ gửi email thật khi quản lý chủ động bấm nút mời cho người đã chọn. Kiểm thử tự động dùng dữ liệu giả và thay thế Auth backend; không gửi thư, tạo tài khoản hoặc hồ sơ trên production.

## Quyền và dữ liệu

`POST /api/staff/partners/invite` nhận `{email, displayName?}` cùng Bearer session. API kiểm tra module, origin, tài khoản Auth được xác thực, email đã xác minh và `staff_roles` manager/admin. JSON giới hạn 8 KiB; email tối đa 254 ký tự, tên tối đa 120. Không nhận vai trò, trạng thái, tỷ lệ, user ID hoặc redirect từ người gọi.

Service-role chỉ dùng trên server. API chọn chính xác tài khoản theo email qua tra cứu Auth giới hạn 100 người/trang, tối đa 10 trang. Danh sách, user ID, metadata, token và chi tiết lỗi provider không trả về trình duyệt. Nếu danh sách quá lớn hoặc email khớp nhiều tài khoản, API từ chối thay vì đoán.

Sau lời mời thành công, server ghi vào **app_metadata** của chính tài khoản:

- `hl_partner_invited: true`
- `hl_partner_invited_by`: ID người quản lý cấp quyền
- `hl_partner_invited_at`: thời điểm cấp quyền
- `hl_partner_invite_email_requested_at`: khi Auth đã nhận lệnh gửi thư mời mới

Các metadata có sẵn được giữ nguyên. Không ghi `staff_roles`, phê duyệt đối tác, mã đối tác, tỷ lệ hoa hồng hoặc hồ sơ khách hàng. Marker chỉ mở biểu mẫu đăng ký cho **UID đã xác minh**; permission được ràng buộc lại với UID khi giao diện đổi tài khoản. `user_metadata`, mã trong URL và dữ liệu gửi từ trình duyệt không cấp quyền này.

Lưu ý phạm vi: đây là gate cho **web intake**, không phải khóa toàn bộ RPC bằng RLS. RPC `partner_network_apply` vốn cho phép tài khoản đã xác minh gửi hồ sơ pending trực tiếp; thay đổi này không thu hồi quyền đó. Hồ sơ pending/rejected/disabled vẫn không được gửi lead mới hoặc truy cập dữ liệu đối tác khác. Không tuyên bố private invite là một khóa launch ở tầng database.

## Email và callback

Redirect luôn là `https://www.hoanglongtra.com/partners/auth/invite`; phải có chính xác URL này trong Supabase Auth allowlist. Giữ các redirect đã có và giữ SMTP hiện tại.

`inviteUserByEmail` dùng implicit fragment, không có PKCE của trình duyệt nhận. Trang nhận lời mời xoá fragment trước khi khởi tạo shared client, gọi `setSession`, xác minh bằng `getUser` rồi tải lại `/partners/network` để server tính quyền từ cookie mới. PKCE callback đăng nhập cũ được giữ nguyên. Không cần thay template Invite toàn dự án, tránh ảnh hưởng thư mời nhân viên. [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates) và [SDK invite implementation](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/GoTrueAdminApi.ts) mô tả hai luồng này.

Kết quả `kind: invited` nghĩa là Auth nhận lệnh gửi email và quyền đã lưu; chưa chứng minh thư đã Delivered hoặc người nhận đã mở. `existing`/`already_invited` không gửi email mới. Người dùng có thể tự yêu cầu liên kết đăng nhập từ `/partners/network` bằng tài khoản đã tồn tại.

## Lỗi từng phần và giới hạn

Auth gửi thư trước khi ghi private marker. Nếu bước ghi thất bại, trả `invite_access_failed` cùng `emailRequested: true`; không xoá tài khoản hay giả vờ hoàn tất. Bấm lại sẽ tìm tài khoản đã tạo và hoàn tất cấp quyền mà không gửi thêm email. Lỗi cấp quyền cho tài khoản đã có trả `existing_access_failed` và không tuyên bố email đã gửi.

Retry sau khi marker đã lưu trả `already_invited` mà không gửi thư khác. SMTP/Auth rate limit trả 429 và Retry-After 60 giây. Không có hàng đợi gửi lại hoặc sổ lịch sử invitation mới; Supabase Auth audit log và trusted metadata giữ thông tin cơ bản. Hai yêu cầu đầu tiên thực sự đồng thời trước khi Auth tạo tài khoản vẫn có thể tạo yêu cầu gửi trùng tuỳ hành vi/rate limit của provider; V1 không cam kết exactly-once ở tình huống đó. Giao diện khóa nút trong lúc gửi.

## Kiểm tra nội bộ

- Người chưa đăng nhập, nhân viên thường hoặc manager chưa xác minh email không mời được.
- Người không được mời vẫn không thấy form đăng ký khi public intake đóng.
- Invite fragment hợp lệ tạo session; fragment lỗi/hết hạn hướng dẫn đăng nhập lại, không lộ token.
- Quyền chỉ dành cho đúng UID được mời, không theo email nhập trên giao diện hay user_metadata.
- Tài khoản đã có và retry không tạo lại account hoặc gửi email mới.
- Hồ sơ tự gửi vẫn chờ duyệt; chưa có quyền lead, mã hay hoa hồng tự động.
- Chạy `node --test tests/partner-private-invites.test.mjs tests/partner-network-routes.test.mjs lib/partner-invite-callback.test.mjs` với backend giả; build do task chính chạy một lần.

Pilot thật nên bắt đầu một người được quản lý chọn: xem email thực tế, nhận lời mời, gửi hồ sơ và duyệt, rồi mới mở rộng 5–10 người. Không tự gửi thêm lời mời khi người dùng chưa chọn người nhận.

# Bài mạng xã hội trong kho tri thức — bản thử

`/admin/knowledge` có mục Bài đăng chờ phân loại. Nguồn giữ nội dung, liên kết, tài khoản, ngày đăng, thời điểm nhập và thời điểm Buffer cập nhật insight. Người phụ trách chọn chủ đề/góc; nguồn xã hội không tự trở thành kiến thức đã rà soát. Chưa gắn thì chưa cộng vào số bài của chủ đề.

Migration `0083_knowledge_social_inbox.sql` thêm `knowledge_social_posts` và quan hệ `knowledge_posts.social_post_id`. Danh tính duy nhất gồm provider/workspace/tài khoản/ID bài. Nguồn chỉ staff đọc, server ghi qua RPC service-only; gắn/chuyển chủ đề dùng RPC quản lý có kiểm tra version. Liên kết đã lưu kho không tự được mở lại. Bài trùng URL có sẵn được nối vào bản gốc; nhiều bản trùng cần rà soát trước, không tự đoán. Query parameter định danh Facebook được giữ khi so sánh URL.

Nguồn cập nhật không ghi đè ghi chú hoặc kết quả kinh doanh nhập tay. Snapshot giữ nguồn của mọi bài đã gắn, kể cả cũ hơn 200 bài gần nhất. Growth giữ funnel và liên kết gốc; số liệu nền tảng đọc từ Buffer khi có nguồn khớp. Lượt xem khác reach/impressions; likes Facebook khác tổng reactions; Threads replies là comments, reposts là shares, quotes giữ riêng. Giá trị chưa có hoặc chưa có thời điểm đo không đổi thành 0. Các chỉ số phong phú hơn giữ riêng đúng type/unit.

`GET/POST /api/staff/knowledge/social-sync` chỉ quản lý được gọi, khóa ở biến môi trường máy chủ `BUFFER_API_KEY` và `BUFFER_ORGANIZATION_ID`. Không nhập khóa qua chat, không dùng `NEXT_PUBLIC_` cho khóa. POST chỉ nhận thao tác sync, không nhận dữ liệu nguồn hoặc workspace do trình duyệt cung cấp. Đọc tối đa 20 bài đã đăng gần nhất, hai query Buffer, 15 giây, giới hạn response, khoảng nghỉ 60 giây; hiển thị rõ chưa lấy toàn bộ lịch sử. Route không đăng bài hoặc đọc/gửi tin nhắn khách. Credential của connector chat không được trích xuất cho website.

Bản thử nhập 12 nguồn thật qua connector đã được người dùng kết nối: 10 Threads và 2 TikTok. Payload nguồn nằm ngoài repository. Không tạo nguồn minh họa trong database thật; SQL verification dùng giao dịch ROLLBACK. Facebook báo locked ở lần kiểm tra; không thay đổi gói hoặc kết nối.

V1 chưa có cron, phân trang toàn bộ lịch sử, tự gán chủ đề bằng AI, tổng hợp kết luận tự duyệt, lưu video hoặc sao chép file lâu dài. Khi có khóa Buffer của website, nút Lấy bài mới hoạt động; khi chưa có, giao diện ghi Chờ kết nối Buffer. API metrics còn tùy khả năng nền tảng/Buffer, không phải thống kê doanh thu được kiểm chứng.

Kiểm tra: 28 test Knowledge/helper/provider/route, production build, SQL verification quyền/danh tính/idempotency/freshness/version/source/archive, desktop và mobile 390px. Chạy file verification chỉ sau migration; không chạy lại migration đã áp dụng.

Ngày 2026-10-11: migration 0083 và 12 nguồn thật đã được áp dụng nguyên tử qua SQL Editor. Kiểm tra DDL + verification trước đó chạy trong giao dịch ROLLBACK, trả PASS. Không chạy lại migration. Kiểm tra trình duyệt local đã lưu bài minh họa vào chủ đề/góc, cập nhật bộ đếm và kiểm tra 390px không tràn ngang; fixture chỉ nằm trong bộ nhớ. Kiểm tra live và commit phát hành được ghi trong bản bàn giao.

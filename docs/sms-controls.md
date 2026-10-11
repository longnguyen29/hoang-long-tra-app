# SMS vận đơn: gửi và kiểm tra từ web

Trong Order book, mở đơn và bấm **SMS vận đơn** ở đầu chi tiết để đến nội dung, số nhận và các nút điều khiển. Web và trình duyệt trên điện thoại dùng cùng bộ gửi Android đã cấu hình; nút này không cần mở ứng dụng Tin nhắn của máy đang thao tác.

- **Kiểm tra trạng thái** chỉ tra cổng SMS, không gửi tin mới. Nó kiểm tra SMS vận đơn, nhắc thanh toán và hỏi phản hồi mẫu gắn với đơn.
- **Gửi SMS ngay / Thử gửi lại** yêu cầu quản lý xác nhận nội dung và lý do. Cho phép bỏ thời gian chờ ba giờ hoặc gửi ngoài bước Giao hàng với lý do, nhưng không thay đổi trạng thái đơn hay bỏ Procedure Run.
- **Gửi lại SMS** yêu cầu lý do và xác nhận khách có thể nhận thêm tin. Cổng SMS còn báo đang xếp hàng/xử lý thì không gửi thêm. Hãng, mã vận đơn và số nhận phải còn hợp lệ trên dữ liệu mới nhất.
- SMS được cổng tiếp nhận chỉ có nghĩa **Đã xếp hàng gửi**. **Thiết bị báo đã gửi** là gửi tới nhà mạng; **Nhà mạng báo đã nhận** là báo cáo giao SMS, không phải khách đã đọc.
- Mất kết nối sau khi gửi yêu cầu có thể chưa rõ kết quả. App giữ trạng thái đó để kiểm tra trước khi gửi tiếp. Tự thử sau ba giờ chỉ áp dụng khi có căn cứ tin chưa được gửi; không tự nhân bản tin đã gửi hoặc chưa rõ kết quả.

Lịch sử từng đơn lưu trạng thái cổng, thời gian xác nhận, lỗi kiểm tra và số lần thử. Yêu cầu thủ công lưu người yêu cầu, lý do và xác nhận trước đó trong lịch sử đơn. Bảng tình trạng dịch vụ tính cả ba loại SMS, với giới hạn các bản ghi gần nhất được nêu rõ.

Migration 0082 bổ sung bằng chứng gửi/nhận và khoá xử lý vào các bảng SMS đang có. Không tạo hệ thống SMS riêng, không đưa thông tin cổng vào client, không đổi `sample_followups.sent_at` (ngày gửi bộ mẫu), không gửi tin khách chỉ vì mở trang.

Nguồn giao thức: https://docs.sms-gate.app/features/status-tracking/ và https://docs.sms-gate.app/features/sending-messages/ .

Áp dụng migration 0082 trước khi đưa giao diện này lên production. Thay đổi đơn vị trên đơn cũ ở PR #31 vẫn cần migration 0081 và triển khai riêng trước đó.

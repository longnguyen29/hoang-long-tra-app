# Trà đối tác tuyển chọn — vận hành phiên bản đầu

Hoàng Long tiếp nhận đơn và thanh toán trong quy trình cửa hàng hiện có. Bên cung ứng trao đổi qua Zalo; trang web không tự gửi lời mời, công bố trà hay tạo thỏa thuận. Không có sản phẩm, đối tác, kết quả thử hoặc giấy chứng nhận mẫu được tự tạo.

## Cách dùng sau khi cài schema và triển khai

1. Trong **Website & sản phẩm → Danh mục**, tạo trà và gắn nhà cung cấp; sản phẩm mới mặc định ẩn. Với trà đối tác mới, giữ chọn ô “Trà đối tác” để đăng ký an toàn ngay khi lưu (chỉ quản lý). Nhập giá, quy cách và tồn đúng thực tế. Tạo/đối chiếu lô trong **Vận hành**, liên kết lô với đúng SKU, ghi mã lô khớp hồ sơ danh mục và tên người sản xuất; lô tham chiếu phải ở trạng thái đã phát hành.
2. Trong **Website & sản phẩm → Trà đối tác**, quản lý chọn SKU; nếu chưa đăng ký trong lúc tạo, xác nhận đăng ký trà đối tác. Đăng ký sẽ ẩn SKU, kể cả SKU trước đó đang bán; không tự thay đổi giá/tồn/đơn đã có. Chỉ đăng ký sản phẩm thật sự là trà của đối tác.
3. Chọn lô mình đã trực tiếp thử, nhập ngày và ghi chú có thể công khai. Xác nhận riêng việc đã thử trà và quyền công khai đúng tên nhà cung cấp, người sản xuất. Duyệt không tự bật bán; sau khi kiểm tra các điều kiện thương mại, chủ động bật trong Danh mục.
4. Cửa hàng hiện phần tuyển chọn, dấu và thông tin mẫu/lô tham chiếu được duyệt. Khách tiếp tục đặt hàng và thanh toán cho Hoàng Long. Dấu là đánh giá cảm quan, không phải kiểm nghiệm hoặc bảo đảm lô giao; phải tự đối chiếu lô thực tế.
5. Thu hồi trong Trà đối tác sẽ ẩn sản phẩm. Thay đổi thông tin định danh lô hoặc nhà cung cấp sẽ thu hồi lựa chọn; phải thử và duyệt lại. Xung đột do thay đổi đồng thời yêu cầu tải lại trước khi thao tác.

## Giới hạn

- Chặn bán chưa duyệt áp dụng cho SKU **đã đăng ký** là trà đối tác. Các SKU cũ chưa đăng ký vẫn theo luồng danh mục cũ; hệ thống không thể tự suy đoán nhà cung cấp nào là trà của đối tác. Khi tạo trà đối tác, phải giữ ẩn và đăng ký trước khi bật bán.
- Hệ thống không tự kiểm tra quyền sử dụng tên/ảnh hay giấy chứng nhận. Người duyệt xác nhận trước khi công khai. Việc tạo lô hay đánh giá cảm quan không chứng minh lô được phân bổ vào đơn hàng.
- Nhà cung cấp chưa có tài khoản tự đăng bán, cổng đối soát hoặc thanh toán tự động. Việc mua đứt/ký gửi, giá cung ứng, tồn thực tế, giao hàng và đổi trả vẫn thỏa thuận và xử lý thủ công.
- Lịch sử hiển thị 200 quyết định gần nhất trên hệ thống và quyết định mới nhất của mỗi SKU, không phải toàn bộ lịch sử. Giữ dữ liệu gốc, không tự xóa quyết định.
- Mục tuyển chọn gọi RPC riêng; nếu chưa cài schema hoặc RPC lỗi, cửa hàng chính vẫn hoạt động và không tự gắn dấu.

## Database

`0097_curated_partner_teas.sql` là migration mới, thêm bảng quyết định, RPC và các chốt cho SKU đã đăng ký; không khởi tạo sản phẩm/đối tác hoặc thay đổi giá/tồn/đơn. Đối chiếu migration đã áp dụng và schema thật trước khi áp dụng; không chạy lại các migration cũ. Kiểm tra bằng `tests/curated-partner/run-disposable.sh` và `tests/curated-supabase/run.sh` ở môi trường tạm với dữ liệu giả. Kiểm thử cục bộ không thay thế kiểm tra bản production.

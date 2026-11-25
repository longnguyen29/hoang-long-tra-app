# Hồ sơ chứng từ khách doanh nghiệp

1. Mở **Bán hàng → Khách hàng**, chọn hồ sơ và bật **Khách doanh nghiệp**. Lưu tên pháp nhân, địa chỉ đăng ký, mã số thuế và người ký một lần trong **Thông tin xuất chứng từ**.
2. Bấm **Tạo đơn B2B** hoặc mở đơn đã có. Kiểm tra khách đứng tên, chọn pháp nhân bán và xác nhận thuế suất VAT cho giao dịch. Khai báo riêng thông tin pháp lý và tài khoản nhận tiền của từng pháp nhân tại **Tài liệu công ty → Pháp nhân bán**.
3. Mở bước tiếp theo từ checklist. Soạn, lưu và xuất bản nháp từ Tài liệu công ty. Sau khi ký hoặc phát hành ở ngoài hệ thống, tải bản thực tế lên để hoàn tất. Hóa đơn VAT cần số hóa đơn và ngày phát hành.
4. Mở **Tiến độ hồ sơ B2B** trên trang Khách hàng để xem đơn còn việc, đơn cần chú ý và đơn đã đủ chứng từ. Các đơn cũ đã hoàn tất trước khi có tính năng có thể mở checklist từ Order Book khi cần bổ sung hồ sơ.

Hợp đồng nguyên tắc được lưu theo khách và pháp nhân bán. Một đơn dùng lại hợp đồng còn hiệu lực thuộc đúng hai bên. Sau khi hoàn tất hồ sơ, đơn giữ liên kết hợp đồng đã dùng, kể cả khi hợp đồng hết hạn. Ba chứng từ còn lại được lưu riêng theo đơn. Phiên bản đã ký hoặc phát hành được giữ lại.

Thuế suất áp dụng theo đơn. Nhập 8% khi giao dịch sử dụng mức này. Nếu giá trị đơn khác tổng dòng hàng hoặc đơn lấy giá bán lẻ, xác nhận tiền hàng trước VAT trong bản soạn. Mã hàng và tên thương mại giữ nguyên trong danh mục. Tên Trà đen OP1, Trà đen OP và Trà Nhài được điền vào phần chứng từ tương ứng.

## Vận hành

- Migration `0111_b2b_customer_workflow.sql` khởi tạo checklist cho đơn đủ điều kiện. Liên kết CRM ưu tiên đối chiếu thủ công, rồi báo giá/tài khoản sỉ, rồi liên hệ trùng duy nhất. Đơn khớp mơ hồ cần xác nhận khách.
- Quản lý/admin trong mô-đun phù hợp có thể truy cập hồ sơ. File lưu trong bucket Supabase riêng tư, giới hạn 10 MB, chỉ có liên kết tải có thời hạn sau khi kiểm tra quyền. Mẫu, giá chốt, danh tính và thông tin ngân hàng được lưu phía quản trị. Cấu hình pháp nhân không nằm trong mã nguồn.
- Các bản mẫu tham khảo bố cục hợp đồng và biên bản Word Green Hill – Legend Tea. Điều khoản và số liệu do người lập kiểm tra theo giao dịch. Hệ thống ghi nhận hóa đơn đã phát hành, không kết nối đơn vị phát hành hóa đơn.
- Checklist chứng từ và Quy trình đơn B2B quản lý hai việc riêng. Tiến độ checklist không tự thay đổi giao hàng, thanh toán, công nợ hoặc thông báo khách.

## Kiểm tra nội bộ

- Gắn một khách thử vào đơn B2B, chọn từng bên bán và xác nhận giá trước thuế. Thử VAT 8% và một thuế suất khác.
- Lưu bản nháp, tải lại trang, xuất PDF rồi tải file thử lên. Hóa đơn thiếu số, ngày phát hành hoặc file phải bị từ chối.
- Đủ bốn bước thì đơn chuyển sang hoàn tất hồ sơ. Đơn mới của cùng khách và pháp nhân dùng lại hợp đồng trong thời hạn. Dùng pháp nhân khác thì cần hợp đồng tương ứng.
- Kiểm tra tài khoản nhân viên và phiên chưa đăng nhập không đọc được chứng từ.

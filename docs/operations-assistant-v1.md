# Trợ lý vận hành V1

Tại `/admin/assistant`, quản lý có thể dán tối đa 12.000 ký tự và chủ động phân tích. Nội dung được gửi tới OpenAI Responses API, không lưu nguyên chat trong cơ sở dữ liệu; dữ liệu có thể được OpenAI xử lý theo chính sách API. Kết quả là đề xuất, cần người dùng đối chiếu.

Quản lý sửa bản nháp, lưu từng việc vào `dashboard_plans` của chính mình hoặc chuyển thông tin khách và ghi chú trà sang biểu mẫu tạo đơn hiện có. Việc mở biểu mẫu không tạo đơn; người dùng chọn loại đơn, sản phẩm, giá và thanh toán, sau đó xem lại trước khi lưu. Chưa tự dò trùng khách/đơn, tạo hồ sơ khách/mẫu trong CRM, tạo vận đơn, gửi tin, tạo hợp đồng hoặc chuyển dữ liệu cho kế toán.

Giới hạn: 10 lượt/người/giờ và 100 lượt/toàn hệ thống/ngày, tính cả lần thất bại sau khi đặt chỗ. Cơ sở dữ liệu lưu người dùng, model, thời gian và số token, không lưu nội dung chat; lượt lỗi có thể ghi số token 0 và không phản ánh chính xác chi phí. Hạn mức lượt không thay thế hạn mức tiền thực tế. Không tính tự động ngày tương đối chưa rõ; người dùng chọn ngày.

Cấu hình server cần `OPENAI_API_KEY`; tùy chọn `OPENAI_ASSISTANT_MODEL` (mặc định `gpt-6-luna`), và cấu hình Supabase server hiện có. Cần áp dụng `supabase/migrations/0098_assistant_ai_rate_limit.sql` đúng một lần sau khi kiểm tra cấu trúc và quyền. Hệ thống từ chối gọi AI nếu không đặt chỗ hạn mức được. Không đưa khóa xuống trình duyệt.

Kiểm tra cục bộ: `node --test tests/assistant-extract.test.mjs tests/assistant-order-draft.test.mjs`; `bash tests/assistant-rate-limit/run.sh` tạo PostgreSQL tạm với dữ liệu giả và kiểm tra đồng thời. Cần kiểm tra riêng cấu hình model/key, phân quyền và thao tác đăng nhập trên môi trường thực.

# Trung tâm kiến thức V1

Trung tâm tại `/admin/knowledge` nối **chủ đề → góc khai thác → bài & kết quả**, theo hai miền Trà và Kinh doanh. Có cây nhánh, danh sách, tìm kiếm tiếng Việt, lọc trạng thái, chủ đề con, nguồn HTTPS và bước tiếp theo. Admin/quản lý có thể đọc và sửa nội dung, nối bài Growth Lab, ghi bài ngoài hệ thống, nhập số liệu và tạo việc cá nhân trong Hôm nay. Bản nháp nhập được giữ khi đóng hoặc lưu lỗi.

## Dữ liệu và quyền sở hữu

Migration `0076_knowledge_centre.sql` tạo:

- `knowledge_topics`: quan hệ cha/con cùng miền, nội dung, nguồn, trạng thái `draft/reviewed/archived`, liên kết ghi nhớ công ty đã duyệt và bước tiếp theo.
- `knowledge_angles`: chủ đề, người đọc, hook, ghi chú, bước tiếp theo, trạng thái `idea/research/drafting/ready/archived`.
- `knowledge_posts`: quan hệ chủ đề/góc, trạng thái `active/archived`, bài ngoài hoặc `growth_variant_id` duy nhất. Bài ngoài sở hữu URL, ngày, kênh, số liệu và cách đo. Liên kết Growth chỉ sở hữu quan hệ; metadata và số liệu lấy từ bản Growth gốc.

Ghi nhớ công ty giữ nguồn gốc và quy trình duyệt hiện có. Chủ đề có ghi nhớ liên kết đọc nội dung của ghi nhớ **hiện còn được duyệt**; không dùng nội dung chủ đề cũ bị ẩn. Duyệt chủ đề không tự duyệt ghi nhớ.

RPC `knowledge_centre_snapshot()` trả `{topics,angles,posts,memory_items,growth}`. Growth bắt đầu từ snapshot hiện có và thêm các thử nghiệm lưu kho được bài kiến thức tham chiếu, cùng số liệu chuẩn, để giữ lịch sử.

RPC ghi `save_knowledge_topic`, `save_knowledge_angle`, `save_knowledge_post` dùng `(p_id, p_fields, p_expected_version)`, trả hàng đã lưu. Tạo dùng ID/version `null`; sửa là patch với version dự kiến. Lỗi `knowledge_topic_conflict`, `knowledge_angle_conflict`, `knowledge_post_conflict` giữ nội dung nhập để so sánh trước khi lưu lại. RPC kiểm tra quyền quản lý, trường cho phép, quan hệ, chu trình, nguồn và số liệu; không cấp quyền ghi bảng trực tiếp hay xóa lịch sử.

## Đọc số liệu

Chỉ bài có URL và ngày đăng hợp lệ, không nằm trong tương lai, được cộng vào lịch sử. Bài ngoài nhập ngày nên so sánh ngày lịch Việt Nam; Growth so sánh thời điểm chính xác và còn phải có trạng thái `published`, `paused` hoặc `reviewed`. Bản nháp/sẵn sàng không được tính là đã đăng. Lưu kho bài, góc hay chủ đề không xóa lịch sử. Tổng mặc định gồm bài lưu kho và có `archivedPosts`; `includeArchived:false` chỉ dùng khi muốn phạm vi bài đang hoạt động rõ ràng.

Các bản ghi trùng Growth ID hoặc đường dẫn được tính một lần, vẫn giữ quan hệ với tất cả chủ đề/góc. Growth là nguồn chuẩn khi trùng với bài ngoài. `duplicate_note` và `suppressed_records` giải thích số liệu bản ghi nào không được cộng; hàng gốc vẫn được giữ để đối chiếu.

Mỗi metric có `{total,known,unknown,count,complete}`. `total:null` là chưa có số được biết; `total:0` là số 0 đã ghi nhận. Tổng có dữ liệu thiếu chỉ cộng phần đã biết và hiển thị độ phủ. Số đếm phải nguyên, tiền cho phép thập phân, phạm vi 0–10¹⁵. Ô trống trong Growth trả về chưa biết; nhập 0 lưu 0.

- **Nền tảng:** views, likes, comments, shares, clicks. Với Threads, comments lấy replies và shares lấy reposts; quotes không tự cộng vào shares. Lượt xem cộng nhiều nền tảng không phải người xem duy nhất.
- **Theo dõi Growth:** visitors, qualified_requests, samples_sent, sample_requests_with_order. Visitors là tổng theo từng link và có thể trùng người giữa bài. `first_orders` hiện có chỉ là số yêu cầu mẫu có đơn khớp số điện thoại về sau; không phải số đơn chính xác hay bằng chứng nhân quả.
- **Nhập tay:** leads, orders, revenue, spend của bài ngoài giữ riêng với funnel theo dõi, không cộng hai nguồn thành một tổng bán hàng.

Tỷ lệ funnel chỉ hiện khi các cặp số cùng phạm vi đều được biết và mẫu số ít nhất 20; còn thiếu hoặc mẫu số nhỏ trả về chưa biết.

## Growth Lab và giới hạn V1

`/admin/growth?topic=<uuid>&angle=<uuid>` đọc tham số sau khi mount, tải kiến thức và mở brief mới. Ngữ cảnh và nguồn nằm trong phần đọc tham khảo; chỉ nội dung đã rà soát mới điền vào bằng chứng. Kiến thức nháp hoặc ghi nhớ không còn được duyệt không điền vào bằng chứng. Không tự điền offer, CTA hay giả thuyết; việc nội bộ không được biến thành CTA cho khách. Người dùng chọn bằng chứng đã kiểm tra, người đọc, vấn đề, đề nghị và CTA trước khi tạo. Dữ liệu đến muộn không ghi đè brief đã nhập.

Sau khi tạo thử nghiệm và variants, chỉ phiên tạo từ chủ đề/góc mới tạo liên kết Knowledge bằng ID variant. Nếu một số liên kết lỗi, thử nghiệm đã tạo vẫn được mở và thông báo rõ cần nối các bản đã có; không tạo lại thử nghiệm. `?experiment=<uuid>` chọn thử nghiệm sau khi tải; `?variant=<uuid>` chọn thử nghiệm tương ứng và cuộn tới bài. Bài thuộc thử nghiệm lưu kho được đọc qua snapshot Knowledge, kể cả khi làm mới số liệu.

V1 có số liệu insight nhập tay, không kết nối API nền tảng, không tự đăng, không tự tổng hợp kiến thức bằng AI và không tự đổi prompt/nguồn đã duyệt. AI Growth tiếp tục chỉ tạo bản nháp để người phụ trách kiểm tra. V2 có thể mở rộng insight và nguồn dữ liệu sau khi xác định phạm vi/cách đo; không mặc định quy đổi tương tác thành doanh thu.

## Kiểm tra và triển khai

**14 test đạt**: 8 Knowledge helper và 6 Growth hiện có. Các trường hợp tập trung: cây có chu trình/orphan, tìm kiếm dấu tiếng Việt, gộp bài trùng, độ phủ thiếu/0, bài paused/reviewed/lưu kho, ngày đăng tương lai/ngày lịch Việt Nam, tách nhập tay với funnel và brief dùng ghi nhớ đã duyệt. Production build đạt.

Kiểm tra trình duyệt desktop và 390px trên `/ui-review/knowledge`: chọn nhánh mở chi tiết trên mobile, sửa bài/ngày đăng/0-vs-chưa-biết, lưu kho giữ số bài trong lịch sử, ghim Hôm nay tránh trùng, lưu lỗi giữ bản nhập, brief giữ nội dung nháp ngoài bằng chứng, tạo 3 variants từ mẫu có sẵn và tự nối vào chủ đề nhưng không cộng vào bài đã đăng. Route minh họa chỉ mở trong development, dùng dữ liệu trong bộ nhớ; không dùng production hoặc API trả phí.

Migration **0076 đã áp dụng production ngày 2026-10-08** qua Supabase SQL Editor. `scripts/verify-knowledge-centre.sql` đã chạy đạt trên database thật: catalog/RLS/grants, ghi bằng quyền authenticated manager, audit/version, conflict, cycle, canonical metadata, archive, snapshot và chặn chưa đăng nhập. Toàn bộ bản thử được **ROLLBACK**; không lưu dữ liệu minh họa vào database thật.

Phát hành từ nhánh `codex/knowledge-centre`: push/merge vào `main`, chờ Vercel production READY rồi kiểm tra `/admin/knowledge` trên live. Quyền mạng của phiên Codex đã được mở lại ngày 2026-10-08; Git CLI kết nối GitHub bằng đăng nhập Keychain hiện có. Không chạy lại migration 0076. Không có đợt gọi AI có phí, gửi Telegram hoặc đăng nội dung xã hội trong lần này.

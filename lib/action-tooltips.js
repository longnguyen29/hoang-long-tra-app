const hint = (en, vi) => ({ en, vi });

const VIEW_RULES = [
  {
    path: /^\/admin$/,
    test: /^(owner|chủ doanh nghiệp)$/iu,
    text: hint(
      "Reframe Morning Desk around cash, revenue, budget, and owner-level exceptions.",
      "Chuyển Bàn ngày sang tiền mặt, doanh thu, ngân sách và các ngoại lệ cần chủ doanh nghiệp quyết định.",
    ),
  },
  {
    path: /^\/admin$/,
    test: /^(business development|phát triển đối tác)$/iu,
    text: hint(
      "Reframe Morning Desk around due follow-ups, quotations, reorders, and unread conversations.",
      "Chuyển Bàn ngày sang các lượt theo đuổi đến hạn, báo giá, nhịp đặt lại và hội thoại chưa đọc.",
    ),
  },
  {
    path: /^\/admin$/,
    test: /^(operations|vận hành)$/iu,
    text: hint(
      "Reframe Morning Desk around open orders, blocked work, overdue receivables, and available budget.",
      "Chuyển Bàn ngày sang đơn đang mở, việc bị chặn, công nợ quá hạn và ngân sách còn dùng được.",
    ),
  },
  {
    path: /^\/admin\/operations$/,
    test: /^(owner|chủ doanh nghiệp)$/iu,
    text: hint(
      "Show 30-day revenue, collections, receivables, known margin, and today's operating exceptions.",
      "Xem doanh thu, tiền đã thu, công nợ, biên gộp đã xác định trong 30 ngày và ngoại lệ hôm nay.",
    ),
  },
  {
    path: /^\/admin\/operations$/,
    test: /^(receivables|công nợ)$/iu,
    text: hint(
      "Show issued receivables, overdue balances, payment terms, and controls for recording collection.",
      "Xem công nợ đã phát hành, khoản quá hạn, điều khoản thanh toán và thao tác ghi nhận thu tiền.",
    ),
  },
  {
    path: /^\/admin\/operations$/,
    test: /^(tea batches & quality|lô & chất lượng)$/iu,
    text: hint(
      "Show tea batches, quality notes, available stock, reservations, and the orders using each batch.",
      "Xem lô trà, ghi chú chất lượng, tồn khả dụng, lượng giữ chỗ và các đơn đang dùng từng lô.",
    ),
  },
  {
    path: /^\/admin\/operations$/,
    test: /^(plan|planning|kế hoạch)$/iu,
    text: hint(
      "Show the 30-day preparation plan from demand, available stock, and partner reorder timing.",
      "Xem kế hoạch chuẩn bị 30 ngày dựa trên nhu cầu, tồn khả dụng và nhịp đặt lại của đối tác.",
    ),
  },
  {
    path: /^\/admin\/control$/,
    test: /^(reports|báo cáo)$/iu,
    text: hint(
      "Show monthly sales, wholesale volume, payment mix, VAT estimates, and CSV export.",
      "Xem doanh thu tháng, sản lượng sỉ, cơ cấu thanh toán, VAT ước tính và xuất CSV.",
    ),
  },
  {
    path: /^\/admin\/control$/,
    test: /^(partners|đối tác)$/iu,
    text: hint(
      "Show wholesale accounts awaiting approval, partner codes, contacts, and reorder cadence.",
      "Xem tài khoản sỉ chờ duyệt, mã đối tác, liên hệ và nhịp đặt lại.",
    ),
  },
  {
    path: /^\/admin\/control$/,
    test: /^(promotions|offers|ưu đãi)$/iu,
    text: hint(
      "Show promotion codes, discount rules, owners, active dates, and pause controls.",
      "Xem mã ưu đãi, quy tắc giảm giá, người phụ trách, thời gian áp dụng và thao tác tạm dừng.",
    ),
  },
  {
    path: /^\/admin\/control$/,
    test: /^(reviews|đánh giá)$/iu,
    text: hint(
      "Show customer testimonials and product reviews waiting for moderation.",
      "Xem lời khách và đánh giá sản phẩm đang chờ kiểm duyệt.",
    ),
  },
  {
    path: /^\/admin\/control$/,
    test: /^(payment|thanh toán)$/iu,
    text: hint(
      "Show the bank account and VietQR details customers receive after ordering.",
      "Xem tài khoản ngân hàng và thông tin VietQR khách nhận sau khi đặt hàng.",
    ),
  },
  {
    path: /^\/admin\/control$/,
    test: /^(restore|khôi phục)$/iu,
    text: hint(
      "Show recently deleted records that are still inside the recovery window.",
      "Xem các bản ghi mới xóa vẫn còn trong thời hạn khôi phục.",
    ),
  },
  {
    path: /^\/admin\/house$/,
    test: /^(catalogue|catalog|danh mục)$/iu,
    text: hint(
      "Show products, public prices, stock, pack variants, and live sale visibility.",
      "Xem sản phẩm, giá công khai, tồn kho, quy cách và trạng thái đang bán trên website.",
    ),
  },
  {
    path: /^\/admin\/house$/,
    test: /^(regions & people|vùng & người)$/iu,
    text: hint(
      "Show supplier and origin profiles, crops, private contacts, stories, and provenance photos.",
      "Xem hồ sơ vùng và nhà cung cấp, nông sản, liên hệ nội bộ, câu chuyện và ảnh nguồn gốc.",
    ),
  },
  {
    path: /^\/admin\/house$/,
    test: /^(content|nội dung)$/iu,
    text: hint(
      "Show bilingual House stories, tea articles, and gallery captions published on the website.",
      "Xem câu chuyện về Nhà, bài đọc về trà và chú thích thư viện đang hiển thị song ngữ trên website.",
    ),
  },
  {
    path: /^\/admin\/house$/,
    test: /^(house profile|hồ sơ nhà)$/iu,
    text: hint(
      "Show the representative, homepage photos, origin evidence, quote, and public House statistics.",
      "Xem người đại diện, ảnh trang chủ, bằng chứng nguồn gốc, lời dẫn và số liệu công khai của Nhà.",
    ),
  },
];

const ROUTE_HINTS = [
  {
    test: /^\/admin$/,
    text: hint(
      "Open Morning Desk: today's priorities, exceptions, operating signals, and company memory.",
      "Mở Bàn ngày: ưu tiên hôm nay, ngoại lệ, tín hiệu vận hành và trí nhớ công ty.",
    ),
  },
  {
    test: /^\/admin\/orders#queue$/,
    text: hint(
      "Jump to the shared queue of new orders, leads, sample requests, and tea appointments needing action.",
      "Đi tới hàng đợi chung gồm đơn mới, lead, yêu cầu mẫu và lịch trà đang cần xử lý.",
    ),
  },
  {
    test: /^\/admin\/orders#orders$/,
    text: hint(
      "Jump to the order book with customer, value, fulfilment status, and order details.",
      "Đi tới sổ đơn với khách hàng, giá trị, trạng thái thực hiện và chi tiết từng đơn.",
    ),
  },
  {
    test: /^\/admin\/orders#messages$/,
    text: hint(
      "Jump to customer conversations, unread messages, and the reply panel.",
      "Đi tới hội thoại khách hàng, tin chưa đọc và bảng phản hồi.",
    ),
  },
  {
    test: /^\/admin\/orders#contacts$/,
    text: hint(
      "Jump to new leads, sample fulfilment, and tea-session confirmations.",
      "Đi tới lead mới, xử lý mẫu thử và xác nhận lịch trà.",
    ),
  },
  {
    test: /^\/admin\/orders(?:$|\?)/,
    text: hint(
      "Open order coordination: the shared queue, order book, customer messages, relationships, and customer history.",
      "Mở Điều phối đơn: hàng đợi chung, sổ đơn, tin nhắn, quan hệ và lịch sử khách hàng.",
    ),
  },
  {
    test: /^\/admin\/pipeline(?:$|\?)/,
    text: hint(
      "Open CRM: B2B opportunities, next follow-up dates, private pricing, quotations, and conversion to orders.",
      "Mở CRM: cơ hội B2B, ngày theo đuổi tiếp theo, giá riêng, báo giá và chuyển thành đơn.",
    ),
  },
  {
    test: /^\/admin\/operations\/expenses(?:$|\?)/,
    text: hint(
      "Open the quick-expense inbox to capture a payment now and classify it into an approved budget later.",
      "Mở hộp khoản chi để ghi tiền vừa chi ngay và phân loại vào ngân sách được duyệt sau.",
    ),
  },
  {
    test: /^\/admin\/operations\/budget(?:$|\?)/,
    text: hint(
      "Open budget control: periods, envelopes, allocation approvals, commitments, payments, and outcomes.",
      "Mở quản lý ngân sách: kỳ, phong bì, duyệt phân bổ, cam kết, thanh toán và kết quả.",
    ),
  },
  {
    test: /^\/admin\/operations\/pricing(?:$|\?)/,
    text: hint(
      "Open the pricing workspace to calculate true cost, safe floors, B2B prices, retail prices, and margin before applying anything.",
      "Mở phòng tính giá để tính giá vốn thật, sàn an toàn, giá B2B, giá bán lẻ và biên lợi nhuận trước khi áp dụng.",
    ),
  },
  {
    test: /^\/admin\/operations(?:$|\?)/,
    text: hint(
      "Open operations: revenue, receivables, reorder signals, stock, tea batches, and preparation plans.",
      "Mở Vận hành: doanh thu, công nợ, tín hiệu đặt lại, tồn kho, lô trà và kế hoạch chuẩn bị.",
    ),
  },
  {
    test: /^\/admin\/control(?:$|\?)/,
    text: hint(
      "Open commercial controls: monthly sales, partners, promotions, reviews, payment account, and recoverable records.",
      "Mở Thương mại: doanh thu tháng, đối tác, ưu đãi, đánh giá, tài khoản thanh toán và bản ghi có thể khôi phục.",
    ),
  },
  {
    test: /^\/admin\/house(?:$|\?)/,
    text: hint(
      "Open website management: catalogue, suppliers, bilingual content, images, and the public House profile.",
      "Mở quản lý website: danh mục, nhà cung cấp, nội dung song ngữ, hình ảnh và hồ sơ Nhà công khai.",
    ),
  },
  {
    test: /^\/admin\/legacy(?:$|\?)/,
    text: hint(
      "Open the full legacy console for older orders, contacts, catalogue tools, reports, and settings.",
      "Mở hệ thống cũ đầy đủ gồm đơn hàng, liên hệ, công cụ danh mục, báo cáo và cài đặt trước đây.",
    ),
  },
  {
    test: /^\/partners(?:$|\?)/,
    text: hint(
      "Open the partner portal with private prices, quotations, orders, receivables, and batch records.",
      "Mở cổng đối tác với giá riêng, báo giá, đơn hàng, công nợ và hồ sơ lô trà.",
    ),
  },
];

const RULES = [
  {
    test: /^(refresh|reload|làm mới|tải lại)/iu,
    text: hint(
      "Reload the latest saved data. No records are changed.",
      "Tải lại dữ liệu đã lưu mới nhất. Không thay đổi bản ghi.",
    ),
  },
  {
    test: /^(menu|ứng dụng|applications)$/iu,
    text: hint(
      "Open or close the navigation. Your current work stays on this page.",
      "Mở hoặc đóng điều hướng. Công việc hiện tại vẫn được giữ trên trang.",
    ),
  },
  {
    test: /^(sign out|log out|đăng xuất)$/iu,
    text: hint(
      "End this staff session and return to sign-in.",
      "Kết thúc phiên nhân viên và trở về màn hình đăng nhập.",
    ),
  },
  {
    test: /^(close notification|dismiss notification|đóng thông báo)$/iu,
    text: hint(
      "Dismiss this message. No business data is changed.",
      "Ẩn thông báo này. Không thay đổi dữ liệu kinh doanh.",
    ),
  },
  {
    test: /^(close|dismiss|cancel|đóng|hủy|×)(\s|$)/iu,
    text: hint(
      "Close this panel. Changes not yet saved will be discarded.",
      "Đóng bảng này. Các thay đổi chưa lưu sẽ bị bỏ.",
    ),
  },
  {
    test: /^(create order|create new order|tạo đơn|tạo đơn hàng mới)$/iu,
    text: hint(
      "Open a new order form. The order is created only after you review and save it.",
      "Mở biểu mẫu đơn mới. Đơn chỉ được tạo sau khi bạn kiểm tra và lưu.",
    ),
  },
  {
    test: /^(add here|thêm tại đây)$/iu,
    text: hint(
      "Open a new opportunity already assigned to this CRM stage. It enters the pipeline only after you save.",
      "Mở cơ hội mới đã gắn sẵn vào giai đoạn CRM này. Cơ hội chỉ vào pipeline sau khi bạn lưu.",
    ),
  },
  {
    test: /^(add opportunity|new opportunity|thêm cơ hội|cơ hội mới)$/iu,
    text: hint(
      "Open a blank CRM opportunity. Nothing enters the pipeline until you save it.",
      "Mở một cơ hội CRM trống. Chưa có gì vào pipeline cho đến khi bạn lưu.",
    ),
  },
  {
    test: /^(calculate price|tính giá)$/iu,
    text: hint(
      "Open the pricing workspace with this product selected; its live price and latest batch cost are prefilled when available.",
      "Mở phòng tính giá với sản phẩm này đã được chọn; giá đang bán và giá vốn lô mới nhất sẽ được điền khi có.",
    ),
  },
  {
    test: /^(calculate private price|tính giá riêng)$/iu,
    text: hint(
      "Open the pricing workspace with this partner selected so the result can become a controlled private-price version.",
      "Mở phòng tính giá với đối tác này đã được chọn để kết quả có thể trở thành một phiên bản giá riêng có kiểm soát.",
    ),
  },
  {
    test: /^(check margin|kiểm tra biên)$/iu,
    text: hint(
      "Open the pricing workspace in a new tab with this opportunity and first quotation line selected.",
      "Mở phòng tính giá trong tab mới với cơ hội và dòng sản phẩm đầu tiên của báo giá đã được chọn.",
    ),
  },
  {
    test: /^(choose a task for this slot|chọn việc cho vị trí này)$/iu,
    text: hint(
      "Open the priority editor below to name the task and choose its destination app. Nothing is saved until you select Set priority.",
      "Mở trình sửa ưu tiên bên dưới để đặt tên việc và chọn app đích. Chưa lưu cho đến khi bạn bấm Chốt ưu tiên.",
    ),
  },
  {
    test: /^(edit priority|sửa ưu tiên) \d+$/iu,
    text: hint(
      "Load this priority into the editor below so you can change its task or destination app before saving.",
      "Đưa ưu tiên này vào trình sửa bên dưới để đổi tên việc hoặc app đích trước khi lưu.",
    ),
  },
  {
    test: /^(create period|create budget period|tạo kỳ|tạo kỳ ngân sách)$/iu,
    text: hint(
      "Open a new budget period. If activated, it closes the current active period after saving.",
      "Mở kỳ ngân sách mới. Nếu kích hoạt, kỳ đang chạy sẽ đóng sau khi lưu.",
    ),
  },
  {
    test: /^(request allocation|request budget allocation|xin phân bổ|xin phân bổ ngân sách)$/iu,
    text: hint(
      "Request permission to spend from a budget envelope. It remains pending until approved.",
      "Xin quyền chi từ một phong bì ngân sách. Khoản này sẽ chờ cho đến khi được duyệt.",
    ),
  },
  {
    test: /^(add proposal|thêm đề xuất)$/iu,
    text: hint(
      "Start an allocation proposal for this objective. It will not affect available funds until approved.",
      "Tạo đề xuất phân bổ cho mục tiêu này. Ngân sách khả dụng chưa đổi cho đến khi được duyệt.",
    ),
  },
  {
    test: /^(quick expense|ghi chi nhanh)$/iu,
    text: hint(
      "Capture an expense with only an amount and description; budget classification can happen later.",
      "Ghi khoản chi chỉ với số tiền và nội dung; có thể phân loại ngân sách sau.",
    ),
  },
  {
    test: /^(classify|phân loại)$/iu,
    text: hint(
      "Choose an approved allocation and move this item from the inbox into the formal expense ledger.",
      "Chọn khoản phân bổ đã duyệt và chuyển dòng này từ hộp chờ sang sổ khoản chi chính thức.",
    ),
  },
  {
    test: /^(record expense|ghi khoản chi)$/iu,
    text: hint(
      "Record a planned, committed, or paid expense against an approved allocation.",
      "Ghi khoản dự kiến, cam kết hoặc đã thanh toán vào một phân bổ được duyệt.",
    ),
  },
  {
    test: /^(add product|thêm sản phẩm)$/iu,
    text: hint(
      "Open a blank catalogue record. The product appears only after you save it.",
      "Mở hồ sơ danh mục trống. Sản phẩm chỉ xuất hiện sau khi bạn lưu.",
    ),
  },
  {
    test: /^(add profile|thêm hồ sơ)$/iu,
    text: hint(
      "Open a new supplier or region profile. Nothing is published until you save it.",
      "Mở hồ sơ vùng hoặc nhà cung cấp mới. Chưa có gì được đăng cho đến khi bạn lưu.",
    ),
  },
  {
    test: /^(write article|viết bài)$/iu,
    text: hint(
      "Open a bilingual article draft. It is published to the website after saving.",
      "Mở bản nháp bài viết song ngữ. Bài sẽ lên website sau khi lưu.",
    ),
  },
  {
    test: /^(add image|add homepage image|replace image|thêm ảnh|thêm ảnh trang chủ|thay ảnh)/iu,
    text: hint(
      "Choose an image to upload. The website updates after the upload finishes.",
      "Chọn ảnh để tải lên. Website cập nhật sau khi tải ảnh hoàn tất.",
    ),
  },
  {
    test: /^(add variant|add line|add product line|thêm quy cách|thêm dòng)/iu,
    text: hint(
      "Add another editable row. It is saved together with the form.",
      "Thêm một dòng có thể chỉnh sửa. Dòng này được lưu cùng biểu mẫu.",
    ),
  },
  {
    test: /^(delete|remove|xóa|xoá|gỡ)/iu,
    text: hint(
      "Remove this record or row. A confirmation appears before permanent deletion when required.",
      "Xóa bản ghi hoặc dòng này. Hệ thống sẽ hỏi xác nhận trước khi xóa vĩnh viễn khi cần.",
    ),
  },
  {
    test: /^(edit|open profile|sửa|mở hồ sơ)/iu,
    text: hint(
      "Open this record for editing. Nothing changes until you save.",
      "Mở bản ghi để chỉnh sửa. Chưa có gì thay đổi cho đến khi bạn lưu.",
    ),
  },
  {
    test: /^(approve|duyệt)$/iu,
    text: hint(
      "Approve this record and move it into the active workflow.",
      "Duyệt bản ghi và đưa nó vào luồng công việc đang hoạt động.",
    ),
  },
  {
    test: /^(reject|không duyệt|từ chối)$/iu,
    text: hint(
      "Reject this request. It will no longer be available to spend or publish.",
      "Từ chối yêu cầu này. Khoản hoặc nội dung sẽ không được phép chi hay đăng.",
    ),
  },
  {
    test: /^(restore|khôi phục)$/iu,
    text: hint(
      "Restore this deleted record to its original area.",
      "Khôi phục bản ghi đã xóa về khu vực ban đầu.",
    ),
  },
  {
    test: /^(export|xuất csv)/iu,
    text: hint(
      "Download a CSV for the selected reporting period. No records are changed.",
      "Tải tệp CSV cho kỳ báo cáo đang chọn. Không thay đổi bản ghi.",
    ),
  },
  {
    test: /^(pin|ghim)$/iu,
    text: hint(
      "Add this exception to an empty priority slot on the morning desk.",
      "Ghim ngoại lệ này vào một vị trí ưu tiên còn trống trên Bàn ngày.",
    ),
  },
  {
    test: /^(mark complete|mark incomplete|đánh dấu hoàn tất|đánh dấu chưa xong)$/iu,
    text: hint(
      "Change only this priority’s completion status.",
      "Chỉ thay đổi trạng thái hoàn thành của ưu tiên này.",
    ),
  },
  {
    test: /^(set priority|chốt ưu tiên)$/iu,
    text: hint(
      "Save this task into the selected morning priority slot.",
      "Lưu việc này vào vị trí ưu tiên đã chọn trên Bàn ngày.",
    ),
  },
  {
    test: /^(send for review|đưa vào hộp duyệt)$/iu,
    text: hint(
      "Send this note to the review inbox. It becomes company memory only after approval.",
      "Đưa ghi nhận vào hộp duyệt. Nó chỉ thành trí nhớ công ty sau khi được duyệt.",
    ),
  },
  {
    test: /^(archive|lưu kho)$/iu,
    text: hint(
      "Archive this item so it leaves the active review inbox.",
      "Lưu kho mục này để đưa nó ra khỏi hộp duyệt đang hoạt động.",
    ),
  },
  {
    test: /^(copy|sao chép)$/iu,
    text: hint(
      "Copy the prepared text so you can paste it into a customer message.",
      "Sao chép nội dung đã chuẩn bị để bạn dán vào tin nhắn cho khách.",
    ),
  },
  {
    test: /^(send reply|gửi phản hồi)$/iu,
    text: hint(
      "Send this reply to the customer conversation now.",
      "Gửi ngay phản hồi này vào cuộc trò chuyện với khách.",
    ),
  },
  {
    test: /^(on sale|hidden|đang bán|đang ẩn)$/iu,
    text: hint(
      "Toggle whether this product is visible and available on the live website.",
      "Bật hoặc tắt việc hiển thị và bán sản phẩm này trên website đang chạy.",
    ),
  },
  {
    test: /^(pause|paused|stop|tạm dừng|dừng)/iu,
    text: hint(
      "Pause this active item. Its history is kept so it can be resumed later.",
      "Tạm dừng mục đang hoạt động. Lịch sử vẫn được giữ để có thể tiếp tục sau.",
    ),
  },
  {
    test: /^(create quotation|new quotation|tạo báo giá|báo giá mới)$/iu,
    text: hint(
      "Open a quotation draft using the current catalogue or agreed private prices.",
      "Mở bản nháp báo giá theo danh mục hoặc bảng giá riêng hiện tại.",
    ),
  },
  {
    test: /^(create quotation from price list|tạo báo giá từ bảng giá)$/iu,
    text: hint(
      "Open a quotation draft prefilled with this partner's active private prices and minimum quantities.",
      "Mở bản nháp báo giá đã điền giá riêng đang hiệu lực và số lượng tối thiểu của đối tác này.",
    ),
  },
  {
    test: /^(new version|set price|extend with a new version|phiên bản mới|thiết lập giá|gia hạn bằng phiên bản mới)$/iu,
    text: hint(
      "Open a new private-price version. Earlier quotations and orders keep their original prices.",
      "Mở phiên bản giá riêng mới. Báo giá và đơn cũ vẫn giữ nguyên mức giá trước đó.",
    ),
  },
  {
    test: /^(edit work cadence|sửa nhịp làm việc)$/iu,
    text: hint(
      "Open this opportunity's next action, follow-up date, owner, stage, potential, and notes for editing.",
      "Mở bước tiếp theo, ngày quay lại, người phụ trách, giai đoạn, tiềm năng và ghi chú của cơ hội để sửa.",
    ),
  },
  {
    test: /^(issue receivable|phát hành công nợ)$/iu,
    text: hint(
      "Create a receivable for an order that has not been invoiced yet, including its due date and payment terms.",
      "Tạo khoản phải thu cho một đơn chưa phát hành công nợ, gồm hạn thanh toán và điều khoản thu tiền.",
    ),
  },
  {
    test: /^(issue|phát hành)$/iu,
    text: hint(
      "Save this receivable against the selected order with its invoice number, issue date, due date, and payment terms.",
      "Lưu khoản phải thu cho đơn đã chọn cùng số chứng từ, ngày phát hành, hạn thanh toán và điều khoản thu tiền.",
    ),
  },
  {
    test: /^(record|ghi nhận)$/iu,
    text: hint(
      "Add this receipt to the receivable, update the outstanding balance, and keep its payment reference.",
      "Ghi khoản thu vào công nợ, cập nhật số dư còn phải thu và lưu mã tham chiếu thanh toán.",
    ),
  },
  {
    test: /^(link batch|link batch to order|gắn lô|gắn lô vào đơn)$/iu,
    text: hint(
      "Reserve the entered quantity from this tea batch for the selected order and make its cost traceable.",
      "Giữ số lượng đã nhập từ lô trà này cho đơn đã chọn và liên kết giá vốn để truy xuất.",
    ),
  },
  {
    test: /^(save memory|lưu ghi nhớ)$/iu,
    text: hint(
      "Save this private House note to the customer's profile; customers cannot see it.",
      "Lưu ghi nhớ nội bộ vào hồ sơ khách hàng; khách không nhìn thấy nội dung này.",
    ),
  },
  {
    test: /^(save payment information|lưu thông tin thanh toán)$/iu,
    text: hint(
      "Update the bank account and VietQR details shown to customers after checkout.",
      "Cập nhật tài khoản ngân hàng và thông tin VietQR hiển thị cho khách sau khi đặt hàng.",
    ),
  },
  {
    test: /^(save promotion|save offer|lưu ưu đãi)$/iu,
    text: hint(
      "Save this promotion code, discount percentage, owner, and active period for checkout validation.",
      "Lưu mã ưu đãi, phần trăm giảm, người phụ trách và thời gian áp dụng để kiểm tra khi khách đặt hàng.",
    ),
  },
  {
    test: /^(save partner|lưu đối tác)$/iu,
    text: hint(
      "Save this wholesale account's partner code, contact, reorder cadence, and preparation lead time.",
      "Lưu mã đối tác, liên hệ, nhịp đặt lại và thời gian chuẩn bị của tài khoản sỉ này.",
    ),
  },
  {
    test: /^(save batch profile|lưu hồ sơ lô)$/iu,
    text: hint(
      "Save this batch's origin, quantity, costs, processing, tasting notes, and traceability record.",
      "Lưu nguồn gốc, sản lượng, giá vốn, chế biến, ghi chú thử trà và hồ sơ truy xuất của lô.",
    ),
  },
  {
    test: /^(save house profile|lưu hồ sơ nhà)$/iu,
    text: hint(
      "Update the representative, bilingual quote, origin evidence, and public House statistics on the website.",
      "Cập nhật người đại diện, lời dẫn song ngữ, bằng chứng nguồn gốc và số liệu Nhà công khai trên website.",
    ),
  },
  {
    test: /^(save product|lưu sản phẩm)$/iu,
    text: hint(
      "Update this product's bilingual listing, public price, stock, image, supplier, and pack variants on the website.",
      "Cập nhật thông tin song ngữ, giá công khai, tồn kho, ảnh, nhà cung cấp và quy cách của sản phẩm trên website.",
    ),
  },
  {
    test: /^(save profile|lưu hồ sơ)$/iu,
    text: hint(
      "Save this origin or supplier profile, including its internal contact, bilingual story, and provenance image.",
      "Lưu hồ sơ vùng hoặc nhà cung cấp, gồm liên hệ nội bộ, câu chuyện song ngữ và ảnh nguồn gốc.",
    ),
  },
  {
    test: /^(save article|lưu bài viết)$/iu,
    text: hint(
      "Publish the edited Vietnamese and English title and body to the selected website section.",
      "Đăng tiêu đề và nội dung tiếng Việt, tiếng Anh vừa sửa lên chuyên mục website đã chọn.",
    ),
  },
  {
    test: /^(save caption|lưu chú thích)$/iu,
    text: hint(
      "Update this image's Vietnamese and English website captions without replacing the image.",
      "Cập nhật chú thích tiếng Việt và tiếng Anh trên website mà không thay tệp ảnh.",
    ),
  },
  {
    test: /^(save opportunity|lưu cơ hội)$/iu,
    text: hint(
      "Save this CRM relationship with its owner, stage, potential, next action, and follow-up date.",
      "Lưu quan hệ CRM cùng người phụ trách, giai đoạn, tiềm năng, bước tiếp theo và ngày quay lại.",
    ),
  },
  {
    test: /^(apply price version|áp dụng phiên bản giá)$/iu,
    text: hint(
      "Activate this partner's new private-price version and close the previous active version; old orders and quotations stay unchanged.",
      "Kích hoạt phiên bản giá riêng mới và đóng phiên bản đang dùng; đơn và báo giá cũ không thay đổi.",
    ),
  },
  {
    test: /^(save draft|lưu bản nháp)$/iu,
    text: hint(
      "Save this quotation as a draft with its validity, products, agreed prices, discount, and terms; it is not marked sent yet.",
      "Lưu báo giá ở trạng thái nháp cùng thời hạn, sản phẩm, giá đã chốt, chiết khấu và điều khoản; chưa đánh dấu đã gửi.",
    ),
  },
  {
    test: /^(save calculation|lưu bài tính)$/iu,
    text: hint(
      "Save this cost input and price ladder as a draft scenario. Live catalogue and partner prices are not changed.",
      "Lưu các chi phí và thang giá này thành một bài tính nháp. Giá danh mục và giá đối tác chưa thay đổi.",
    ),
  },
  {
    test: /^(apply retail price to catalogue|áp giá bán lẻ vào danh mục)$/iu,
    text: hint(
      "After confirmation, save this scenario and replace the selected product or pack's live public price with the calculated retail price.",
      "Sau khi xác nhận, lưu bài tính và thay giá công khai của sản phẩm hoặc quy cách đã chọn bằng giá bán lẻ vừa tính.",
    ),
  },
  {
    test: /^(create private-price version|tạo phiên bản giá riêng)$/iu,
    text: hint(
      "After confirmation, save this scenario and create a new versioned partner price while preserving earlier quotations and orders.",
      "Sau khi xác nhận, lưu bài tính và tạo phiên bản giá đối tác mới; báo giá và đơn cũ vẫn được giữ nguyên.",
    ),
  },
  {
    test: /^(create order from|tạo đơn từ)/iu,
    text: hint(
      "Convert the accepted quotation into an order using its agreed lines and prices.",
      "Chuyển báo giá đã đồng ý thành đơn với đúng sản phẩm và mức giá đã chốt.",
    ),
  },
];

const clean = (value = "") => value.replace(/\s+/g, " ").trim();

const routeFor = (href, pathname) => {
  if (!href) return "";
  try {
    const url = new URL(href, `https://hoanglong.local${pathname || "/"}`);
    return `${url.pathname}${url.hash}`;
  } catch {
    return "";
  }
};

const contextualHint = ({ label, pathname, contextId, inDialog, regionLabel }, locale, allowFallback = false) => {
  const region = clean(regionLabel);

  if (pathname === "/admin/operations") {
    const operationActions = [
      {
        test: /^(overdue receivables|công nợ quá hạn)$/iu,
        text: hint(
          "Open Receivables, where overdue balances can be reviewed and payments recorded.",
          "Mở Công nợ để xem các khoản quá hạn và ghi nhận thanh toán.",
        ),
      },
      {
        test: /^(expiring quotations|báo giá sắp hết hạn)$/iu,
        text: hint(
          "Keep the owner overview open; this number counts quotations near their validity deadline.",
          "Giữ nguyên góc nhìn chủ doanh nghiệp; con số này đếm các báo giá sắp hết hiệu lực.",
        ),
      },
      {
        test: /^(blocked orders|đơn đang bị chặn)$/iu,
        text: hint(
          "Keep the owner overview open; this number counts orders whose fulfilment cannot move forward.",
          "Giữ nguyên góc nhìn chủ doanh nghiệp; con số này đếm các đơn chưa thể tiếp tục thực hiện.",
        ),
      },
      {
        test: /^(price lists? (?:need|needs) review|bảng giá cần rà soát)$/iu,
        text: hint(
          "Keep the owner overview open; this number counts partner price lists whose review date is due.",
          "Giữ nguyên góc nhìn chủ doanh nghiệp; con số này đếm các bảng giá đối tác đã đến ngày rà soát.",
        ),
      },
    ];
    const action = operationActions.find((item) => item.test.test(label));
    if (action) return action.text[locale];
  }

  if (pathname === "/admin/operations/pricing") {
    if (/^(bar|thanh)$/iu.test(label)) {
      return hint(
        "Show cost allowance, channel fee, and retained profit as one continuous 100₫ revenue bar.",
        "Hiển thị phần chi phí, phí kênh và lợi nhuận giữ lại trên một thanh doanh thu 100đ liên tục.",
      )[locale];
    }
    if (/^(100 squares|100 ô)$/iu.test(label)) {
      return hint(
        "Show the same split as 100 individual squares, where each square represents 1₫ of every 100₫ in revenue.",
        "Hiển thị cùng cơ cấu bằng 100 ô riêng, mỗi ô tương ứng 1đ trong mỗi 100đ doanh thu.",
      )[locale];
    }
  }

  if (pathname === "/admin/orders") {
    if (allowFallback && contextId === "queue") {
      return hint(
        "Open this queue item's source details and handling action. New orders are marked read when opened.",
        "Mở chi tiết nguồn và thao tác xử lý của mục trong hàng đợi. Đơn mới sẽ được đánh dấu đã đọc khi mở.",
      )[locale];
    }
    if (allowFallback && contextId === "orders") {
      return hint(
        "Open this order's line items, payment method, current status, total, and next fulfilment step.",
        "Mở sản phẩm, cách thanh toán, trạng thái hiện tại, tổng tiền và bước thực hiện tiếp theo của đơn.",
      )[locale];
    }
    if (allowFallback && contextId === "messages") {
      return hint(
        "Open this conversation, mark it read, and show its message history and reply box.",
        "Mở hội thoại, đánh dấu đã đọc và hiển thị lịch sử tin nhắn cùng ô phản hồi.",
      )[locale];
    }
    if (contextId === "contacts") {
      if (/^(contacted|đã liên hệ)$/iu.test(label)) {
        return hint(
          "Mark this lead as contacted and remove it from the new-lead count.",
          "Đánh dấu lead đã được liên hệ và đưa khỏi số lead mới.",
        )[locale];
      }
      if (/^(sent|đã gửi)$/iu.test(label)) {
        return hint(
          "Mark this sample request as sent and remove it from the waiting count.",
          "Đánh dấu yêu cầu mẫu đã gửi và đưa khỏi số đang chờ.",
        )[locale];
      }
      if (/^(confirm|xác nhận)$/iu.test(label)) {
        return hint(
          "Confirm this tea appointment and remove it from the pending count.",
          "Xác nhận lịch trà này và đưa khỏi số đang chờ xác nhận.",
        )[locale];
      }
    }
    if (allowFallback && contextId === "customers") {
      return hint(
        "Open this customer's contact, order history, total spend, last order, and internal House note.",
        "Mở liên hệ, lịch sử đơn, tổng chi, đơn gần nhất và ghi nhớ nội bộ của Nhà về khách này.",
      )[locale];
    }
  }

  if (pathname === "/admin/pipeline") {
    if (/^(paused · \d+|tạm dừng · \d+)$/iu.test(label)) {
      return hint(
        "Show or hide paused opportunities while keeping their relationship history.",
        "Hiện hoặc ẩn các cơ hội đang tạm dừng; toàn bộ lịch sử quan hệ vẫn được giữ.",
      )[locale];
    }
    if (/^(move stage|chuyển giai đoạn)$/iu.test(region)) {
      const stage = label.replace(/\s+/g, " ").trim();
      return hint(
        `Move this opportunity to “${stage}” now. Its history and notes are kept.`,
        `Chuyển ngay cơ hội sang “${stage}”. Lịch sử và ghi chú vẫn được giữ.`,
      )[locale];
    }
    if (/^(quotations?|báo giá)$/iu.test(region)) {
      if (/^(sent|đã gửi)$/iu.test(label)) {
        return hint(
          "Mark this quotation as sent now; it will move into the awaiting-response state.",
          "Đánh dấu báo giá đã gửi ngay; báo giá sẽ chuyển sang trạng thái chờ phản hồi.",
        )[locale];
      }
      if (/^(accept|accepted|đồng ý|đã đồng ý)$/iu.test(label)) {
        return hint(
          "Mark this quotation as accepted so it becomes available to convert into an order.",
          "Đánh dấu báo giá đã được đồng ý để có thể chuyển thành đơn hàng.",
        )[locale];
      }
      if (/^(create order|tạo đơn)$/iu.test(label)) {
        return hint(
          "Create an order now from this accepted quotation, preserving its agreed products, quantities, and prices.",
          "Tạo đơn ngay từ báo giá đã đồng ý, giữ nguyên sản phẩm, số lượng và mức giá đã chốt.",
        )[locale];
      }
    }
    if (allowFallback && !inDialog) {
      return hint(
        "Open this opportunity's contact, next action, follow-up date, private-price history, quotations, and stage controls.",
        "Mở liên hệ, bước tiếp theo, ngày quay lại, lịch sử giá riêng, báo giá và thao tác giai đoạn của cơ hội.",
      )[locale];
    }
  }

  if (allowFallback && pathname === "/admin/house" && !inDialog) {
    if (/^(our story|bài viết về nhà)$/iu.test(region)) {
      return hint(
        "Open this bilingual House story in the website editor. Public text changes only after you save.",
        "Mở câu chuyện song ngữ này trong trình biên tập website. Nội dung công khai chỉ đổi sau khi lưu.",
      )[locale];
    }
    if (/^(reading room|kiến thức về trà)$/iu.test(region)) {
      return hint(
        "Open this bilingual tea article in the website editor. Public text changes only after you save.",
        "Mở bài đọc trà song ngữ này trong trình biên tập website. Nội dung công khai chỉ đổi sau khi lưu.",
      )[locale];
    }
    if (/^(image library|khoảnh khắc của nhà)$/iu.test(region)) {
      return hint(
        "Open this website image's Vietnamese and English captions; the image itself stays unchanged.",
        "Mở chú thích tiếng Việt và tiếng Anh của ảnh trên website; tệp ảnh được giữ nguyên.",
      )[locale];
    }
  }

  return "";
};

export function resolveActionTooltip({ label, href, role, pathname = "", contextId = "", inDialog = false, regionLabel = "" }, locale) {
  const normalized = clean(label);
  const view = (role === "tab" || role === "view")
    ? VIEW_RULES.find((item) => item.path.test(pathname) && item.test.test(normalized))
    : null;
  if (view) return view.text[locale];

  const contextual = contextualHint({ label: normalized, pathname, contextId, inDialog, regionLabel }, locale);
  if (contextual) return contextual;

  const rule = RULES.find((item) => item.test.test(normalized));
  if (rule) return rule.text[locale];

  const contextualFallback = contextualHint(
    { label: normalized, pathname, contextId, inDialog, regionLabel },
    locale,
    true,
  );
  if (contextualFallback) return contextualFallback;

  if (href?.startsWith("tel:")) {
    return locale === "en" ? "Open your phone app with this number." : "Mở ứng dụng điện thoại với số này.";
  }
  if (href?.startsWith("mailto:")) {
    return locale === "en" ? "Open a new email to this address." : "Mở email mới gửi tới địa chỉ này.";
  }
  if (href?.includes("zalo.me")) {
    return locale === "en" ? "Open this contact in Zalo in a new tab." : "Mở liên hệ này trên Zalo trong tab mới.";
  }
  if (href) {
    const route = routeFor(href, pathname);
    const destination = ROUTE_HINTS.find((item) => item.test.test(route));
    if (destination) return destination.text[locale];
  }

  // Deliberately stay silent when we cannot explain the real destination or consequence.
  // A generic tooltip adds friction without helping the person decide whether to click.
  return "";
}

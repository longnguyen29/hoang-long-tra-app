// This lists capabilities in the build being viewed, not a claim that a branch
// has been deployed. Add a dated entry here when shipping a staff-facing change.
export const APP_UPDATES = [
  {
    id: 'partner-classic-retail', date: '2026-10-15', title: 'Đối tác B2B & B2C · Classic, hạng và thưởng',
    items: [
      { title: 'Classic và hạng đối tác', detail: 'Chốt 1% lãi cho hai đơn đủ điều kiện đầu, 2% từ đơn thứ ba; chỉ tính đơn đúng nguồn. Cấu hình thâm niên, thu thuần 12 tháng và hệ số thưởng; quản lý xét áp dụng cho đơn mới.', href: '/admin/partner-network' },
      { title: 'Bảng thưởng tháng và thưởng cá nhân', detail: 'Điền ví dụ để chỉnh, duyệt bảng và đối soát từng khoản. Chọn bậc cao nhất; không tự tạo khoản phải trả hoặc chuyển tiền.', href: '/admin/partner-network' },
      { title: 'Link bán lẻ và giá chào riêng', detail: 'Dùng trang cá nhân đã được mở; khách xác nhận người giới thiệu. Đối tác đề xuất giá trong điều kiện đã cấp, quản lý duyệt báo giá. Hưởng chênh không cộng thêm hoa hồng phần trăm.', href: '/admin/partner-network' },
      { title: 'Thỏa thuận theo chính sách đã lưu', detail: 'Soạn bản nháp từ Classic / hạng hiện hành; giữ cách tính cũ khi mở bản nháp cũ. Xuất tài liệu không thay đổi quyền hưởng trong hệ thống.', href: '/admin/documents' },
    ],
  },
  {
    id: 'partner-network-internal', date: '2026-10-12', title: 'Mạng lưới giới thiệu B2B — kiểm tra nội bộ',
    items: [
      { title: 'Duyệt đối tác và khách giới thiệu', detail: 'Quản lý duyệt hồ sơ, kiểm tra khách trùng và nối vào Pipeline, mẫu, báo giá, đơn hàng hiện có. Đăng ký công khai có công tắc riêng và hiện vẫn đóng.', href: '/admin/partner-network' },
      { title: 'Đối soát hoa hồng theo tiền đã thu', detail: 'Thỏa thuận tỷ lệ theo đối tác; loại VAT, phí giao hàng thu hộ, hoàn tiền và kiểm tra lợi nhuận cần giữ. Có duyệt, điều chỉnh và ghi nhận đã chi trả; không tự chuyển tiền.', href: '/admin/partner-network' },
    ],
  },
  {
    id: 'retail-product-catalog', date: '2026-10-12', title: 'Danh mục mua lẻ & trang chi tiết trà',
    items: [
      { title: 'Tìm trà và xem từng sản phẩm', detail: 'Lọc nhóm, tìm hương vị và xem ảnh, quy cách, giá theo đơn vị niêm yết, cùng hướng dẫn pha đang có. Mua lẻ và xin mẫu/báo giá sỉ dùng chung dữ liệu trà.', href: '/shop' },
      { title: 'Một giỏ hàng giữ qua các trang', detail: 'Chọn trà từ danh mục hoặc trang chi tiết, sửa lượng/xóa dòng trong giỏ. Giỏ giữ sau tải trang; giá và lượng còn có được kiểm tra lại trước khi gửi đơn.', href: '/shop' },
    ],
  },
  {
    id: 'company-profile-catalog', date: '2026-10-11', title: 'Hồ sơ công ty & catalog cho đối tác',
    items: [
      { title: 'Hồ sơ Hoàng Long Việt/Anh', detail: 'Giới thiệu nguồn trà, chế biến, các mốc hợp tác và liên hệ văn phòng/kho. Có bản hồ sơ & catalog PDF Việt/Anh để gửi khách.', href: '/company' },
      { title: 'Catalog theo nhóm trà', detail: 'Tìm trà, lọc nhóm, xem ghi chú, hương và cách pha đang có. Quy cách niêm yết được phân biệt với MOQ/điều kiện đơn sỉ cần xác nhận trong báo giá.', href: '/catalog' },
    ],
  },
  {
    id: 'knowledge-social-inbox', date: '2026-10-11', title: 'Bài mạng xã hội trong kho tri thức',
    items: [
      { title: 'Bài đăng chờ phân loại', detail: 'Xem bài nhập từ Buffer, nội dung, nguồn và thời điểm lấy số liệu. Gắn vào chủ đề hoặc góc khai thác để theo dõi phạm vi đã đăng và kết quả.', href: '/admin/knowledge#knowledge-social-inbox' },
      { title: 'Giữ nguồn và tránh trùng', detail: 'Bài chưa phân loại không cộng vào chủ đề. Bài đã gắn dùng số liệu nền tảng từ nguồn nhập, giữ riêng ghi chú và kết quả kinh doanh. Lấy bài mới cần kết nối Buffer riêng cho website; chưa bật lịch tự động.', href: '/admin/knowledge' },
    ],
  },
  {
    id: 'sms-controls', date: '2026-10-11', title: 'Điều khiển và đối soát SMS vận đơn',
    items: [
      { title: 'Gửi ngay, thử lại hoặc gửi lại SMS vận đơn', detail: 'Quản lý xem trước số nhận và nội dung, ghi lý do rồi yêu cầu Android gửi ngay từ web hoặc điện thoại. Gửi lại một tin đã gửi hoặc chưa rõ kết quả cần xác nhận khả năng trùng tin.', href: '/admin/orders' },
      { title: 'Trạng thái gửi có xác nhận', detail: 'Kiểm tra cổng SMS để phân biệt xếp hàng, Android xử lý, đã gửi và đã nhận. Lịch sử đơn giữ thời gian và kết quả SMS vận đơn, nhắc thanh toán, hỏi phản hồi mẫu.', href: '/admin/orders' },
    ],
  },
  {
    id: 'event-contact', date: '2026-10-09', title: 'Liên hệ sau hội chợ & thẻ QR',
    items: [
      { title: 'Trang gặp gỡ Hoàng Long', detail: 'Khách gửi nhu cầu vào hệ thống sau khi đồng ý lưu thông tin. Khách mới vào Pipeline; khách cũ có thêm lịch sử yêu cầu. Zalo là lựa chọn thêm, khách tự bấm gửi.', href: '/meet' },
      { title: 'Danh mục gọn cho hội chợ', detail: 'Xem trà đang có trong danh mục, chọn tối đa ba loại để xin mẫu hoặc báo giá. Lựa chọn đi cùng nhu cầu vào Pipeline.', href: '/meet/catalog' },
      { title: 'Lịch sử yêu cầu hội chợ', detail: 'Xem thông tin khách đã gửi, nguồn, thời gian và nội dung trong Pipeline hoặc hồ sơ khách; gửi lại cùng một yêu cầu không tạo bản trùng.', href: '/admin/pipeline' },
      { title: 'QR để đặt tại gian hàng', detail: 'In thẻ QR hoặc tải PNG/SVG để mở trang liên hệ. Mã không chứa thông tin cá nhân của khách.', href: '/meet/qr' },
    ],
  },
  {
    id: 'knowledge-centre', date: '2026-10-08', title: 'Từ kiến thức đến nội dung có kết quả',
    items: [
      { title: 'Trung tâm kiến thức trà & kinh doanh', detail: 'Tổ chức chủ đề theo cây, lưu nguồn, ghi chú và góc khai thác. Chọn một nhánh để tạo brief, nối bài đã làm hoặc ghim việc tiếp theo.', href: '/admin/knowledge' },
      { title: 'Bài đã làm & kết quả theo chủ đề', detail: 'Nối bài Growth Lab hoặc ghi bài từ các kênh khác. Xem số bài đã đăng, insight nhập tay và số liệu đường chuyển đổi đang theo dõi, với phần thiếu dữ liệu được ghi rõ.', href: '/admin/knowledge' },
    ],
  },
  {
    id: 'operations-insights', date: '2026-10-07', title: 'Xếp hạng bán hàng & chất lượng lô',
    items: [
      { title: 'Sản phẩm bán chạy & top người mua', detail: 'Lọc theo tháng, năm hoặc toàn bộ lịch sử; xem số đơn, lượng mua và giá trị đơn hoàn tất.', href: '/admin/control?tab=rankings' },
      { title: 'Đánh giá chất lượng theo lô', detail: 'Lưu điểm cảm quan, kết luận, ghi chú, người đánh giá và thời gian trong lịch sử của từng lô.', href: '/admin/operations?tab=batches' },
      { title: 'Gửi nhắc lịch lên Telegram', detail: 'Tự gửi khi đến mốc nhắc. Có nút kiểm tra và gửi các mục đã đến hạn; mục chưa xong vẫn giữ trên dashboard.', href: '/admin#dashboard-planner' },
    ],
  },
  {
    id: 'business-calendar', date: '2026-10-07', title: 'Chỉ số kinh doanh & lịch nghĩa vụ',
    items: [
      { title: 'Chỉ số kinh doanh theo tháng', detail: 'Nhập doanh thu và chi phí để tính EBITDA, lợi nhuận và biên lợi nhuận; lưu lại từng tháng.', href: '/admin/control?tab=metrics' },
      { title: 'Nghĩa vụ làm việc với cơ quan nhà nước', detail: 'Xác nhận hạn thực tế, chọn kỳ lặp và nhận nhắc trước một tháng lịch qua Telegram.', href: '/admin#government-obligations' },
    ],
  },
  {
    id: 'order-tracking', date: '2026-10-01', title: 'Sổ đơn & theo dõi giao hàng',
    items: [
      { title: 'Sổ đơn ưu tiên việc đang làm', detail: 'Đơn hoàn tất nằm trong bộ lọc lịch sử; dữ liệu vẫn được giữ để tra cứu và đặt lại.', href: '/admin/orders' },
      { title: 'Theo dõi đơn và SMS vận đơn', detail: 'Trang khách hiển thị hãng vận chuyển, mã vận đơn và trà đã mua. SMS gửi lỗi được thử lại sau ba giờ.', href: '/admin/orders' },
    ],
  },
];

export const PLANNED_UPDATES = [
  { title: 'Email đăng nhập và pilot Partner Network', detail: 'Hoàn tất xác minh email tên miền, thử luồng đăng nhập, chốt giá vốn/hoa hồng và duyệt 5–10 đối tác. Đăng ký công khai vẫn đóng đến khi duyệt.' },
  { title: 'Đồng bộ bằng chứng sang Google Drive', detail: 'Hệ thống giữ liên kết bằng chứng trong Procedure Run; đồng bộ Drive chưa được bật.' },
  { title: 'Ảnh và hồ sơ kiểm nghiệm trong đánh giá lô', detail: 'Lịch sử cảm quan đã có; bổ sung minh chứng và đối chiếu giữa nhiều lô ở giai đoạn sau.' },
];

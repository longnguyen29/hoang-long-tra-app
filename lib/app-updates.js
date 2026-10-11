// This lists capabilities in the build being viewed, not a claim that a branch
// has been deployed. Add a dated entry here when shipping a staff-facing change.
export const APP_UPDATES = [
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
  { title: 'Đồng bộ bằng chứng sang Google Drive', detail: 'Hệ thống giữ liên kết bằng chứng trong Procedure Run; đồng bộ Drive chưa được bật.' },
  { title: 'Ảnh và hồ sơ kiểm nghiệm trong đánh giá lô', detail: 'Lịch sử cảm quan đã có; bổ sung minh chứng và đối chiếu giữa nhiều lô ở giai đoạn sau.' },
];

// This lists capabilities in the build being viewed, not a claim that a branch
// has been deployed. Add a dated entry here when shipping a staff-facing change.
export const APP_UPDATES = [
  {
    id: 'event-contact', date: '2026-10-09', title: 'Liên hệ sau hội chợ & thẻ QR',
    items: [
      { title: 'Trang gặp gỡ Hoàng Long', detail: 'Zalo, lưu danh bạ, danh mục trà và mẫu cho quán. Khách tự soạn, sao chép và gửi nhu cầu trong Zalo; trang không tự gửi hoặc tạo lead.', href: '/meet' },
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

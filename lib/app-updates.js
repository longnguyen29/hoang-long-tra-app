// This lists capabilities in the build being viewed, not a claim that a branch
// has been deployed. Add a dated entry here when shipping a staff-facing change.
export const APP_UPDATES = [
  {
    id: 'invoice-original-price', date: '2026-10-23', title: 'Hóa đơn có QR & giá trước chỉnh sửa',
    items: [
      { title: 'Giá trước khi sửa riêng cho đơn', detail: 'Mở đơn hàng → Xuất hóa đơn → Hiện giá gốc. Lưu giá trước lần chỉnh đầu tiên và giữ mốc này qua các lần sửa sau; đơn cũ chưa lưu sẽ hiện dấu gạch. Giữ nguyên tổng thanh toán.', href: '/admin/orders' },
      { title: 'QR thanh toán trên bản in', detail: 'Dùng tài khoản nhận tiền hiện có. Nếu đơn có theo dõi thanh toán, mã QR dùng số còn lại và đúng nội dung chuyển khoản; đơn đã trả đủ không hiện yêu cầu chuyển thêm.', href: '/admin/orders' },
    ],
  },
  {
    id: 'retail-tea-bundles-refined', date: '2026-10-20', title: 'Bộ trà theo gu uống và nhu cầu dùng',
    items: [
      { title: 'Ba bộ chính, chọn Sen 3 hoặc Sen 7 trong cùng bộ', detail: 'Lục & Bạch, Một buổi thong thả với một viên Phổ Nhĩ, và Sen & Bạch. Giá và từng gói đổi đúng theo lựa chọn; các đơn và giỏ đã có được giữ nguyên.', href: '/shop#tea-bundles' },
      { title: 'Tách khám phá sâu và mua bổ sung', detail: 'Bộ đối chiếu sen và bộ dùng nhiều có mục riêng. Hai gói cold brew 500g được đặt cạnh giá gói 1kg thực tế để khách tự chọn quy cách.', href: '/shop#tea-bundles' },
      { title: 'Bốn bộ gói nhỏ nhận đăng ký quan tâm', detail: 'Ưu tiên Mộc–Mật–Hoa, thêm bộ sen lượng nhỏ, Mật & Khói và Góc trà cá nhân. Chưa chốt giá, chưa tạo quy cách bán hoặc tồn kho mới; nhu cầu thử trà cho quán đi vào luồng mẫu B2B.', href: '/shop#tea-bundles' },
    ],
  },
  {
    id: 'retail-tea-bundles', date: '2026-10-20', title: 'Bộ trà theo nhu cầu và dịp dùng',
    items: [
      { title: 'Tám gợi ý từ các gói đang bán', detail: 'Lọc theo nhu cầu, ngân sách và thời điểm. Giá cộng từ quy cách hiện có; thêm cả bộ vào giỏ và vẫn chỉnh từng món riêng.', href: '/shop#tea-bundles' },
      { title: 'Năm bộ nhỏ đang chuẩn bị', detail: 'Ghi nhận đăng ký quan tâm vào hồ sơ khách hàng hiện có. Chưa mở bán hoặc xác nhận giá cho quy cách chưa được chuẩn bị.', href: '/shop#tea-bundles' },
    ],
  },
  {
    id: 'product-development-foundation', date: '2026-10-19', title: 'Phát triển sản phẩm & nguồn gia công · Giai đoạn 1',
    items: [
      { title: 'Bản đồ phát triển nội bộ', detail: '30 ý tưởng ưu tiên cùng hồ sơ kiểm kê sản phẩm thực có. Theo dõi tiến độ, người phụ trách, bước tiếp theo và điểm vướng; giữ nguyên catalog, giá và tồn kho.', href: '/admin/product-development' },
      { title: 'Sáu đầu mối chưa thẩm định', detail: 'Dùng hồ sơ nhà cung cấp gốc, lưu riêng thông tin gia công và liên kết dự án. Chưa có báo giá, mức tối thiểu hoặc đối tác được duyệt tự động.', href: '/admin/suppliers' },
      { title: 'Nghiên cứu chưa phải hàng đang bán', detail: 'Hồ sơ phát triển được giữ nội bộ; không mở bán, cam kết sản xuất hoặc phân bổ nguyên liệu tự động. Dự toán tách khỏi ngân sách đã duyệt và chi thực tế.', href: '/admin/product-development' },
    ],
  },
  {
    id: 'retail-tea-choice-guide', date: '2026-10-15', title: 'Tìm trà theo gu quen thuộc',
    items: [
      { title: 'Bạn thường uống trà gì?', detail: 'Khám phá trà Nhà từ trà xanh Thái Nguyên, trà đen túi lọc, trà khói, trà hoa hoặc oolong. Xem giá/quy cách hiện có và điểm nên thử so sánh, không chấm điểm đối thủ.', href: '/shop' },
      { title: 'Sắc thái và cách thưởng trà', detail: 'Danh mục và chi tiết mua lẻ có sắc thái, hương đang niêm yết, thời điểm và cách thưởng thức gợi ý.', href: '/shop' },
    ],
  },
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

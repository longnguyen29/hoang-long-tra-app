# Điểm tiếp tục — Phát triển sản phẩm & Mạng lưới nhà cung cấp

Ngày lưu: **19/10/2026**. Đây là bản bàn giao để tiếp tục công việc trong một cuộc trò chuyện sau.

## Mốc đã hoàn thành

**Giai đoạn 1 — Nền tảng ứng dụng đã hoàn thành và đang chạy trên bản triển khai chính thức.** Mốc triển khai nền tảng: commit **`daa3256`**. Commit này là mốc đối chiếu của Giai đoạn 1; các thay đổi nội dung hoặc giao diện thực hiện sau đó cần được kiểm tra riêng khi tiếp tục.

Đã có trung tâm quản trị nội bộ cho phát triển sản phẩm và nhà cung cấp, tái sử dụng đăng nhập/phân quyền và liên kết với danh mục hiện có. Dữ liệu đã được khởi tạo gồm:

- **42 hồ sơ phát triển riêng tư**: 30 hồ sơ ưu tiên ban đầu và 12 hồ sơ CAT-* rà soát trà thực có trong catalog. N001–N012 vẫn nằm trong bản đồ lộ trình, chưa được tạo thành 12 dự án dịch vụ.
- **6 đầu mối nhà cung cấp chưa thẩm định**, chưa có nhà cung cấp được coi là đối tác đã duyệt.
- **16 liên kết dự án–catalog** tham chiếu đúng sản phẩm thương mại hiện có. Liên kết nhà cung cấp là phần riêng, chỉ ghi nhận ứng viên; không xác nhận năng lực, phản hồi hoặc báo giá.
- Bản đồ 11 nhóm **A/B/C/D/E/F/G/H/K/M/N** và bốn bộ phận thương mại nội bộ. I/J/L vẫn ngoài phạm vi.
- Trạng thái nghiên cứu và công khai được tách khỏi tình trạng bán của sản phẩm thương mại. Các hồ sơ mới tiếp tục là dữ liệu nội bộ.
- Bản đồ lộ trình bảo toàn toàn bộ mã và ý tưởng trong brief tại [product-universe-map.md](product-universe-map.md).

Các sản phẩm thương mại hiện có vẫn dùng bản ghi thật. Hồ sơ phát triển không tạo SKU bán được, giá bán, số lượng tồn kho hoặc quyền mua mới. Các luồng đặt hàng bán lẻ, báo giá B2B, khách tiềm năng và mẫu hiện có được giữ lại.

## Cơ sở dữ liệu — cần giữ nguyên khi tiếp tục

Migration **`0096` đã được áp dụng** và dữ liệu Giai đoạn 1 đã được khởi tạo. **Không chạy lại migration `0096` hoặc chạy lại khởi tạo dữ liệu chỉ để tiếp tục công việc.** Trước thay đổi sau này, đọc trạng thái hiện tại và tạo migration mới phù hợp nếu thật sự cần.

Migration **`0095` là phần việc khác, đang chờ và không thuộc module này**. Không áp dụng `0095` tiện thể khi làm Product Development. Không suy ra rằng mọi migration có số nhỏ hơn đều cần chạy trên môi trường này.

Giữ quyền quản trị nội bộ cho nhà cung cấp, chi phí, tài liệu và ghi chú; không đưa các dữ liệu này vào phản hồi công khai hoặc cửa hàng. Không tự công khai hồ sơ nghiên cứu, nâng trạng thái bán, tạo đơn hàng hoặc sửa giá/tồn kho từ thông tin dự kiến.

## Kiểm tra đã thực hiện và giới hạn

Tại mốc Giai đoạn 1:

- **45 kiểm tra cơ sở dữ liệu đạt**.
- **67 kiểm tra hồi quy đạt**.
- **Build đạt**.
- Lệnh lint hiện tại của dự án vốn đang hỏng; không ghi nhận lint đạt và không coi đây là lỗi mới đã được xử lý trong phạm vi này.
- **Chưa xác minh trực quan ở chiều rộng khoảng 390px**. Không coi giao diện di động đã được kiểm tra đầy đủ.

Các kết quả này thuộc mốc đã bàn giao, không thay thế kiểm tra phù hợp cho thay đổi mới. Không cần chạy lại toàn bộ kiểm tra chỉ để đọc và tiếp tục từ tài liệu này.

## Phần chưa hoàn thành

**Giai đoạn 2 — Tìm nguồn và chi phí:** chưa hoàn thành. Chưa có quy trình đầy đủ cho RFQ, phản hồi và phiên bản báo giá thực tế, so sánh nhà cung cấp, giá vốn sản phẩm, ngân sách được duyệt, chi thực tế và cam kết thanh toán.

**Giai đoạn 3 — Website công khai:** chưa hoàn thành. Chưa triển khai đầy đủ việc công khai ý tưởng được duyệt, đăng ký quan tâm, yêu cầu mẫu theo khả năng cấp mẫu thật và tích hợp dịch vụ sản xuất vào website/CRM. Nội dung giới thiệu trên website không thay thế các quy trình này.

**Giai đoạn 4 — Vận hành:** chưa hoàn thành. Chưa có toàn bộ lệnh sản xuất/thuê ngoài, phân bổ nguyên liệu, truy xuất đầu vào–đầu ra, kiểm soát chất lượng, nhập kho thành phẩm và duyệt ra mắt.

Không hiểu trạng thái “Giai đoạn 1 hoàn thành” là toàn bộ Product Universe đã hoàn thành hoặc sản phẩm nghiên cứu đã sẵn sàng bán.

## Các điểm còn mở

- **Nhà cung cấp:** sáu hồ sơ chỉ là đầu mối từ brief, thông tin website/dịch vụ chưa được xác minh độc lập. Chưa được tự điền giá, mức đặt hàng tối thiểu, thời gian, chứng nhận, quan hệ hợp tác hoặc khả năng nhận trà Hoàng Long. Chưa có ủy quyền liên hệ bên ngoài trong phần triển khai này.
- **Ép trà:** vẫn cần tìm và xác minh đối tác chỉ ép thuê bằng trà do Hoàng Long cung cấp. Nhiệm vụ chưa hoàn tất; không gán một đầu mối chưa xác minh thành nhà máy ép đã đủ năng lực.
- **A005/A006:** Trà Nhài Shan Tuyết và Trà Sen Shan Tuyết chưa được xác nhận trùng danh tính với các trà lài/sen hiện có. Giữ liên kết trống cho đến khi xác minh; không ghép theo từ khóa hoặc hương tương tự.
- **Dự toán:** brief ghi tổng **12–35 triệu đồng**, nhưng các khoản thành phần cộng thành **12–37 triệu đồng**. Cần đối chiếu trước khi duyệt. Đây là dự toán nghiên cứu chưa duyệt, không phải báo giá hay khoản đã chi/cam kết; chưa gồm giá trị trà đầu vào và vốn sản xuất thương mại.
- **D/H/K:** tiếp tục chỉ nghiên cứu, ẩn mặc định và chưa cam kết sản xuất. F chỉ tập trung trà nền dạng khô; chưa đưa cốt lỏng hoặc premix vào lộ trình sản xuất hoạt động.

## Bước nhỏ nên làm tiếp — RFQ bản nháp nội bộ

Khuyến nghị bắt đầu Giai đoạn 2 bằng **một phần việc RFQ có thể dùng được cho liên kết dự án–nhà cung cấp hiện có**, chưa xây ngay toàn bộ hệ thống chi phí.

Phạm vi cụ thể:

1. Đọc cấu trúc và quyền hiện tại của module; tái sử dụng hồ sơ dự án, nhà cung cấp và các liên kết ứng viên đã có. Không nhầm với 16 liên kết catalog, không nạp lại dữ liệu nền.
2. Thêm lưu trữ RFQ nội bộ gắn với một liên kết dự án–nhà cung cấp. Nội dung tối thiểu gồm mã tham chiếu, yêu cầu kỹ thuật, số lượng và đơn vị, hạn phản hồi nếu người dùng nhập, bộ câu hỏi và trạng thái bản nháp. Không điền giả các trường chưa biết.
3. Cho quản trị viên tạo, xem và sửa bản nháp ngay từ dự án/nhà cung cấp. Bộ câu hỏi cần bao gồm việc nhận trà Hoàng Long, yêu cầu nguyên liệu, mẫu thử, mức tối thiểu, phí gia công/bao bì, thời gian, hao hụt, trà dư/hàng lỗi, quyền công thức/thiết kế, truy xuất lô và hồ sơ chất lượng.
4. Cho lưu nội dung phản hồi thật cùng ngày nhận và tài liệu nguồn khi có; bảo toàn lịch sử cần thiết. Chỉ coi là đã nhận phản hồi/báo giá khi có dữ liệu thực, không suy ra từ việc tạo RFQ.
5. Kiểm tra quyền quản trị, liên kết dữ liệu và việc giữ nguyên luồng thương mại; kiểm tra giao diện RFQ ở khoảng 390px. Dừng ở phần RFQ này để đánh giá trước khi mở rộng sang phiên bản báo giá và so sánh chi phí.

Việc tạo bản nháp hoặc lưu nội bộ không gửi email/tin nhắn và không đặt hàng. Bất kỳ thao tác liên hệ bên ngoài nào cần dựa trên chỉ dẫn rõ ràng của người dùng ở thời điểm đó. Không tạo số lượng thương mại, mức giá hoặc cam kết sản xuất từ bản nháp.

## Nội dung có thể dán để tiếp tục

> Tiếp tục module Product Development & Supplier Network của Hoàng Long. Đọc `docs/PRODUCT-DEVELOPMENT-CHECKPOINT.md`, `docs/product-universe-map.md`, AGENTS.md và mã hiện tại trước khi sửa. Giai đoạn 1 đã hoàn thành và triển khai tại mốc commit `daa3256`: 42 dự án riêng tư (30 ưu tiên + 12 hồ sơ CAT-* rà soát trà hiện có), sáu đầu mối chưa thẩm định và 16 liên kết dự án–catalog. Các liên kết nhà cung cấp ứng viên được lưu riêng; chưa tạo 12 dự án dịch vụ N001–N012. Migration `0096` đã áp dụng, không chạy lại; `0095` là phần việc khác đang chờ, không áp dụng tiện thể. Hãy thực hiện bước nhỏ đầu tiên của Giai đoạn 2: RFQ bản nháp nội bộ trên liên kết hiện có, gồm yêu cầu kỹ thuật, số lượng/đơn vị, hạn phản hồi tùy chọn, bộ câu hỏi và lưu phản hồi thật có ngày/tài liệu nguồn. Tái sử dụng đăng nhập và phân quyền quản trị; không liên hệ nhà cung cấp, không tạo báo giá hư cấu, không thay đổi danh mục bán, giá, tồn kho hoặc tình trạng công khai. Giữ A005/A006 chưa ghép khi chưa xác minh, sáu đầu mối chưa được duyệt và ghi rõ chênh lệch dự toán 12–35 so với 12–37 triệu đồng. Giai đoạn 2/3/4 chưa hoàn thành. Mốc trước đạt 45 kiểm tra DB, 67 hồi quy và build; lint vốn hỏng, giao diện 390px chưa được xác minh. Kiểm tra phù hợp với thay đổi mới và báo rõ phần hoàn thành, giới hạn, migration mới nếu có cùng bước tiếp theo. Tuân theo phạm vi và ủy quyền xuất bản hiện hành; không tự liên hệ nhà cung cấp, duyệt chi, cam kết sản xuất hoặc công khai ý tưởng nghiên cứu.

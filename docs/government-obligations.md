# Nghĩa vụ với cơ quan nhà nước và lịch nhắc

## Phạm vi

Các nghĩa vụ được quản lý như cấu hình riêng của tài khoản quản lý, sau đó tạo từng mốc công việc trong lịch Dashboard hiện có. Không tạo thêm hệ thống kế toán hay tự khẳng định một hạn pháp luật áp dụng cho Hoàng Long.

Mở **Dashboard → Nghĩa vụ với cơ quan nhà nước**, tại `/admin/#government-obligations`. Mốc lịch và nhắc Telegram dẫn về phần này.

Migration `supabase/migrations/0074_government_obligations.sql` **chưa được áp dụng vào database production**. Cần triển khai migration trước khi dùng phần này trên live. Migration chạy trong một transaction và có thể chạy lại; không chứa khóa bí mật.

## Danh mục gợi ý và xác nhận hạn

Migration tạo năm danh mục gợi ý cho các tài khoản admin/manager hiện có, nếu chưa có danh mục cùng tên:

- Khai và nộp thuế định kỳ.
- Báo cáo tài chính và quyết toán thuế năm; chỉ là gợi ý cho doanh nghiệp, cần xác nhận loại hình pháp lý trước.
- Đóng BHXH và cập nhật người tham gia.
- Rà soát hồ sơ an toàn thực phẩm / giấy chứng nhận.
- Phản hồi công văn / chuẩn bị kiểm tra.

Tất cả đều là **bản nháp, chưa có ngày, chưa xác nhận, chưa lặp lại**. Vì vậy chúng chưa xuất hiện như hạn phải làm và không gửi Telegram. Người quản lý cần xác nhận nghĩa vụ áp dụng, ngày đầu tiên và chu kỳ dựa trên hồ sơ/thông báo thực tế hoặc trao đổi với kế toán/cơ quan phụ trách. Một ngày đã điền nhưng chưa xác nhận cũng không tạo lịch.

Nguồn tham khảo để đối chiếu khi xác nhận, không được dùng để mặc định lịch cho mọi loại hình:

- [Thời hạn nộp hồ sơ khai thuế](https://xaydungchinhsach.chinhphu.vn/quy-dinh-thoi-han-nop-ho-so-khai-thue-119260703120801722.htm).
- [Luật Bảo hiểm xã hội số 41/2024/QH15](https://xaydungchinhsach.chinhphu.vn/toan-van-luat-so-41-2024-qh15-bao-hiem-xa-hoi-119240723163650489.htm).
- [Thông tin áp dụng Nghị định 15/2018/NĐ-CP về an toàn thực phẩm](https://baochinhphu.vn/tiep-tuc-ap-dung-nghi-dinh-15-2018-nd-cp-ve-an-toan-thuc-pham-cho-den-khi-co-quy-dinh-moi-102260408123934123.htm).
- [Luật Thanh tra](https://xaydungchinhsach.chinhphu.vn/toan-van-luat-thanh-tra-119250704080101722.htm).

Không tự tạo ngày kiểm tra định kỳ hay thêm lệ phí môn bài vào danh mục mặc định.

## Dữ liệu và quyền

`government_obligations` lưu chủ sở hữu, tên việc, cơ quan, nhóm, ghi chú, nguồn HTTPS, hạn đầu tiên, chu kỳ `0 / 1 / 3 / 6 / 12` tháng, cách chọn ngày `day_of_month / month_end`, trạng thái đã xác nhận, bật Telegram, đang hoạt động, phiên bản và thời gian tạo/cập nhật.

Chỉ admin/manager đọc được cấu hình của chính mình. Trình duyệt không có quyền ghi trực tiếp bảng cấu hình: tất cả thay đổi đi qua RPC kiểm tra vai trò, chủ sở hữu và phiên bản. Hai lượt lưu cùng một phiên bản không thể ghi đè âm thầm; lượt sau nhận `obligation_conflict` và phải tải lại bản mới.

`dashboard_plans` được mở rộng với:

- `kind='obligation'` và `status='cancelled'`.
- `obligation_id`, `obligation_version` để liên kết đúng cấu hình và lưu lịch sử.
- `reminder_unit='day' | 'month'`; lịch cũ giữ giá trị mặc định `day` và trường `remind_days` hiện có.
- Chỉ mục duy nhất cho `(obligation_id, event_on, obligation_version)`.

Trigger kiểm tra chủ sở hữu của liên kết, kể cả khi một quản lý có quyền sửa lịch riêng của mình. Không thể gắn lịch của mình vào nghĩa vụ của tài khoản khác. Các sự kiện lịch sử phiên bản cũ vẫn có thể được đánh dấu hoàn tất.

## Quy tắc lịch và thông báo

RPC sinh lịch chỉ tạo cấu hình đang hoạt động, đã xác nhận và có ngày đầu tiên. Mỗi lần sinh tạo các mốc trong năm được yêu cầu **và năm tiếp theo**; chạy lại không tạo bản sao. Từng mốc là một công việc độc lập, nên việc tháng trước chưa hoàn tất không ngăn tạo mốc hoặc nhắc tháng sau.

Với `day_of_month`, mọi ngày được tính trực tiếp từ hạn đầu tiên cộng `n × chu kỳ tháng`. Ví dụ hạn 31/01 lặp tháng sẽ thành 28/02 rồi 31/03; không trôi thành 28/03. Với `month_end`, hạn đầu tiên phải là ngày cuối tháng và mỗi lần lặp lấy ngày cuối tháng đích, ví dụ 30/04 lặp quý thành 31/07.

Nhắc nghĩa vụ bắt đầu **một tháng lịch trước hạn**, không phải luôn 30 ngày. Ví dụ 31/03 được nhắc từ 28/02 (29/02 ở năm nhuận), 30/04 từ 30/03. Tháng trước không có ngày tương ứng thì lấy ngày cuối tháng đó. Cron có thể thử gửi lại trong khoảng từ ngày nhắc đến hạn nếu chưa gửi thành công; một lần gửi thành công sẽ được ghi nhận bằng `notified_event_on`.

Cơ chế claim dùng lại lease 30 phút và bộ đếm lần thử của Dashboard để tránh hai lượt cron cùng gửi một mốc. `cancelled`, đã hoàn tất, cấu hình chưa xác nhận/tạm dừng và phiên bản đã bị thay thế đều không được claim để gửi. Kênh gửi vẫn là bot Telegram hiện có; trình duyệt không nhận token bot hoặc service credentials.

Khi sửa/tạm dừng cấu hình:

- Các mốc đang chờ từ hôm nay trở đi (theo `Asia/Ho_Chi_Minh`) được chuyển thành `cancelled` và tắt thông báo, không xóa.
- Mốc đã hoàn tất và việc quá hạn chưa hoàn tất được giữ nguyên để xem và xử lý.
- Phiên bản mới tạo lại mốc tương lai; nếu cùng nghĩa vụ/cùng ngày đã nhắc thành công trước đó thì giữ dấu đã gửi, tránh gửi lại chỉ vì sửa ghi chú/tên việc.

Hồ sơ lịch sử vẫn nằm trong `dashboard_plans`; giao diện lịch đang làm cần bỏ các dòng `cancelled`.

## API

Trình duyệt đã đăng nhập quản lý gọi:

```text
save_government_obligation(
  p_id uuid,                   // null khi tạo mới
  p_title text,
  p_authority text,
  p_category text,
  p_notes text,
  p_source_url text,           // HTTPS hoặc chuỗi rỗng
  p_first_due_on date,         // 1900–2199, có thể null với bản nháp
  p_repeat_months integer,     // 0, 1, 3, 6, 12
  p_due_rule text,             // day_of_month hoặc month_end
  p_deadline_confirmed boolean,
  p_notify_telegram boolean,
  p_active boolean,
  p_expected_version integer  // null khi tạo mới; version hiện tại khi sửa
) -> SETOF government_obligations

ensure_government_obligation_occurrences(p_year integer) -> integer
```

Sau khi lưu, gọi `ensure_government_obligation_occurrences` rồi tải lại lịch. Kết quả là số mốc mới được tạo, không phải tổng số mốc. `p_year` hỗ trợ 1900–2200; ngày đầu tiên phải trong khoảng 01/01/1900–31/12/2199.

Cron server dùng client service role gọi:

```text
ensure_government_obligation_calendar(p_year integer) -> integer
claim_dashboard_reminder(p_id uuid, p_today date) -> SETOF dashboard_plans
```

`ensure_government_obligation_calendar` tạo mốc cho tất cả chủ sở hữu còn là quản lý, trước bước tìm lịch cần nhắc. `materialize_government_obligations(p_owner uuid, p_year integer)` là hàm nội bộ, không cấp cho authenticated. Cron cần quét tối đa 31 ngày tới để không bỏ lỡ nhắc một tháng lịch. Cấu hình năm và ngày hiện tại dùng múi giờ Việt Nam.

## Kiểm tra khi triển khai

1. Áp dụng migration; mở tab nghĩa vụ và xác nhận danh mục gợi ý chưa có hạn, không tự gửi.
2. Tạo một nghĩa vụ thực tế, xác nhận hạn và chu kỳ, kiểm tra mốc trong lịch năm hiện tại/năm sau.
3. Đánh dấu hoàn tất một mốc, kiểm tra mốc tiếp theo vẫn tồn tại. Việc cũ quá hạn chưa xong không được mất đi.
4. Sửa hạn hoặc tạm dừng, kiểm tra mốc tương lai cũ không còn được nhắc và lịch sử được giữ.
5. Kiểm tra bot Telegram và cron hiện có bằng một mốc nội bộ phù hợp; tránh gửi thử bằng dữ liệu khách hàng.
6. Hai tài khoản quản lý không đọc được cấu hình của nhau; nhân viên không được sửa cấu hình; client chỉ có anon key và phiên đăng nhập.

## Để sau

Dashboard có thêm nút **Gửi nhắc đến hạn**, dùng cùng bộ xử lý với cron và chỉ
cho quản lý gọi. Nếu Telegram đã nhận tin nhưng database không lưu được dấu đã
gửi, giao diện báo riêng tình trạng đó và giữ lease hiện tại; kiểm tra Telegram
trước khi thử lại. Đây không phải bảo đảm gửi đúng một lần khi hệ thống lỗi.
Chi tiết và kiểm tra mới xem `operations-insights-updates.md`.

Lịch nhắc không tự nộp báo cáo, chuyển tiền hay gửi nội dung tới cơ quan nhà nước. Chưa tự đọc công văn, đồng bộ cổng dịch vụ công, chứng nhận một hạn pháp luật hoặc tạo lịch theo mọi trường hợp ngoại lệ. Hạn điều chỉnh thực tế có thể ghi bằng một nghĩa vụ một lần hoặc cập nhật cấu hình sau khi xác nhận nguồn.


## Kiểm tra đã chạy / trạng thái hiện tại

- 13 kiểm tra ngày tháng và xử lý nhắc Telegram đã đạt (10 kiểm tra calendar, 3 kiểm tra processor dùng transport giả; không gửi Telegram thật).
- Production build và `git diff --check` đã đạt. Đã sửa link mốc lịch để thỏa CHECK có sẵn của `dashboard_plans`.
- Nghĩa vụ một lần, theo tháng/quý/6 tháng/năm; ngày cố định hoặc cuối tháng. Nhắc một lần trong cửa sổ bắt đầu trước một tháng lịch; nếu tạo muộn thì gửi vào lần quét tiếp theo trước hạn.
- Danh mục chưa xác nhận/ngày trống không tạo mốc hay gửi nhắc. Các mục sắp tới trong vòng một tháng và quá hạn chưa xong hiện ở Đang chờ; các kỳ xa hơn vẫn có trong lịch.
- Chưa chạy migration 0074 trên live, chưa kiểm tra lưu/khôi phục thực tế, desktop/mobile hay cron production. Phiên hiện tại chặn mạng và không cho điều khiển trình duyệt. Nhánh này cũng có migration 0073 cho chỉ số kinh doanh, chưa áp dụng.
- Khi triển khai: đồng bộ remote trước; áp dụng chỉ các migration mới 0073 và 0074 rồi mới đưa code lên production; kiểm tra bot/cron hiện có. Không chạy lại migration cũ.
- Ngày nghỉ/lễ và ngoại lệ từng kỳ chưa được tự điều chỉnh. Xác nhận hạn bằng hồ sơ thực tế; nếu một kỳ có hạn riêng, ghi một nghĩa vụ một lần hoặc cập nhật lịch lặp phù hợp. Không tự nộp hồ sơ/chuyển tiền.

## Nguồn tham khảo cho danh mục gợi ý

Các nguồn hỗ trợ việc chọn nhóm hồ sơ, không xác định nghĩa vụ cụ thể hay hạn của Hoàng Long:

- [Hướng dẫn thời hạn khai thuế theo NĐ 252/2026](https://xaydungchinhsach.chinhphu.vn/quy-dinh-thoi-han-nop-ho-so-khai-thue-119260703120801722.htm).
- [Luật BHXH 41/2024](https://xaydungchinhsach.chinhphu.vn/toan-van-luat-so-41-2024-qh15-bao-hiem-xa-hoi-119240723163650489.htm).
- [Hướng dẫn tiếp tục áp dụng NĐ 15/2018 về an toàn thực phẩm](https://baochinhphu.vn/tiep-tuc-ap-dung-nghi-dinh-15-2018-nd-cp-ve-an-toan-thuc-pham-cho-den-khi-co-quy-dinh-moi-102260408123934123.htm).
- [Luật Thanh tra](https://xaydungchinhsach.chinhphu.vn/toan-van-luat-thanh-tra-119250704080101722.htm).
- Mẫu hộ kinh doanh: [NĐ 68/2026](https://xaydungchinhsach.chinhphu.vn/huong-dan-khai-thue-tinh-thue-va-su-dung-hoa-don-119260309113415826.htm), đọc cùng [NĐ 141/2026 sửa đổi](https://xaydungchinhsach.chinhphu.vn/nghi-dinh-so-141-2026-nd-cp-quy-dinh-moi-ve-chinh-sach-thue-doi-voi-ho-kinh-doanh-doanh-nghiep-119260430091642895.htm).

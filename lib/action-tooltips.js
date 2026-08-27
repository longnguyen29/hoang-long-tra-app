const hint = (en, vi) => ({ en, vi });

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
    test: /^(add opportunity|new opportunity|thêm cơ hội|cơ hội mới)$/iu,
    text: hint(
      "Open a blank CRM opportunity. Nothing enters the pipeline until you save it.",
      "Mở một cơ hội CRM trống. Chưa có gì vào pipeline cho đến khi bạn lưu.",
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
    test: /^(create quotation|new quotation|tạo báo giá|báo giá mới)/iu,
    text: hint(
      "Open a quotation draft using the current catalogue or agreed private prices.",
      "Mở bản nháp báo giá theo danh mục hoặc bảng giá riêng hiện tại.",
    ),
  },
  {
    test: /^(create order from|tạo đơn từ)/iu,
    text: hint(
      "Convert the accepted quotation into an order using its agreed lines and prices.",
      "Chuyển báo giá đã đồng ý thành đơn với đúng sản phẩm và mức giá đã chốt.",
    ),
  },
  {
    test: /^(save|saving|lưu|đang lưu)/iu,
    text: hint(
      "Save the current changes. Required fields must be complete first.",
      "Lưu các thay đổi hiện tại. Cần điền đủ trường bắt buộc trước.",
    ),
  },
];

const clean = (value = "") => value.replace(/\s+/g, " ").trim();

export function resolveActionTooltip({ label, href, role, formSubmit }, locale) {
  const normalized = clean(label);
  const rule = RULES.find((item) => item.test.test(normalized));
  if (rule) return rule.text[locale];

  if (role === "tab") {
    return locale === "en"
      ? "Show this view without changing any records."
      : "Mở góc nhìn này mà không thay đổi bản ghi nào.";
  }
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
    return locale === "en"
      ? "Open this area. Saved business data is not changed."
      : "Mở khu vực này. Dữ liệu kinh doanh đã lưu không thay đổi.";
  }
  if (formSubmit) {
    return locale === "en"
      ? "Submit this form after validating its required fields."
      : "Gửi biểu mẫu này sau khi kiểm tra các trường bắt buộc.";
  }
  if (normalized) {
    return locale === "en"
      ? "Open this item to inspect its details and available actions. Nothing changes yet."
      : "Mở mục này để xem chi tiết và các thao tác. Chưa có dữ liệu nào thay đổi.";
  }
  return "";
}

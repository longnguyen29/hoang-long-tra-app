// Operating map shared by the staff guide and repository assistants.
// These entries describe where to look. Private business facts live in staff records.
export const workflows = [
  { id: "sample", title: "Gửi mẫu và hỏi kết quả", question: "Khách đã thử loại trà nào, phản hồi ra sao, ai cần liên hệ tiếp?",
    sources: [
      ["pipeline", "Hồ sơ khách hàng", "/admin/pipeline?view=agenda", "Xác nhận đúng khách, loại trà quan tâm, người phụ trách và ngày hẹn."],
      ["orders", "Yêu cầu mẫu và lịch hỏi thăm", "/admin/orders#sample-followups", "Đối chiếu mã mẫu và ngày thực gửi trước khi hỏi khách đã pha thử chưa."],
      ["customerMemory", "Trao đổi với khách", "/admin/customer-memory", "Tra đúng cuộc trao đổi để tìm nhận xét về hương, vị và cách pha."],
    ], boundary: "Khách thích mẫu là phản hồi của riêng khách đó. Chỉ ghi nhận đơn khi có giao dịch tương ứng." },
  { id: "quote", title: "Báo giá và chốt đơn sỉ", question: "Mức giá nào áp dụng cho khách này, với số lượng và quy cách nào?",
    sources: [
      ["pipeline", "Giá riêng và báo giá", "/admin/pipeline", "Trong hồ sơ khách, mở Mẫu, giá & đơn. Kiểm tra đơn vị bán, lượng tối thiểu, hiệu lực, VAT và giao hàng."],
      ["orders", "Đơn đã tạo", "/admin/orders#orders", "Đối chiếu số lượng, địa chỉ, trạng thái và mã đơn đã ghi nhận."],
      ["documents", "Tài liệu công ty", "/admin/documents", "Tra tài liệu tương ứng khi cần soạn hợp đồng hoặc biên bản."],
    ], boundary: "Mức giá đã thỏa thuận với một khách chỉ áp dụng theo điều kiện của hồ sơ đó." },
  { id: "quality", title: "Kiểm tra chất lượng lô trà", question: "Kết quả nếm thử này thuộc lô nào và dùng thang điểm nào?",
    sources: [
      ["operations", "Lô trà và đánh giá lô", "/admin/operations?tab=batches", "Tra mã lô, kết quả, tiêu chí, thang điểm và điều kiện pha của lần đánh giá."],
      ["recipes", "Công thức và lần pha thử", "/admin/recipes?view=lab", "Đối chiếu công thức thử khi khách đánh giá trà trong đồ uống."],
    ], boundary: "Giữ nguyên thang điểm gốc. Một lần nếm thử mô tả lô được thử." },
  { id: "finance", title: "Kiểm tra giao hàng và thanh toán", question: "Đơn đã giao đến đâu, đã thu bao nhiêu, còn phải thu bao nhiêu?",
    sources: [
      ["orders", "Hồ sơ đơn", "/admin/orders#orders", "Tra đúng mã đơn, lịch sử giao hàng và thông tin vận đơn."],
      ["operations", "Công nợ", "/admin/operations?tab=finance", "Đối chiếu khoản phải thu và số tiền đã ghi nhận thanh toán."],
    ], boundary: "Báo cáo riêng giá trị đơn, tiền đã thu và số dư còn lại." },
  { id: "work", title: "Nhận việc và bàn giao", question: "Việc nào đã được giao, ai phụ trách và khi nào hoàn tất?",
    sources: [
      ["work", "Bảng giao việc", "/admin/work", "Tra người phụ trách, hạn và các bước đã hoàn thành trước khi bàn giao."],
      ["procedures", "Quy trình đơn B2B", "/admin/procedures", "Kiểm tra bước xử lý và bằng chứng cần lưu cho đơn cụ thể."],
    ], boundary: "Ghi phần còn thiếu và người tiếp nhận khi bàn giao." },
];

export function guideReferences(memory, topics) {
  return [
    ...memory.filter(row => row.status === "approved").map(row => ({
      key: "memory/" + row.id, title: row.title, body: row.body,
      kind: { policy: "Quy tắc", decision: "Quyết định", learning: "Bài học" }[row.kind] || "Ghi nhớ",
      stamp: row.approved_at, reviewOn: row.review_on || null, source: "Điều công ty cần nhớ",
    })),
    ...topics.filter(row => row.status === "reviewed" && !row.memory_item_id).map(row => ({
      key: "topic/" + row.id, title: row.title, body: row.body, kind: "Chủ đề đã rà soát",
      stamp: row.reviewed_at, source: "Trung tâm kiến thức", reviewOn: null,
    })),
  ].sort((a,b) => (b.stamp || "").localeCompare(a.stamp || ""));
}

export function guideBrief(flow, task, references, asOf) {
  const text = [
    "Hoàng Long · " + flow.title, "Ngày lập bản giao việc: " + asOf,
    "Yêu cầu: " + (task.trim() || flow.question),
    "Nguồn cần đối chiếu:", ...flow.sources.map(([,name,path,reason]) => "- " + name + " (" + path + ") — " + reason),
    flow.boundary,
  ];
  for (const ref of references) {
    text.push("", ref.kind + " · " + ref.title, ref.body || "", "Nguồn: " + ref.source + " · " + ref.key +
      (ref.stamp ? " · " + ref.stamp.slice(0,10) : "") + (ref.reviewOn ? " · Ngày rà soát: " + ref.reviewOn : ""));
  }
  text.push("", "Nếu cần số liệu hiện tại, tra hồ sơ gốc hoặc yêu cầu người giao việc cung cấp phần còn thiếu.");
  return text.join("\n");
}

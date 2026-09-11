// Desk research from the linked public business pages, 2026-09-11.
// Not confirmed active by telephone; buyer identity, demand and purchasing volume unknown.
export const DISCOVERY_SEED = [
  { name: "Miên Man Cafe", region: "Hà Nội", source_url: "https://mienmancafe.vn/menu/", evidence: "Trang menu có nhóm trà sữa; các món Hồng Trà Mật và Lài Việt. Website giới thiệu quán tại khu phố cổ Hà Nội.", contact: "", notes: "Cần xác nhận hoạt động hiện tại, người phụ trách mua trà và quy trình thử mẫu." },
  { name: "This & That Coffee and Tea", region: "TP. Hồ Chí Minh", source_url: "https://thisthatcafe.com/en/", evidence: "Website công bố 3 cửa hàng tại TP. Hồ Chí Minh; menu có trà trái cây và trà sữa.", contact: "", notes: "Nhiều chi nhánh; cần xác nhận đầu mối mua hàng chung. Chưa xác minh nhu cầu đổi trà." },
  { name: "Kim Coffee & Fruit Tea", region: "TP. Hồ Chí Minh", source_url: "https://www.kimcafe.biz.vn/", evidence: "Website giới thiệu cà phê, trà trái cây và nhóm trà sữa; địa chỉ công bố tại Huỳnh Thị Hai, TP. Hồ Chí Minh.", contact: "", notes: "Cần kiểm tra menu và địa chỉ còn hiện hành trước khi tiếp cận." },
  { name: "Feline Coffee & Tea", region: "TP. Hồ Chí Minh", source_url: "https://felinecoffee.com/", evidence: "Website giới thiệu menu gồm trà sữa và trà trái cây tại TP. Hồ Chí Minh.", contact: "", notes: "Chưa xác nhận quy mô, nhà cung cấp hiện tại hoặc ngân sách nguyên liệu." },
].map((p, i) => ({ ...p, id: `research-${i}`, evidence_kind: "page_review", observed_at: "2026-09-11T00:00:00.000Z", status: "research" }));

import { EVENT_CONTACT } from "./event-contact.js";

// Public facts already used on the website; no legal identity or certification
// is inferred from the trading name. Keep web/PDF contact details together.
export const PROFILE_CONTACT = EVENT_CONTACT;
export const PROFILE_PDF = {
  vi: "/downloads/hoang-long-profile-catalog-vi.pdf",
  en: "/downloads/hoang-long-profile-catalog-en.pdf",
};
export const PROFILE_REVISION = "2026-10-11";

export const COMPANY_PROFILE = {
  vi: {
    eyebrow: "Hồ sơ doanh nghiệp · Nhà làm trà từ 1995",
    title: "Trà Việt. Nguồn cung cho mối hợp tác lâu dài.",
    intro: "Hoàng Long cung cấp trà tại xưởng cho nhà phân phối, đối tác xuất khẩu và quán đồ uống. Bắt đầu từ nhu cầu sử dụng và mẫu trà, cùng thống nhất chất lượng, quy cách và kế hoạch giao hàng.",
    actions: { home: "Nhà Hoàng Long", catalog: "Xem danh mục trà", pdf: "Tải hồ sơ & catalog PDF", quote: "Yêu cầu báo giá", sample: "Trao đổi mẫu trà", call: "Gọi trao đổi", zalo: "Liên hệ Zalo", story: "Tìm hiểu nguồn trà" },
    overview: {
      title: "Hoàng Long trong một trang",
      body: "Kinh nghiệm làm trà gia đình, nguồn nguyên liệu vùng cao và chế biến bằng công nghệ Nhật Bản là nền tảng của Nhà. Mỗi nhu cầu cung ứng được trao đổi trực tiếp để chọn dòng trà và mẫu phù hợp.",
      facts: [
        { label: "Hoạt động", value: "Làm trà từ 1995", note: "Nhà làm Trà Hoàng Long" },
        { label: "Năng lực công bố", value: "1.000 tấn/năm", note: "Năng lực sản xuất phục vụ kế hoạch cung ứng; khối lượng sẵn và lịch giao được xác nhận theo từng đơn." },
        { label: "Nguồn nguyên liệu", value: "Tây Bắc · Hà Giang", note: "Lựa chọn nguồn nguyên liệu theo dòng trà và mẫu đã thống nhất." },
        { label: "Hợp tác", value: "Mẫu trước · Báo giá theo nhu cầu", note: "Chất lượng, quy cách, khối lượng và điều khoản được chốt cùng đối tác." },
      ],
    },
    origins: {
      title: "Từ nguyên liệu đến mẫu trà",
      body: "Nguyên liệu Tây Bắc, Hà Giang và trà cổ thụ vùng cao được lựa chọn theo dòng sản phẩm. Chế biến hấp hơi bằng công nghệ Nhật Bản là một hướng chế biến của Nhà; phương pháp cụ thể được trao đổi theo từng dòng trà.",
      entries: [
        { title: "Nguồn trà", body: "Trao đổi về vùng nguyên liệu và yêu cầu nguồn gốc khi chọn mẫu." },
        { title: "Chế biến", body: "Đối chiếu phương pháp chế biến, đặc tính và mục đích sử dụng của dòng trà." },
        { title: "Chất lượng theo nhu cầu", body: "Thống nhất mẫu và yêu cầu chất lượng trước khi xác nhận đơn hàng." },
      ],
    },
    supply: {
      title: "Từ lần thử đầu đến đơn hàng tiếp theo",
      intro: "Một lộ trình rõ ràng để hai bên cùng chốt điều cần biết trước khi đặt hàng.",
      steps: [
        { title: "Trao đổi nhu cầu", body: "Mục đích sử dụng, thị trường, dòng trà, khối lượng và thời điểm cần hàng." },
        { title: "Thử mẫu & phản hồi", body: "Đánh giá mẫu trong cách pha hoặc ứng dụng thực tế; trao đổi những điểm cần điều chỉnh." },
        { title: "Chốt báo giá & quy cách", body: "Xác nhận phẩm cấp, khối lượng, bao bì, thanh toán, chứng từ và lịch giao." },
        { title: "Giao hàng & đặt lại", body: "Theo dõi giao nhận, ghi nhận phản hồi và trao đổi nhu cầu cho đơn kế tiếp." },
      ],
    },
    quality: {
      title: "Những mục cần thống nhất trước khi chốt đơn",
      body: "Yêu cầu kiểm tra và hồ sơ phụ thuộc sản phẩm, hợp đồng và thị trường đích. Hãy gửi yêu cầu cụ thể để hai bên xác nhận khả năng đáp ứng trước khi đặt hàng.",
      items: ["Mẫu đối chiếu, phẩm cấp và tiêu chí chất lượng", "Quy cách bao bì, nhãn, số lô và lượng đặt", "Báo giá, PO/hợp đồng và điều khoản thanh toán", "Phiếu giao hàng; hóa đơn, packing list khi áp dụng", "Kết quả xét nghiệm, chứng nhận hoặc hồ sơ thị trường yêu cầu: xác nhận loại, phạm vi và khả năng cung cấp trước đơn"],
    },
    contact: {
      title: "Ghé uống trà. Trao đổi việc hợp tác.",
      officeLabel: "Văn phòng & kho · Hà Nội",
      visitNote: "36B QL2A là văn phòng và kho, không phải địa chỉ xưởng. Bạn có thể ghé uống trà và trao đổi nhu cầu; vui lòng gọi trước để sắp xếp.",
      legalNote: "Thông tin pháp nhân xuất hóa đơn và hồ sơ giao dịch được xác nhận trong báo giá/hợp đồng.",
      map: "Xem đường đến văn phòng",
    },
    images: { origin: "Cây trà trong vùng nguyên liệu", production: "Dây chuyền chế biến trà", productionCaption: "Chế biến trà tại xưởng Hoàng Long" },
    edition: "Bản tháng 10/2026",
    editionNote: "PDF là bản giới thiệu tại thời điểm phát hành. Xem catalog trên website và liên hệ để xác nhận danh mục, mẫu và điều kiện cung ứng hiện tại.",
  },
  en: {
    eyebrow: "Company profile · A tea house since 1995",
    title: "Vietnamese tea. Supply for lasting partnerships.",
    intro: "Hoàng Long supplies tea directly from the factory to distributors, export partners and beverage businesses. Start with your application and a sample, then agree on quality, packing and delivery plans.",
    actions: { home: "House of Hoàng Long", catalog: "Explore the tea range", pdf: "Download profile & catalogue PDF", quote: "Request a quotation", sample: "Discuss tea samples", call: "Call our team", zalo: "Contact on Zalo", story: "Explore our origins" },
    overview: {
      title: "Hoàng Long at a glance",
      body: "Family tea-making experience, highland raw materials and Japanese processing technology underpin the house. We discuss supply requirements directly to select a suitable tea and sample.",
      facts: [
        { label: "Background", value: "Making tea since 1995", note: "House of Hoàng Long" },
        { label: "Declared capacity", value: "1,000 tonnes/year", note: "Production capacity for supply planning; available volumes and delivery dates are confirmed for each order." },
        { label: "Raw material origins", value: "Northwest Vietnam · Hà Giang", note: "Raw materials selected for the product range and agreed sample." },
        { label: "Cooperation", value: "Sample first · Quote to your brief", note: "Quality, packing, volume and terms are agreed with the buyer." },
      ],
    },
    origins: {
      title: "From raw material to a tea sample",
      body: "Raw materials from Northwest Vietnam, Hà Giang and ancient highland tea trees are selected for each product range. Steam processing with Japanese technology is one of the house's methods; the process used is discussed for each tea.",
      entries: [
        { title: "Origin", body: "Discuss raw material origins and traceability requirements when selecting a sample." },
        { title: "Processing", body: "Review processing methods, characteristics and intended applications for the tea." },
        { title: "Quality to your brief", body: "Agree on the sample and quality requirements before confirming the order." },
      ],
    },
    supply: {
      title: "From first sample to repeat supply",
      intro: "A clear path for both sides to agree on the details before ordering.",
      steps: [
        { title: "Discuss your brief", body: "Application, market, tea range, planned volume and required delivery date." },
        { title: "Test a sample", body: "Evaluate the tea in your brewing method or application and discuss any adjustments." },
        { title: "Agree on the quotation", body: "Confirm grade, quantity, packing, payment, documents and delivery schedule." },
        { title: "Delivery & repeat orders", body: "Follow delivery, record feedback and discuss requirements for the next order." },
      ],
    },
    quality: {
      title: "Details to agree before confirming supply",
      body: "Checks and documents depend on the product, contract and destination market. Share your requirements so both sides can confirm what can be supplied before ordering.",
      items: ["Reference sample, grade and quality criteria", "Packaging, labelling, lot reference and quantity", "Quotation, PO/contract and payment terms", "Delivery note; invoice and packing list where applicable", "Test results, certificates or market-specific documents: confirm type, scope and availability before ordering"],
    },
    contact: {
      title: "Visit for tea. Discuss your supply plans.",
      officeLabel: "Office & warehouse · Hanoi",
      visitNote: "36B QL2A is our office and warehouse, not the factory address. You are welcome to visit for tea and discuss your requirements; please call ahead to arrange a time.",
      legalNote: "The invoicing legal entity and transaction documents are confirmed in the quotation/contract.",
      map: "Directions to our office",
    },
    images: { origin: "Tea trees in a raw material region", production: "Tea processing line", productionCaption: "Tea processing at Hoàng Long" },
    edition: "October 2026 edition",
    editionNote: "The PDF is an introduction at the time of publication. Visit the online catalogue and contact us to confirm the current range, samples and supply terms.",
  },
};

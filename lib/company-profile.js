import { EVENT_CONTACT } from "./event-contact.js";
import { B2B_BULK_PACKING } from "./b2b-packing.js";
import { EXPORT_DEVELOPMENT_CONTACT } from "./export-sales-profiles.js";

// Public identity and operating facts supplied by the owner. A title is a
// commercial remit, not a Partner Network permission or signing authority.
export const PROFILE_CONTACT = EVENT_CONTACT;
export const PROFILE_EXPORT_CONTACT = EXPORT_DEVELOPMENT_CONTACT;
export const PROFILE_LEGAL = Object.freeze({
  name: "Công ty TNHH Thương Mại Trà Hoàng Long",
  taxNumber: "0110818609",
});
export const PROFILE_PDF = {
  vi: "/downloads/hoang-long-profile-catalog-vi.pdf",
  en: "/downloads/hoang-long-profile-catalog-en.pdf",
};
export const PROFILE_REVISION = "2026-10-23";

export const COMPANY_PROFILE = {
  vi: {
    packing: B2B_BULK_PACKING.vi,
    eyebrow: "Hoàng Long · Sản xuất & phát triển xuất khẩu",
    title: "Trà Việt. Nền tảng cho hợp tác dài hạn.",
    intro: "Từ nguyên liệu vùng cao đến chế biến tại Hà Giang, Hoàng Long kết nối kinh nghiệm làm trà với nhu cầu của nhà nhập khẩu, nhà phân phối và đối tác phát triển thị trường. Mỗi chương trình cung ứng bắt đầu bằng yêu cầu kỹ thuật, mẫu đối chiếu và kế hoạch triển khai cụ thể.",
    actions: { home: "Nhà Hoàng Long", catalog: "Danh mục cung ứng", pdf: "Hồ sơ năng lực & danh mục PDF", quote: "Gửi đề bài hợp tác", sample: "Đánh giá mẫu trà", call: "Gọi trao đổi", zalo: "Zalo Hoàng Long", story: "Nguồn trà & quá trình chế biến" },
    overview: {
      title: "Năng lực tại nguồn. Tổ chức theo thị trường.",
      body: "Nền tảng của Hoàng Long là kinh nghiệm làm trà gia đình, nguồn nguyên liệu Tây Bắc và hoạt động chế biến tại Tân Lập, Hà Giang. Chúng tôi hướng tới các chương trình cung ứng có yêu cầu sản phẩm rõ ràng, kế hoạch sản xuất phù hợp và trách nhiệm giao nhận được thống nhất từ đầu.",
      facts: [
        { label: "Kinh nghiệm", value: "Làm trà từ 1995", note: "Nền tảng kinh nghiệm làm trà của gia đình Hoàng Long." },
        { label: "Năng lực sản xuất tham chiếu", value: "50–100 tấn/tháng", note: "Theo công bố của Hoàng Long; cơ cấu trà, khối lượng sẵn và tiến độ được cân đối theo kế hoạch sản xuất." },
        { label: "Chế biến & điểm nhận EXW", value: "Tân Lập · Hà Giang", note: "Nhà máy Trà Hoàng Long. Văn phòng và kho tại Hà Nội là địa điểm làm việc riêng." },
        { label: "Định hướng hợp tác", value: "Phân phối · Xuất khẩu", note: "Từ đánh giá mẫu và yêu cầu thị trường đến lô hàng và kế hoạch cung ứng tiếp theo." },
      ],
    },
    origins: {
      title: "Giá trị bắt đầu từ nguồn trà.",
      body: "Tây Bắc và Hà Giang là nền tảng nguyên liệu của Hoàng Long. Kinh nghiệm lựa chọn trà vùng cao kết hợp với các phương pháp chế biến, trong đó có hấp hơi bằng công nghệ Nhật Bản, tạo cơ sở phát triển dòng trà theo mục đích sử dụng và phân khúc thị trường.",
      entries: [
        { title: "Nguồn nguyên liệu", body: "Xác định vùng nguyên liệu, mùa và đặc tính phù hợp với dòng trà. Thông tin nguồn của lô hàng được đối chiếu khi chọn mẫu và đặt hàng." },
        { title: "Phương án chế biến", body: "Trao đổi phẩm cấp, ngoại hình, hương vị và ứng dụng để lựa chọn phương pháp chế biến và mẫu tham chiếu phù hợp." },
        { title: "Giá trị dài hạn", body: "Định hướng nâng giá trị trà Việt bằng sản phẩm phù hợp thị trường, phản hồi có hệ thống và kế hoạch hợp tác qua nhiều chu kỳ cung ứng." },
      ],
    },
    supply: {
      title: "Một chương trình cung ứng, bốn điểm thống nhất.",
      intro: "Đầu mối phụ trách điều phối từ đề bài ban đầu đến đánh giá mẫu, phương án thương mại và giao nhận. Các cam kết được ghi nhận theo từng chương trình hoặc hợp đồng.",
      steps: [
        { title: "Xác định nhu cầu thị trường", body: "Thị trường đích, ứng dụng, kênh phân phối, sản lượng dự kiến và lịch triển khai." },
        { title: "Đánh giá mẫu & năng lực", body: "Đối chiếu mẫu, yêu cầu kiểm nghiệm, khả năng chế biến và kế hoạch khảo sát nhà máy khi cần." },
        { title: "Thống nhất yêu cầu thương mại", body: "Chốt quy cách, lượng đặt, giá, điều kiện giao hàng, thanh toán và trách nhiệm chứng từ của mỗi bên." },
        { title: "Triển khai & đối chiếu giao nhận", body: "Theo dõi hàng sẵn, đóng gói, vận chuyển và bằng chứng giao nhận; ghi nhận phản hồi cho lô kế tiếp." },
      ],
    },
    quality: {
      title: "Cơ sở kỹ thuật cho quyết định mua hàng.",
      body: "Mẫu tham chiếu và yêu cầu của thị trường đích là cơ sở làm việc. Phạm vi kiểm nghiệm, chứng nhận và hồ sơ cần có được xác định theo sản phẩm, lô hàng và hợp đồng.",
      items: ["Mẫu đối chiếu, phẩm cấp và chỉ tiêu kỹ thuật đã thống nhất", `Đơn lô lớn / xuất khẩu: ${B2B_BULK_PACKING.vi.text}`, "Thông tin nguồn, mã lô, yêu cầu nhãn và điều kiện bảo quản", "Báo giá, PO/hợp đồng, kế hoạch sản xuất và giao nhận", "Kiểm nghiệm và chứng từ thị trường đích: thống nhất chỉ tiêu, đơn vị thực hiện, chi phí và lô áp dụng"],
    },
    cooperation: {
      title: "Kết nối thương mại và phát triển thị trường.",
      body: "Hoàng Long sẵn sàng trao đổi với nhà nhập khẩu, cơ quan xúc tiến thương mại, hiệp hội và đối tác doanh nghiệp về giới thiệu trà Việt, kết nối người mua và khảo sát năng lực cung ứng. Mục tiêu, phạm vi và trách nhiệm được xác định cho từng chương trình.",
      tracks: [
        { title: "Chương trình cung ứng B2B", body: "Xây dựng danh mục, mẫu đối chiếu và kế hoạch giao theo nhu cầu của mạng lưới phân phối hoặc thị trường nhập khẩu." },
        { title: "Xúc tiến & kết nối người mua", body: "Trao đổi cơ hội giới thiệu sản phẩm, buổi làm việc chuyên đề và kết nối nhà mua hàng phù hợp." },
        { title: "Khảo sát & phát triển sản phẩm", body: "Sắp xếp đánh giá nguồn trà, khảo sát nhà máy và thử sản phẩm trên cơ sở mục tiêu và phạm vi đã thống nhất." },
      ],
      brief: ["Đơn vị chủ trì, người phụ trách và mục tiêu buổi làm việc", "Thị trường, đối tượng mua hàng hoặc kênh phân phối", "Dòng trà, ứng dụng, yêu cầu kỹ thuật và sản lượng dự kiến", "Lịch triển khai, địa điểm làm việc và hồ sơ cần đối chiếu", "Bước tiếp theo, đầu mối thực hiện và cách đánh giá kết quả"],
      cta: "Trao đổi chương trình hợp tác",
    },
    evidence: {
      title: "Hồ sơ phục vụ thẩm định đối tác.",
      body: "Đối tác có thể thống nhất phạm vi hồ sơ cần thẩm định theo sản phẩm, thị trường và mục tiêu hợp tác. Tài liệu giao dịch và thông tin khách hàng được trao đổi riêng theo phạm vi cho phép.",
      items: [
        { title: "Pháp nhân & đầu mối", body: "Thông tin doanh nghiệp, mã số thuế, người phụ trách và thẩm quyền giao dịch được đối chiếu trước khi ký kết." },
        { title: "Sản xuất & nguồn nguyên liệu", body: "Ảnh thực tế, quy trình chế biến, cơ sở lập kế hoạch sản lượng và thông tin nguồn của sản phẩm cần đánh giá." },
        { title: "Sản phẩm & chất lượng", body: "Mẫu, yêu cầu kỹ thuật và kết quả kiểm nghiệm nếu có, ghi rõ ngày, lô và phạm vi áp dụng." },
        { title: "Kinh nghiệm giao nhận", body: "Hồ sơ lô đã thực hiện, chứng từ vận chuyển hoặc biên bản giao nhận khi được phép sử dụng; không tự công khai thông tin khách hàng." },
      ],
    },
    exportContact: {
      title: "Đầu mối phát triển xuất khẩu",
      scope: "Phụ trách phát triển thị trường, kết nối đối tác và điều phối các yêu cầu hợp tác xuất khẩu của Hoàng Long.",
    },
    contact: {
      title: "Một đầu mối cho kế hoạch hợp tác.",
      officeLabel: "Văn phòng giao dịch & kho · Hà Nội",
      visitNote: "36B QL2A là văn phòng và kho. Khảo sát nhà máy Tân Lập, Hà Giang được sắp xếp riêng theo lịch và phạm vi làm việc.",
      legalNote: `${PROFILE_LEGAL.name} · Mã số thuế ${PROFILE_LEGAL.taxNumber}. Điều khoản và người ký được xác nhận trong hồ sơ giao dịch.`,
      map: "Đường đến văn phòng Hà Nội",
    },
    images: { origin: "Ảnh nguồn trà trong hồ sơ Hoàng Long", production: "Dây chuyền chế biến trong hồ sơ Hoàng Long", productionCaption: "Cơ sở chế biến · Hồ sơ Hoàng Long" },
    edition: "Bản cập nhật 23/10/2026",
    editionNote: "Hồ sơ phục vụ trao đổi doanh nghiệp. Danh mục và điều kiện cung ứng được xác nhận theo chương trình hợp tác; PDF là bản tại ngày phát hành.",
  },
  en: {
    packing: B2B_BULK_PACKING.en,
    eyebrow: "Hoàng Long · Tea production & export development",
    title: "Vietnamese tea. A foundation for lasting partnerships.",
    intro: "From highland raw materials to processing in Hà Giang, Hoàng Long connects tea-making experience with the requirements of importers, distributors and market-development partners. Each supply programme starts with a technical brief, reference samples and a practical implementation plan.",
    actions: { home: "House of Hoàng Long", catalog: "Supply catalogue", pdf: "Company capabilities & catalogue PDF", quote: "Submit a cooperation brief", sample: "Evaluate tea samples", call: "Discuss your requirements", zalo: "Hoàng Long on Zalo", story: "Tea origins & processing" },
    overview: {
      title: "Production at origin. Organised around the market.",
      body: "Hoàng Long builds on family tea-making experience, raw materials from Northwest Vietnam and processing at Tân Lập, Hà Giang. We focus on supply programmes with defined product requirements, realistic production plans and agreed delivery responsibilities.",
      facts: [
        { label: "Experience", value: "Making tea since 1995", note: "The foundation of the Hoàng Long family's tea-making experience." },
        { label: "Indicative production capacity", value: "50–100 tonnes/month", note: "Declared by Hoàng Long; product mix, available volume and timing are coordinated against the production plan." },
        { label: "Processing & EXW collection", value: "Tân Lập · Hà Giang", note: "Hoàng Long Tea Factory. The Hanoi commercial office and warehouse are a separate location." },
        { label: "Cooperation focus", value: "Distribution · Export", note: "From sample and market evaluation to shipments and subsequent supply planning." },
      ],
    },
    origins: {
      title: "Value begins at the tea's origin.",
      body: "Northwest Vietnam and Hà Giang underpin Hoàng Long's raw-material base. Highland tea selection and processing methods, including steam processing with Japanese technology, provide a starting point for developing products around their intended application and market segment.",
      entries: [
        { title: "Raw-material origins", body: "Identify the region, season and characteristics suited to the tea. Lot-specific origin information is reviewed during sampling and ordering." },
        { title: "Processing approach", body: "Discuss grade, appearance, flavour and application to select an appropriate process and reference sample." },
        { title: "Long-term value", body: "Our direction is to develop the value of Vietnamese tea through market-fit products, structured feedback and cooperation across successive supply cycles." },
      ],
    },
    supply: {
      title: "One supply programme. Four points of agreement.",
      intro: "A responsible contact coordinates the initial brief, sample evaluation, commercial proposal and delivery. Commitments are recorded for the specific programme or contract.",
      steps: [
        { title: "Define the market brief", body: "Destination market, application, distribution channel, planned volume and implementation schedule." },
        { title: "Evaluate samples & capability", body: "Review reference samples, testing requirements, processing capacity and a factory assessment where appropriate." },
        { title: "Agree on commercial requirements", body: "Confirm packing, quantity, price, delivery terms, payment and each party's documentation responsibilities." },
        { title: "Implement & reconcile delivery", body: "Track goods readiness, packing, transport and delivery evidence, then record feedback for the next shipment." },
      ],
    },
    quality: {
      title: "A technical basis for procurement decisions.",
      body: "Reference samples and destination-market requirements form the working basis. Testing, certification and documentation scope are established for the product, lot and contract.",
      items: ["Agreed reference samples, grades and technical specifications", `Bulk / export orders: ${B2B_BULK_PACKING.en.text}`, "Product origin, lot identification, labelling and storage requirements", "Quotation, PO/contract, production and delivery plans", "Market-specific testing and documents: agree parameters, provider, cost and applicable lot"],
    },
    cooperation: {
      title: "Trade connections and market development.",
      body: "Hoàng Long welcomes discussions with importers, trade-promotion bodies, associations and business partners about presenting Vietnamese tea, connecting buyers and assessing supply capability. Objectives, scope and responsibilities are agreed for each programme.",
      tracks: [
        { title: "B2B supply programmes", body: "Develop a range, reference samples and delivery plans around a distribution network or importing market." },
        { title: "Trade promotion & buyer connections", body: "Discuss product presentations, focused business meetings and introductions to suitable buyers." },
        { title: "Site assessment & product development", body: "Arrange origin and factory assessments and product trials against agreed objectives and scope." },
      ],
      brief: ["Convening organisation, responsible contact and meeting objectives", "Market, buyer audience or distribution channel", "Tea range, application, technical requirements and planned volume", "Schedule, meeting location and documents for review", "Next action, responsible person and how results will be assessed"],
      cta: "Discuss a cooperation programme",
    },
    evidence: {
      title: "Documentation for partner due diligence.",
      body: "Partners can agree a document-review scope around the product, market and cooperation objectives. Transaction records and customer information are shared privately within the permitted scope.",
      items: [
        { title: "Entity & responsible contacts", body: "Company identity, tax number, responsible contacts and transaction authority are reviewed before signing." },
        { title: "Production & origins", body: "Actual photographs, processing steps, the basis for volume planning and product-origin information relevant to the assessment." },
        { title: "Products & quality", body: "Samples, specifications and any available test results, with their date, lot and applicable scope." },
        { title: "Delivery experience", body: "Completed-shipment records, transport documents or delivery acknowledgements where disclosure is permitted; customer information is not published automatically." },
      ],
    },
    exportContact: {
      title: "Export development contact",
      scope: "Responsible for market development, partner connections and coordination of Hoàng Long's export cooperation enquiries.",
    },
    contact: {
      title: "One point of contact for your cooperation plan.",
      officeLabel: "Commercial office & warehouse · Hanoi",
      visitNote: "36B QL2A is the office and warehouse. Visits to the Tân Lập, Hà Giang factory are arranged separately against an agreed agenda.",
      legalNote: `${PROFILE_LEGAL.name} · Vietnam tax ID ${PROFILE_LEGAL.taxNumber}. Terms and signing authority are confirmed in the transaction documents.`,
      map: "Directions to the Hanoi office",
    },
    images: { origin: "Tea-origin photograph from the Hoàng Long profile", production: "Processing line from the Hoàng Long profile", productionCaption: "Processing facility · Hoàng Long profile" },
    edition: "Updated 23 October 2026",
    editionNote: "Prepared for business discussions. The range and supply terms are confirmed for each cooperation programme; the PDF is a dated edition.",
  },
};

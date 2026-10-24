import { PROFILE_LEGAL } from "./company-profile.js";
import { EVENT_CONTACT } from "./event-contact.js";
import { EXPORT_DEVELOPMENT_CONTACT } from "./export-sales-profiles.js";
import { B2B_BULK_PACKING } from "./b2b-packing.js";

// Public export product and company information. Specifications and commercial
// commitments are confirmed for the selected sample, grade and order.
export const PACK_REVISION = "2026-10-24";

export const PACK_DOCUMENTS = Object.freeze({
  vi: Object.freeze({
    brief: "/downloads/hoang-long-cooperation-brief-vi.pdf",
    profile: "/downloads/hoang-long-corporate-profile-vi.pdf",
    appendix: "/downloads/hoang-long-product-annex-vi.pdf",
  }),
  en: Object.freeze({
    brief: "/downloads/hoang-long-cooperation-brief-en.pdf",
    profile: "/downloads/hoang-long-corporate-profile-en.pdf",
    appendix: "/downloads/hoang-long-product-annex-en.pdf",
  }),
});

export const INSTITUTIONAL_PACK = {
  vi: {
    eyebrow: "Hoàng Long · Trà Việt Nam",
    title: "Trà xuất khẩu.",
    intro: "Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Hoa Ngọc Lan. Bốn dòng trà chủ lực của Hoàng Long, cung ứng dạng trà khô rời cho nhập khẩu và phân phối.",
    brief: {
      title: "Danh mục trà xuất khẩu Hoàng Long",
      summary: "Hai dòng hồng trà, một dòng lục trà Shan và một dòng trà xanh hương hoa. Hoàng Long giới thiệu Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Hoa Ngọc Lan cho nhà nhập khẩu, nhà phân phối và doanh nghiệp kinh doanh trà.",
      objective: "Cung cấp mẫu sản phẩm, hồ sơ kỹ thuật và báo giá theo phẩm cấp, lượng đặt, quy cách và thị trường nhập khẩu.",
      contribution: [
        { title: "Bốn dòng trà chủ lực", body: "Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Hoa Ngọc Lan. Cung ứng dạng trà khô rời; phẩm cấp được lựa chọn theo mẫu chào hàng." },
        { title: "Đóng bao cho đơn lô lớn", body: "Bao PP/PE 20, 30 hoặc 35 kg. Khối lượng mỗi bao và nội dung nhãn được thống nhất theo ngoại hình trà và yêu cầu của người mua." },
        { title: "Mẫu, báo giá & lịch hàng", body: "Đầu mối xuất khẩu điều phối mẫu và yêu cầu kỹ thuật; báo giá xác định sản phẩm, khối lượng, quy cách và điều kiện nhận hàng EXW." },
      ],
      request: [
        { title: "Sản phẩm & lượng đặt", body: "Tên dòng trà, phẩm cấp mong muốn, khối lượng đơn thử và kế hoạch mua tiếp nếu có." },
        { title: "Thị trường & tiêu chuẩn", body: "Nước nhập khẩu, kênh phân phối, yêu cầu cảm quan, chỉ tiêu kỹ thuật và bộ chứng từ cần cung cấp." },
        { title: "Quy cách & thời điểm nhận", body: "Khối lượng mỗi bao, vật liệu, nhãn, nơi nhận và thời gian dự kiến. Trao đổi riêng các yêu cầu ngoài quy cách tiêu chuẩn." },
      ],
      path: [
        { title: "Lựa chọn sản phẩm", body: "Chọn dòng trà, mẫu và yêu cầu kỹ thuật của thị trường nhập khẩu." },
        { title: "Xác nhận mẫu & báo giá", body: "Đối chiếu mẫu, thống nhất thông số, quy cách, giá và điều kiện thanh toán." },
        { title: "Xác nhận đơn & giao nhận", body: "Chốt lịch hàng, hồ sơ, đầu mối giao nhận và trách nhiệm theo hợp đồng." },
      ],
      outcome: "Hồ sơ chào hàng gồm sản phẩm được chọn, mẫu tham chiếu, thông số áp dụng, quy cách, giá và lịch hàng dự kiến.",
    },
    company: {
      mandate: {
        title: "Hoàng Long — Sản xuất & cung ứng trà",
        body: "Hoàng Long cung ứng trà Việt Nam cho nhà nhập khẩu, nhà phân phối và doanh nghiệp kinh doanh trà. Danh mục xuất khẩu tập trung vào Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc và Hoa Ngọc Lan. Hoạt động chế biến đặt tại Tân Lập, Hà Giang; văn phòng giao dịch và kho tại Sóc Sơn, Hà Nội.",
      },
      origin: {
        title: "Nghề trà từ năm 1995",
        body: "Kinh nghiệm làm trà của gia đình Hoàng Long được bồi đắp từ năm 1995, gắn với nguồn trà vùng cao Tây Bắc và hoạt động chế biến tại Hà Giang. Nguồn nguyên liệu, niên vụ và đơn vị chế biến được xác định trong hồ sơ của từng sản phẩm và lô chào hàng.",
        items: [
          { title: "Nguồn nguyên liệu", body: "Nguồn trà và niên vụ được xác nhận theo sản phẩm và lô chào hàng. Hồ sơ không đồng nhất xuất xứ của mọi dòng trà trong danh mục." },
          { title: "Sản xuất & tuyển chọn", body: "Danh mục gồm trà sản xuất và trà tuyển chọn. Mẫu chào hàng xác định dòng sản phẩm, phẩm cấp và đơn vị chế biến áp dụng." },
        ],
      },
      capability: {
        title: "Sản xuất & quy cách xuất khẩu",
        body: "Điểm nhận hàng EXW tại Nhà máy Trà Hoàng Long, Tân Lập, Hà Giang. Trà xuất khẩu đóng bao PP/PE theo ngoại hình sản phẩm và yêu cầu sử dụng. Số lượng có thể giao và mốc hàng sẵn được xác nhận theo đơn.",
        facts: [
          { label: "Năng lực sản xuất tham chiếu", value: "50–100 tấn/tháng", note: "Theo công bố của Hoàng Long. Cơ cấu sản phẩm và lịch khả dụng được cân đối theo kế hoạch sản xuất và từng đơn hàng." },
          { label: "Chế biến & điểm nhận hàng EXW", value: "Tân Lập · Hà Giang", note: "Nhận hàng tại Nhà máy Trà Hoàng Long. Trách nhiệm bốc hàng, vận tải và thủ tục được phân công trong hồ sơ giao dịch." },
          { label: "Quy cách đơn lô lớn / xuất khẩu", value: B2B_BULK_PACKING.vi.value, note: "Chọn theo ngoại hình trà và nhu cầu sử dụng; xác nhận vật liệu, khối lượng tịnh và nhãn theo đơn. Tách biệt quy cách bán lẻ." },
          { label: "Khung thời gian dự kiến", value: "2–8 tuần", note: "Gồm thời gian vận chuyển, chưa gồm chậm trễ ngoài dự kiến. Lịch thực hiện và chi phí giao nhận được thỏa thuận riêng theo lượng đặt, điểm đến và điều kiện EXW." },
        ],
      },
      portfolio: {
        title: "Bốn dòng trà chủ lực",
        body: "Hồng Trà Mật và Hồng Trà Khói thuộc nhóm hồng trà Shan; Xanh Mộc là dòng lục trà Shan; Hoa Ngọc Lan thuộc nhóm trà xanh hương hoa. Hồ sơ sản phẩm xuất khẩu trình bày riêng từng dòng trà và quy cách cung ứng.",
        segments: [
          { title: "Hồng Trà Mật", body: "Hồng trà Shan · Mật ong, caramel · Vị êm" },
          { title: "Hồng Trà Khói", body: "Hồng trà Shan · Khói, đậu đen, gỗ · Đậm vị" },
          { title: "Xanh Mộc", body: "Lục trà Shan · Thanh mát, không gắt chát" },
          { title: "Hoa Ngọc Lan", body: "Trà xanh ướp hoa ngọc lan khô" },
        ],
      },
      delivery: {
        title: "Điều kiện chào hàng & giao nhận",
        body: "Báo giá được lập cho sản phẩm, phẩm cấp, lượng đặt và quy cách cụ thể. Mẫu tham chiếu, thông số, bao bì, nhãn, thanh toán và lịch hàng được ghi trong hồ sơ giao dịch.",
        steps: [
          { title: "Chọn sản phẩm & mẫu", body: "Xác định dòng trà, phẩm cấp, lượng đặt và thị trường nhập khẩu. Thống nhất bộ mẫu và yêu cầu kỹ thuật." },
          { title: "Duyệt mẫu & quy cách", body: "Đối chiếu cảm quan, thông số, bao bì và nhãn. Xác định phạm vi kiểm nghiệm hoặc khảo sát nhà máy khi cần." },
          { title: "Xác nhận đơn hàng", body: "Chốt giá, thanh toán, lượng, quy cách và lịch hàng sẵn. Phân công bốc hàng, vận tải và thủ tục theo điều kiện giao dịch." },
          { title: "Bàn giao & đối chiếu", body: "Kiểm tra khối lượng, nhãn lô, tình trạng bao và chứng từ. Ghi nhận kết quả nhận hàng và yêu cầu cho đơn tiếp theo." },
        ],
      },
      quality: {
        title: "Thông số & hồ sơ sản phẩm",
        body: "Hồ sơ kỹ thuật được lập theo phẩm cấp và lô hàng, gồm nhận diện sản phẩm, chỉ tiêu cảm quan, thông số vật lý và các yêu cầu kiểm nghiệm của thị trường nhập khẩu. Phạm vi áp dụng của từng tài liệu cần gắn với mẫu, lô và ngày phát hành.",
        items: [
          { title: "Mẫu & tiêu chuẩn chấp nhận", body: "Mã mẫu, phẩm cấp, ngoại hình, hương, sắc nước và vị. Thông số, giới hạn chấp nhận và phương pháp đánh giá được thống nhất trước khi xác nhận đơn." },
          { title: "Kiểm nghiệm theo thị trường", body: "Xác định chỉ tiêu, phòng thử nghiệm, lịch lấy mẫu và chi phí theo yêu cầu nhập khẩu. Kết quả áp dụng trong phạm vi mẫu, lô và ngày ghi trên tài liệu." },
          { title: "Lô hàng & chứng từ", body: "Mã lô, khối lượng tịnh, loại bao, nhãn và bảo quản. Bộ chứng từ thương mại, vận tải, xuất xứ hoặc hồ sơ khác được xác định theo giao dịch." },
        ],
      },
      development: {
        title: "Nhập khẩu, phân phối & nguyên liệu trà",
        body: "Bốn sản phẩm chủ lực được giới thiệu cho nhà nhập khẩu, nhà bán sỉ và doanh nghiệp trà. Việc lựa chọn phẩm cấp và dạng cung ứng dựa trên danh mục hàng, phân khúc và yêu cầu kỹ thuật của người mua.",
        priorities: [
          { title: "Nhà nhập khẩu", body: "Lựa chọn sản phẩm và phẩm cấp cho thị trường nhận hàng; thống nhất thông số và hồ sơ nhập khẩu." },
          { title: "Nhà phân phối & thương hiệu trà", body: "Xây danh mục từ bốn dòng trà chủ lực, với quy cách và nhãn được xác nhận theo đơn hàng." },
          { title: "Doanh nghiệp sử dụng nguyên liệu trà", body: "Đánh giá mẫu theo tiêu chí nguyên liệu của doanh nghiệp, lượng sử dụng và kế hoạch tái cung ứng." },
        ],
      },
      contact: {
        title: "Liên hệ xuất khẩu",
        body: "Anh Long phụ trách yêu cầu sản phẩm, mẫu và báo giá xuất khẩu của Hoàng Long. Vui lòng gửi tên dòng trà, khối lượng dự kiến, quy cách và thị trường nhận hàng để chuẩn bị hồ sơ chào hàng.",
      },
    },
    labels: {
      brief: "Giới thiệu chào hàng xuất khẩu",
      company: "Hồ sơ doanh nghiệp",
      catalog: "Hồ sơ sản phẩm xuất khẩu",
      download: "Tải tài liệu PDF",
      viewBrief: "Xem giới thiệu chào hàng",
      viewCompany: "Xem hồ sơ doanh nghiệp",
      viewCatalog: "Xem hồ sơ sản phẩm",
      objective: "Sản phẩm & đề nghị chào hàng",
      contribution: "Sản phẩm & cung ứng",
      request: "Thông tin yêu cầu báo giá",
      path: "Từ mẫu đến đơn hàng",
      outcome: "Cơ sở chào hàng",
      proposal: "Giới thiệu chào hàng",
      companyFacts: "Thông tin doanh nghiệp công bố",
      diligence: "Hồ sơ phục vụ thẩm định",
      diligenceNote: "Ảnh thực tế, giấy tờ pháp nhân, kết quả kiểm nghiệm và chứng từ giao dịch được bổ sung theo phạm vi có thể cung cấp; không dùng hình minh họa thay cho bằng chứng.",
      mediaPending: "Vị trí dành cho ảnh thực tế · Hoàng Long sẽ bổ sung",
      appendixNote: "Hồ sơ giới thiệu bốn dòng trà chủ lực. Mẫu, phẩm cấp, thông số, giá và điều kiện giao hàng được xác nhận trong báo giá theo đơn.",
      documentNote: "Giá, thông số và lịch giao nhận được xác nhận trong báo giá, hồ sơ lô hàng và hợp đồng.",
      legalName: PROFILE_LEGAL.name,
      taxLabel: "Mã số thuế",
      taxNumber: PROFILE_LEGAL.taxNumber,
      factoryLabel: "Nhà máy & điểm nhận hàng EXW",
      factory: "Nhà máy Trà Hoàng Long — Tân Lập, Hà Giang",
      officeLabel: "Văn phòng giao dịch & kho",
      office: EVENT_CONTACT.address,
      directorLabel: "Đầu mối phát triển xuất khẩu",
      director: EXPORT_DEVELOPMENT_CONTACT.name,
      directorRole: EXPORT_DEVELOPMENT_CONTACT.role,
      directorPhone: EXPORT_DEVELOPMENT_CONTACT.phone,
      directorPhoneLabel: EXPORT_DEVELOPMENT_CONTACT.phoneLabel,
      houseLabel: "Hoàng Long · Liên hệ chung",
      housePhone: EVENT_CONTACT.phone,
      housePhoneLabel: EVENT_CONTACT.phoneLabel,
      website: EVENT_CONTACT.website,
      email: "hotro.trahoanglong@gmail.com",
      edition: "Bản ngày 24/10/2026",
    },
  },
  en: {
    eyebrow: "Hoàng Long · Vietnamese tea",
    title: "Export tea portfolio.",
    intro: "Honey-Note Black Tea, Smoky Black Tea, Shan Green Tea — Mộc and Magnolia-Scented Green Tea. Four core loose-leaf selections for import and distribution.",
    brief: {
      title: "Hoàng Long export tea portfolio",
      summary: "Two black teas, a Shan green tea and a floral green tea. Hoàng Long presents Honey-Note Black Tea, Smoky Black Tea, Shan Green Tea — Mộc and Magnolia-Scented Green Tea for importers, distributors and tea businesses.",
      objective: "Provide product samples, technical documentation and quotations by grade, volume, packing and destination market.",
      contribution: [
        { title: "Four core tea selections", body: "Honey-Note Black Tea, Smoky Black Tea, Shan Green Tea — Mộc and Magnolia-Scented Green Tea. Supplied loose-leaf, with grades selected against offered samples." },
        { title: "Bulk packing", body: "PP/PE sacks of 20, 30 or 35 kg. Net weight and label details are agreed according to leaf form and buyer requirements." },
        { title: "Samples, quotations & availability", body: "The export contact coordinates samples and technical requirements. Offers identify product, volume, packing and EXW collection terms." },
      ],
      request: [
        { title: "Product & volume", body: "Tea selection, requested grade, trial-order quantity and any subsequent purchasing plan." },
        { title: "Market & specifications", body: "Importing country, distribution channel, sensory requirements, technical parameters and required documents." },
        { title: "Packing & receiving date", body: "Sack weight, material, labels, destination and planned receiving date. Requirements outside standard packing are discussed separately." },
      ],
      path: [
        { title: "Select products", body: "Define the tea, reference samples and destination-market technical requirements." },
        { title: "Approve samples & offer", body: "Agree the reference sample, specification, packing, price and payment terms." },
        { title: "Confirm order & handover", body: "Finalise readiness dates, records, logistics contacts and contractual responsibilities." },
      ],
      outcome: "An offer identifying the selected product, reference sample, applicable specification, packing, price and planned goods-readiness date.",
    },
    company: {
      mandate: {
        title: "Hoàng Long — Tea production & supply",
        body: "Hoàng Long supplies Vietnamese tea to importers, distributors and tea businesses. The export portfolio centres on Honey-Note Black Tea, Smoky Black Tea, Shan Green Tea — Mộc and Magnolia-Scented Green Tea. Processing is based in Tân Lập, Hà Giang, with a commercial office and warehouse in Sóc Sơn, Hanoi.",
      },
      origin: {
        title: "Family tea-making experience since 1995",
        body: "Hoàng Long draws on family tea-making experience since 1995, Northwest Vietnamese highland tea and processing in Hà Giang. Material origin, harvest information and processing source are identified in the records for each product and offered lot.",
        items: [
          { title: "Material origin", body: "Origin and harvest information are confirmed for the selected product and offered lot. Products across the wider range do not necessarily share a single origin." },
          { title: "Production & selection", body: "The range includes manufactured and selected teas. The offered sample identifies the product, grade and applicable processing source." },
        ],
      },
      capability: {
        title: "Production & export packing",
        body: "EXW collection at Hoàng Long Tea Factory in Tân Lập, Hà Giang. Export tea is packed in PP/PE sacks selected for leaf form and intended use. Available volume and goods-readiness dates are confirmed per order.",
        facts: [
          { label: "Indicative production capacity", value: "50–100 tonnes/month", note: "Declared by Hoàng Long. Product mix and available timing are coordinated against the production plan and individual orders." },
          { label: "Processing & EXW collection", value: "Tân Lập · Hà Giang", note: "Collection at Hoàng Long Tea Factory. Responsibilities for loading, transport and formalities are set out in the transaction documents." },
          { label: "Large-bulk / export formats", value: B2B_BULK_PACKING.en.value, note: "Selected for leaf form and intended use; material, net weight and labels are confirmed per order. Separate from retail formats." },
          { label: "Indicative transaction timeline", value: "2–8 weeks", note: "Includes transit time and excludes unforeseen delays. Timing and delivery costs are agreed separately for the volume, destination and EXW terms." },
        ],
      },
      portfolio: {
        title: "Four core tea selections",
        body: "Honey-Note and Smoky Black Tea form the Shan black tea selection. Mộc is the Shan green tea, while Magnolia-Scented Green Tea provides the floral selection. The export product portfolio presents each line and its supply format separately.",
        segments: [
          { title: "Honey-Note Black Tea", body: "Shan black tea · Honey, caramel · Mellow" },
          { title: "Smoky Black Tea", body: "Shan black tea · Smoke, black bean, wood · Full-flavoured" },
          { title: "Shan Green Tea — Mộc", body: "Shan green tea · Refreshing, smooth" },
          { title: "Magnolia-Scented Green Tea", body: "Green tea · Dried magnolia flowers" },
        ],
      },
      delivery: {
        title: "Offer basis & delivery terms",
        body: "Quotations identify the product, grade, volume and packing. The reference sample, specification, packaging, labels, payment and goods-readiness schedule are recorded in the transaction documents.",
        steps: [
          { title: "Product & sample selection", body: "Define the tea, grade, volume and destination market. Agree sample requirements and technical parameters." },
          { title: "Sample & packing approval", body: "Review sensory criteria, specifications, packing and labels. Define any laboratory testing or factory-visit requirements." },
          { title: "Order confirmation", body: "Agree price, payment, volume, packing and goods-readiness dates. Allocate loading, transport and formalities under the agreed terms." },
          { title: "Handover & reconciliation", body: "Check net weight, lot labels, sack condition and documents. Record receiving feedback and requirements for the next order." },
        ],
      },
      quality: {
        title: "Specifications & product documentation",
        body: "Technical files are prepared by grade and shipment lot, covering product identity, sensory criteria, physical parameters and destination-market testing requirements. Each document identifies its applicable sample, lot and issue date.",
        items: [
          { title: "Samples & acceptance criteria", body: "Sample reference, grade, leaf appearance, aroma, liquor colour and taste. Specifications, acceptance limits and evaluation methods are agreed before order confirmation." },
          { title: "Destination-market testing", body: "Define parameters, laboratory, sampling dates and costs around import requirements. Results apply to the sample, lot and dates identified on the document." },
          { title: "Lot identity & documents", body: "Lot code, net weight, sack type, labels and storage. Commercial, transport, origin and any further documentation are defined for the transaction." },
        ],
      },
      development: {
        title: "Import, distribution & tea ingredients",
        body: "The four core products are offered to importers, wholesalers and tea businesses. Grade and supply format are selected around the buyer’s range, segment and technical requirements.",
        priorities: [
          { title: "Importers", body: "Select products and grades for the destination market, with agreed specifications and import documentation." },
          { title: "Distributors & tea brands", body: "Develop a range from four core selections, with packing and labels confirmed per order." },
          { title: "Tea-ingredient buyers", body: "Evaluate samples against ingredient requirements, consumption volumes and repeat-procurement plans." },
        ],
      },
      contact: {
        title: "Export enquiries",
        body: "Anh Long handles Hoàng Long’s export product, sample and quotation enquiries. Share the tea selection, expected volume, packing and destination market for a product-specific offer.",
      },
    },
    labels: {
      brief: "Export sales brief",
      company: "Corporate profile",
      catalog: "Export product portfolio",
      download: "Download PDF",
      viewBrief: "Read the sales brief",
      viewCompany: "View the corporate profile",
      viewCatalog: "View product profiles",
      objective: "Products & offer scope",
      contribution: "Products & supply",
      request: "Information for a quotation",
      path: "From sample to order",
      outcome: "Offer basis",
      proposal: "Export sales introduction",
      companyFacts: "Company-declared operating facts",
      diligence: "Supporting due-diligence records",
      diligenceNote: "Actual photographs, company records, test results and transaction documents are added within the available disclosure scope; illustrative images are not evidence.",
      mediaPending: "Reserved for an actual photograph · To be provided by Hoàng Long",
      appendixNote: "Profiles of the four core tea selections. Samples, grades, specifications, prices and delivery terms are confirmed in the order-specific offer.",
      documentNote: "Prices, specifications and delivery dates are confirmed in the quotation, lot documentation and contract.",
      legalName: PROFILE_LEGAL.name,
      taxLabel: "Vietnam tax ID",
      taxNumber: PROFILE_LEGAL.taxNumber,
      factoryLabel: "Factory & EXW collection",
      factory: "Hoàng Long Tea Factory — Tân Lập, Hà Giang",
      officeLabel: "Commercial office & warehouse",
      office: "36B QL2A, Sóc Sơn, Hanoi, Vietnam",
      directorLabel: "Export development contact",
      director: EXPORT_DEVELOPMENT_CONTACT.name,
      directorRole: EXPORT_DEVELOPMENT_CONTACT.roleEn,
      directorPhone: EXPORT_DEVELOPMENT_CONTACT.phone,
      directorPhoneLabel: EXPORT_DEVELOPMENT_CONTACT.phoneLabel,
      houseLabel: "Hoàng Long · General enquiries",
      housePhone: EVENT_CONTACT.phone,
      housePhoneLabel: EVENT_CONTACT.phoneLabel,
      website: EVENT_CONTACT.website,
      email: "hotro.trahoanglong@gmail.com",
      edition: "Edition dated 24 October 2026",
    },
  },
};

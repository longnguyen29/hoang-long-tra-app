import { PROFILE_LEGAL } from "./company-profile.js";
import { EVENT_CONTACT } from "./event-contact.js";
import { EXPORT_DEVELOPMENT_CONTACT } from "./export-sales-profiles.js";
import { B2B_BULK_PACKING } from "./b2b-packing.js";

// A public discussion pack, not a certificate register or a record of an
// endorsed government programme. Future cooperation is labelled as a proposal.
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
    eyebrow: "Hoàng Long · Hợp tác thương mại & phát triển thị trường",
    title: "Mở rộng giá trị trà Việt qua hợp tác thực chất.",
    intro: "Từ nền tảng làm trà tại Hà Giang, Hoàng Long kết nối sản phẩm, người mua và phương án cung ứng theo nhu cầu thị trường. Cùng đối tác, chúng tôi hướng tới quan hệ thương mại có khả năng phát triển lâu dài.",
    brief: {
      title: "Đề xuất khung hợp tác phát triển giao thương trà Việt",
      summary: "Hoàng Long đề xuất cùng đơn vị xúc tiến và đối tác thương mại xây dựng một chương trình làm việc theo nhóm sản phẩm và kênh tiêu thụ. Trọng tâm là kết nối đúng người mua, đánh giá khả năng đáp ứng và chuẩn bị giao dịch thử có cơ sở thương mại; mở rộng khi sản phẩm và cách cung ứng được thị trường chấp nhận.",
      objective: "Chuyển hoạt động giới thiệu trà Việt thành cơ hội mua hàng có thể theo đuổi: xác định đối tác, sản phẩm phù hợp, điều kiện tiếp cận thị trường và trách nhiệm triển khai của mỗi bên.",
      contribution: [
        { title: "Nền tảng sản xuất và làm việc tại nguồn", body: "Hoạt động chế biến tại Tân Lập, Hà Giang; kinh nghiệm lựa chọn và làm trà của gia đình từ năm 1995. Hoàng Long chuẩn bị phương án sản phẩm, mẫu đánh giá và nội dung khảo sát theo mục tiêu mua hàng." },
        { title: "Danh mục cho các mô hình kinh doanh", body: "Lục trà, hồng trà, trà ướp hương và các dòng tuyển chọn cho nguyên liệu đồ uống, phân phối và chuyên trà. Mỗi đề xuất phân biệt xuất xứ, phẩm cấp, quy cách và phạm vi hồ sơ của sản phẩm." },
        { title: "Đầu mối theo đuổi sau cuộc gặp", body: "Giám đốc Phát triển Xuất khẩu phụ trách trao đổi yêu cầu, điều phối mẫu và đề xuất thương mại. Hoàng Long cùng đối tác thống nhất bước tiếp theo, người phụ trách và mốc phản hồi để cơ hội được tiếp tục xử lý." },
      ],
      request: [
        { title: "Kết nối người mua có nhu cầu phù hợp", body: "Giới thiệu nhà nhập khẩu, nhà phân phối, doanh nghiệp F&B hoặc đơn vị chuyên trà có kênh bán và đề bài mua hàng rõ ràng. Ưu tiên cuộc gặp có thông tin trước về nhóm trà, ứng dụng, phân khúc và lượng dự kiến." },
        { title: "Làm rõ điều kiện tiếp cận thị trường", body: "Trao đổi yêu cầu kỹ thuật, nhãn, nhập khẩu và tập quán thương mại của thị trường đích; xác định nội dung cần chuyên gia hoặc đơn vị thẩm định phù hợp hỗ trợ trước khi phát hành đề xuất chính thức." },
        { title: "Tổ chức bước thử có người chịu trách nhiệm", body: "Thống nhất bộ mẫu, cách đánh giá và lịch trao đổi kết quả; sắp xếp khảo sát nhà máy khi cần. Nếu đạt tiêu chí, hai doanh nghiệp tiếp tục đàm phán lô thử, điều kiện thương mại và kế hoạch mua tiếp." },
      ],
      path: [
        { title: "Xác lập đề bài", body: "Chọn thị trường, nhóm người mua, sản phẩm và đầu mối. Thống nhất thông tin cần chuẩn bị cho buổi làm việc." },
        { title: "Đánh giá khả năng phù hợp", body: "Gửi mẫu, thử ứng dụng và đối chiếu yêu cầu kỹ thuật. Ghi nhận kết quả và các điểm cần hoàn thiện." },
        { title: "Chuyển sang giao dịch", body: "Lập đề xuất lô thử: giá, lượng, quy cách, hồ sơ và lịch hàng. Mở rộng theo kết quả giao dịch thực tế." },
      ],
      outcome: "Kết quả mong muốn: danh sách cơ hội phù hợp, đầu mối phụ trách, phản hồi mẫu và bước thương mại tiếp theo — làm cơ sở theo đuổi giao dịch và đánh giá hiệu quả kết nối.",
    },
    company: {
      mandate: {
        title: "Một nền tảng sản xuất. Một hướng phát triển thị trường.",
        body: "Trà Việt có thể hiện diện ở nhiều phân khúc: nguyên liệu cho đồ uống, danh mục của nhà phân phối và sản phẩm thưởng thức có bản sắc. Để biến khả năng đó thành kinh doanh, người mua cần nhiều hơn một câu chuyện vùng trà: họ cần chọn đúng sản phẩm, hiểu cách sử dụng, đánh giá được chất lượng và có phương án mua tiếp. Hoàng Long kết nối kinh nghiệm làm trà, hoạt động chế biến tại Hà Giang và đầu mối thương mại để giải quyết cùng một đề bài: đưa đặc tính của nguồn trà vào một phương án cung ứng phù hợp với thị trường.",
      },
      origin: {
        title: "Xuất phát từ nghề trà. Phát triển bằng yêu cầu của người mua.",
        body: "Kinh nghiệm làm trà của gia đình Hoàng Long được bồi đắp từ năm 1995. Hoạt động chế biến tại Tân Lập, Hà Giang gắn với nguồn trà vùng cao Tây Bắc và các dòng trà Việt trong danh mục. Từ nền tảng đó, hướng phát triển là lựa chọn phẩm cấp, cách chế biến và quy cách theo mục đích kinh doanh cụ thể của đối tác: một nền trà cho đồ uống, một dòng hàng phân phối hoặc một sản phẩm thưởng thức có nét riêng.",
        items: [
          { title: "Nguồn trà là điểm bắt đầu của sản phẩm", body: "Vùng nguyên liệu, mùa và hình thái lá tạo khác biệt về ngoại hình, hương và cấu trúc vị. Trao đổi mua hàng cần chuyển những đặc tính đó thành tiêu chí có thể đánh giá trên mẫu, trong công thức đồ uống hoặc trong danh mục phân phối." },
          { title: "Sản xuất và tuyển chọn bổ trợ cho danh mục", body: "Bên cạnh các dòng trà sản xuất, Hoàng Long cung ứng trà tuyển chọn để đáp ứng những nhu cầu khác nhau. Nguồn trà, đơn vị chế biến và hồ sơ được xác nhận theo từng sản phẩm, giúp người mua đánh giá đúng cơ sở của lựa chọn." },
        ],
      },
      capability: {
        title: "Năng lực được đặt trong một kế hoạch cung ứng cụ thể.",
        body: "Những thông tin dưới đây là cơ sở trao đổi ban đầu. Phương án thực hiện phải cân đối nhóm trà, phẩm cấp, mùa, tồn sẵn và lịch sản xuất. Lượng có thể giao, tiến độ và trách nhiệm của hai bên được xác nhận trong báo giá và hồ sơ đơn hàng.",
        facts: [
          { label: "Năng lực sản xuất tham chiếu", value: "50–100 tấn/tháng", note: "Theo công bố của Hoàng Long. Cơ cấu sản phẩm và lịch khả dụng được cân đối theo kế hoạch sản xuất và từng đơn hàng." },
          { label: "Chế biến & điểm nhận hàng EXW", value: "Tân Lập · Hà Giang", note: "Nhận hàng tại Nhà máy Trà Hoàng Long. Trách nhiệm bốc hàng, vận tải và thủ tục được phân công trong hồ sơ giao dịch." },
          { label: "Quy cách đơn lô lớn / xuất khẩu", value: B2B_BULK_PACKING.vi.value, note: "Chọn theo ngoại hình trà và nhu cầu sử dụng; xác nhận vật liệu, khối lượng tịnh và nhãn theo đơn. Tách biệt quy cách bán lẻ." },
          { label: "Khung thời gian dự kiến", value: "2–8 tuần", note: "Gồm thời gian vận chuyển, chưa gồm chậm trễ ngoài dự kiến. Lịch thực hiện và chi phí giao nhận được thỏa thuận riêng theo lượng đặt, điểm đến và điều kiện EXW." },
        ],
      },
      portfolio: {
        title: "Danh mục phục vụ ba đề bài thị trường.",
        body: "Hoàng Long bắt đầu từ cách đối tác sử dụng và phân phối trà, sau đó lựa chọn sản phẩm, phẩm cấp và quy cách. Danh mục chi tiết cùng thông tin từng loại trà nằm trong tài liệu tham khảo đính kèm.",
        segments: [
          { title: "Nguyên liệu đồ uống", body: "Lục trà, hồng trà và trà ướp hương cho doanh nghiệp F&B và nhà cung cấp nguyên liệu. Đánh giá trong công thức thực tế: nền vị, khả năng kết hợp, định mức trà và chi phí mỗi phần phục vụ. Các dòng chào hàng hiện có gồm trà xanh hấp, hồng trà khói, hồng trà OP1 và trà xanh hoa ngọc lan." },
          { title: "Nhập khẩu và phân phối", body: "Xây danh mục theo phân khúc giá, ngoại hình và hương vị cho nhà nhập khẩu, bán sỉ và đơn vị chuyên trà. Đề xuất kết nối mẫu tham chiếu với quy cách lô lớn, thông tin nguồn, yêu cầu thị trường đích và lịch mua; không chỉ so sánh giá trên mỗi kg." },
          { title: "Thưởng thức và quà tặng", body: "Trà Shan, trà ướp hương và các dòng tuyển chọn theo danh mục hiện hành. Tập trung vào nét riêng của hương vị, cách giới thiệu sản phẩm và quy cách phù hợp với người dùng. Nguồn sản xuất, xuất xứ thương mại và thông tin từng dòng được xác nhận riêng." },
        ],
      },
      delivery: {
        title: "Một lộ trình từ đề bài thị trường đến đơn hàng lặp lại.",
        body: "Bốn bước làm việc đề xuất giúp hai bên quyết định theo cùng một bộ thông tin. Mỗi bước cần có đầu ra rõ ràng trước khi chuyển từ giới thiệu sang cam kết thương mại.",
        steps: [
          { title: "Đề bài thị trường & lựa chọn mẫu", body: "Xác định người mua, kênh bán, ứng dụng, khoảng giá và lượng dự kiến. Hoàng Long đề xuất nhóm trà và bộ mẫu phù hợp; hai bên ghi rõ câu hỏi kỹ thuật hoặc nhập khẩu cần xử lý." },
          { title: "Đánh giá & cơ sở chấp nhận", body: "Thử mẫu trong điều kiện sử dụng của đối tác; ghi nhận phẩm cấp, tiêu chí cảm quan và yêu cầu thông số. Xác định nội dung kiểm nghiệm hoặc khảo sát nhà máy theo sản phẩm và mục tiêu mua hàng." },
          { title: "Báo giá & chuẩn bị lô hàng", body: "Thống nhất sản phẩm, lượng, bao bì, nhãn, giá, thanh toán và hồ sơ. Xác nhận mốc hàng sẵn, điều kiện giao nhận và bên phụ trách bốc hàng, vận tải, thủ tục; dùng mẫu và yêu cầu đã thống nhất làm cơ sở đối chiếu." },
          { title: "Giao nhận & phát triển đơn tiếp theo", body: "Đối chiếu lượng giao, tình trạng hàng và chứng từ theo đơn. Tổng hợp phản hồi sử dụng, vấn đề cần xử lý và nhu cầu tiếp theo để điều chỉnh cơ cấu sản phẩm hoặc lịch tái cung ứng." },
        ],
      },
      quality: {
        title: "Chất lượng cần được chứng minh ở đúng sản phẩm và lô hàng.",
        body: "Hoàng Long đề xuất xây hồ sơ làm việc trên ba lớp: mẫu tham chiếu, yêu cầu kỹ thuật và thông tin giao nhận. Kiểm nghiệm hoặc chứng nhận được xem xét theo thị trường, sản phẩm, lô và ngày cụ thể. Khung đánh giá dưới đây giúp hai bên xác định hồ sơ cần chuẩn bị và tiêu chí làm căn cứ mua hàng.",
        items: [
          { title: "Mẫu & yêu cầu sản phẩm", body: "Nhận diện dòng trà, phẩm cấp và mẫu được chọn; ghi tiêu chí ngoại hình, hương, sắc nước, vị và cách thử. Với trà pha chế, lưu điều kiện pha và ứng dụng để phản hồi có thể so sánh. Chỉ tiêu kỹ thuật, giới hạn chấp nhận và phương pháp đánh giá được thống nhất trước khi đặt hàng." },
          { title: "Hồ sơ & đối chiếu tại nguồn", body: "Xem thông tin pháp nhân, quy trình chế biến và ảnh thực tế phù hợp với sản phẩm. Khi cần kiểm nghiệm, xác định chỉ tiêu, phòng thử nghiệm, thời điểm lấy mẫu, chi phí và trách nhiệm. Kết quả hoặc chứng nhận chỉ có giá trị trong phạm vi ghi trên tài liệu." },
          { title: "Nhận diện lô & điều kiện giao nhận", body: "Đối chiếu mã lô, khối lượng, loại bao, nhãn, bảo quản và tình trạng hàng. Xác định các chứng từ áp dụng cho giao dịch: hợp đồng, invoice, packing list, vận tải, xuất xứ hoặc hồ sơ khác khi cần. Tài liệu có thông tin khách hàng được chia sẻ riêng trong phạm vi được phép." },
        ],
      },
      development: {
        title: "Định hướng hợp tác: tạo giá trị có thể duy trì.",
        body: "Hoàng Long tìm kiếm quan hệ trong đó mỗi bên có vai trò thương mại rõ ràng: người sản xuất hiểu yêu cầu thị trường, người mua có sản phẩm phù hợp, đơn vị xúc tiến tạo điều kiện cho đối thoại đúng đối tượng. Ba định hướng hợp tác dưới đây được đề xuất để cùng đối tác lựa chọn và cụ thể hóa thành chương trình làm việc.",
        priorities: [
          { title: "Phát triển danh mục có lý do thị trường", body: "Dùng phản hồi của người mua để chọn nhóm trà, ứng dụng và phân khúc; đặt đặc tính nguồn trà cạnh hiệu quả sử dụng và điều kiện kinh doanh. Ưu tiên sự phù hợp của sản phẩm hơn việc mở rộng danh mục đơn thuần." },
          { title: "Củng cố nền tảng cho tái cung ứng", body: "Làm rõ mẫu, quy cách, hồ sơ và chu kỳ mua; đưa kết quả lô trước vào kế hoạch lô sau. Mục tiêu là giảm khoảng cách giữa một đơn thử thành công và một quan hệ mua hàng có thể tiếp tục." },
          { title: "Xây kết nối theo kết quả thực hiện", body: "Phối hợp hiệp hội, cơ quan xúc tiến và đối tác thương mại trên một đề bài cụ thể. Theo dõi việc đánh giá mẫu, nội dung còn thiếu và bước giao dịch tiếp theo; xem kết quả thực tế là cơ sở quyết định mở rộng." },
        ],
      },
      contact: {
        title: "Một đầu mối để tiếp tục sau cuộc gặp.",
        body: "Anh Long phụ trách phát triển thị trường, kết nối đối tác và điều phối yêu cầu hợp tác xuất khẩu. Để chuẩn bị đúng nội dung, đối tác có thể gửi mục tiêu làm việc, thị trường hoặc kênh phân phối, nhóm trà quan tâm và lịch dự kiến. Hoàng Long sẽ cùng đối tác xác lập nội dung đánh giá mẫu, hồ sơ cần đối chiếu và bước triển khai phù hợp. Người ký và thẩm quyền cam kết được xác nhận trong hồ sơ giao dịch.",
      },
    },
    labels: {
      brief: "Đề xuất khung hợp tác",
      company: "Hồ sơ doanh nghiệp",
      catalog: "Phụ lục danh mục & kỹ thuật",
      download: "Tải tài liệu PDF",
      viewBrief: "Xem đề xuất hợp tác",
      viewCompany: "Xem hồ sơ doanh nghiệp",
      viewCatalog: "Xem danh mục chi tiết",
      objective: "Mục tiêu trao đổi",
      contribution: "Hoàng Long có thể đóng góp",
      request: "Nội dung đề nghị phối hợp",
      path: "Lộ trình làm việc đề xuất",
      outcome: "Kết quả hướng tới",
      proposal: "Đề xuất để thảo luận",
      companyFacts: "Thông tin doanh nghiệp công bố",
      diligence: "Hồ sơ phục vụ thẩm định",
      diligenceNote: "Ảnh thực tế, giấy tờ pháp nhân, kết quả kiểm nghiệm và chứng từ giao dịch được bổ sung theo phạm vi có thể cung cấp; không dùng hình minh họa thay cho bằng chứng.",
      mediaPending: "Vị trí dành cho ảnh thực tế · Hoàng Long sẽ bổ sung",
      appendixNote: "Danh mục chi tiết và quy cách từng sản phẩm được trình bày trong tài liệu tham khảo riêng. Giá và điều kiện cung ứng được xác nhận bằng báo giá theo đơn.",
      documentNote: "Tài liệu giới thiệu và đề xuất hợp tác của doanh nghiệp. Không thay thế hồ sơ thẩm định, báo giá hoặc hợp đồng.",
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
    eyebrow: "Hoàng Long · Trade cooperation & market development",
    title: "Developing Vietnamese tea through practical cooperation.",
    intro: "From its tea-making base in Hà Giang, Hoàng Long connects products, buyers and supply proposals around market demand. With its partners, the company seeks to build trading relationships with the basis for long-term development.",
    brief: {
      title: "A cooperation framework to connect buyers with Vietnamese tea",
      summary: "Hoàng Long proposes working with trade-promotion bodies and commercial partners on a programme organised by product group and sales channel. The focus is to connect suitable buyers, assess supply fit and prepare a commercially grounded trial transaction, expanding when the product and supply approach have demonstrated market acceptance.",
      objective: "Turn a Vietnamese tea introduction into a procurement opportunity that can be pursued: identify the partner, suitable products, market-entry requirements and each party's implementation responsibilities.",
      contribution: [
        { title: "Production and an origin-based working relationship", body: "Processing at Tân Lập, Hà Giang, and family tea-selection and tea-making experience since 1995. Hoàng Long prepares product proposals, evaluation samples and a site-visit agenda around the buyer's objectives." },
        { title: "A range for different business models", body: "Green, black, scented and selected teas for beverage ingredients, distribution and specialist tea businesses. Each proposal distinguishes the product's origin, grade, packing and available supporting records." },
        { title: "A contact responsible for follow-through", body: "The Director of Export Development coordinates requirements, samples and commercial proposals. Hoàng Long and the partner agree the next action, responsible contact and response milestone so opportunities continue beyond the meeting." },
      ],
      request: [
        { title: "Introduce buyers with a relevant procurement need", body: "Connect importers, distributors, F&B businesses or specialist tea companies with defined channels and buying requirements. Prioritise meetings with advance information on tea groups, applications, price segment and expected volume." },
        { title: "Clarify market-entry requirements", body: "Discuss destination-market specifications, labelling, import requirements and trading practices. Identify issues requiring suitably qualified technical or assessment support before a formal proposal is issued." },
        { title: "Organise a trial with clear responsibilities", body: "Agree the samples, evaluation approach and feedback schedule; arrange a factory visit where relevant. If the criteria are met, the businesses proceed to negotiate a trial lot, commercial terms and subsequent procurement." },
      ],
      path: [
        { title: "Define the brief", body: "Select the market, buyer group, products and contacts. Agree what to prepare for the business meeting." },
        { title: "Evaluate the fit", body: "Assess samples, applications and technical requirements. Record results and any gaps requiring further work." },
        { title: "Develop the transaction", body: "Propose a trial lot: price, volume, packing, records and timing. Expand according to actual transaction results." },
      ],
      outcome: "Intended outcome: relevant opportunities, responsible contacts, sample feedback and a commercial next step — a basis for pursuing transactions and assessing the value of the introductions.",
    },
    company: {
      mandate: {
        title: "A production base. A direction for market development.",
        body: "Vietnamese tea can serve beverage ingredients, distributor ranges and distinctive drinking teas. To turn that potential into business, buyers need more than an origin story: they need to select the right product, understand its use, evaluate quality and plan repeat procurement. Hoàng Long connects tea-making experience, processing in Hà Giang and a commercial point of contact around one task: translating the character of tea at origin into a supply proposal suited to its market.",
      },
      origin: {
        title: "Rooted in tea-making. Developed around the buyer.",
        body: "Hoàng Long draws on family tea-making experience developed since 1995. Processing at Tân Lập, Hà Giang connects with Northwest Vietnam's highland tea and the Vietnamese tea lines in the range. Building on that base, the direction is to select grades, processing approaches and formats for each partner's business use: a beverage base, a distribution line or a drinking tea with a distinctive character.",
        items: [
          { title: "Origin is the starting point for the product", body: "Raw-material region, season and leaf form shape appearance, aroma and flavour structure. Procurement discussions must translate those characteristics into criteria that can be evaluated in a sample, beverage recipe or distribution range." },
          { title: "Production and selection support the range", body: "Alongside its manufactured lines, Hoàng Long supplies selected teas for different needs. Origin, processing source and supporting records are confirmed by product, giving buyers a clear basis for evaluation." },
        ],
      },
      capability: {
        title: "Capability in the context of a defined supply plan.",
        body: "These facts provide a basis for initial discussions. Execution must account for tea family, grade, season, available stock and production scheduling. Deliverable volume, timing and each party's responsibilities are confirmed in the quotation and order documents.",
        facts: [
          { label: "Indicative production capacity", value: "50–100 tonnes/month", note: "Declared by Hoàng Long. Product mix and available timing are coordinated against the production plan and individual orders." },
          { label: "Processing & EXW collection", value: "Tân Lập · Hà Giang", note: "Collection at Hoàng Long Tea Factory. Responsibilities for loading, transport and formalities are set out in the transaction documents." },
          { label: "Large-bulk / export formats", value: B2B_BULK_PACKING.en.value, note: "Selected for leaf form and intended use; material, net weight and labels are confirmed per order. Separate from retail formats." },
          { label: "Indicative transaction timeline", value: "2–8 weeks", note: "Includes transit time and excludes unforeseen delays. Timing and delivery costs are agreed separately for the volume, destination and EXW terms." },
        ],
      },
      portfolio: {
        title: "A range for three market briefs.",
        body: "Hoàng Long starts with how the partner will use and distribute tea, then selects the product, grade and packing. The separate reference catalogue provides the detailed range and individual product information.",
        segments: [
          { title: "Beverage ingredients", body: "Green, black and scented teas for F&B businesses and ingredient suppliers. Evaluate them in the actual recipe: flavour base, compatibility, dosage and cost per serving. Current export offers include steamed green tea, smoky black tea, OP1 black tea and magnolia green tea." },
          { title: "Import and distribution", body: "Build a range by price segment, appearance and flavour for importers, wholesalers and specialist tea businesses. Connect reference samples with bulk packing, origin information, destination-market requirements and procurement timing, rather than comparing price per kilogram alone." },
          { title: "Drinking tea and gifting", body: "Shan, scented and selected teas from the current range. Emphasise flavour distinction, product presentation and formats suited to the consumer. Manufacturing origin, traded origin and information for each tea are confirmed individually." },
        ],
      },
      delivery: {
        title: "From the market brief to repeat procurement.",
        body: "Four proposed working stages help both parties make decisions against the same information. Each stage should produce a clear output before an introduction becomes a commercial commitment.",
        steps: [
          { title: "Market brief & sample selection", body: "Define the buyer, channel, application, price range and expected volume. Hoàng Long proposes suitable tea groups and samples; both parties record the technical or import questions to resolve." },
          { title: "Evaluation & acceptance criteria", body: "Test samples under the partner's actual conditions of use; record the grade, sensory criteria and specification requirements. Define any testing or factory-assessment scope around the product and procurement objectives." },
          { title: "Quotation & lot preparation", body: "Agree product, volume, packing, labels, price, payment and records. Confirm goods-readiness milestones, delivery terms and responsibility for loading, transport and formalities, using the agreed sample and requirements as the reference." },
          { title: "Delivery & subsequent business", body: "Reconcile delivered volume, goods condition and documents against the order. Review application feedback, issues requiring resolution and future needs to adjust the product mix or repeat-supply schedule." },
        ],
      },
      quality: {
        title: "Evidence at the level of the product and lot.",
        body: "Hoàng Long proposes a working file with three layers: the reference sample, technical requirements and delivery information. Testing or certification is assessed for the specific market, product, lot and date. The framework below helps both parties define the records to prepare and the criteria supporting a procurement decision.",
        items: [
          { title: "Samples & product requirements", body: "Identify the tea line, grade and selected sample; record leaf appearance, aroma, liquor colour, taste and evaluation method. For beverage use, retain recipe and brewing conditions for comparable feedback. Agree technical parameters, acceptance limits and evaluation methods before ordering." },
          { title: "Records & assessment at origin", body: "Review company identity, processing steps and actual photographs relevant to the product. Where testing is required, define parameters, laboratory, sampling date, costs and responsibilities. Test results or certificates apply only within the scope stated in the document." },
          { title: "Lot identity & delivery conditions", body: "Review lot identification, weight, sack type, labels, storage and goods condition. Establish the records applicable to the transaction: contract, invoice, packing list, transport, origin or other documents where needed. Customer-sensitive records are shared privately within the permitted scope." },
        ],
      },
      development: {
        title: "A cooperation direction built for lasting value.",
        body: "Hoàng Long seeks relationships with clear commercial roles: producers understand market requirements, buyers obtain suitable products, and trade-promotion bodies enable relevant dialogue. The following cooperation directions are proposed for partners to select and develop into an agreed working programme.",
        priorities: [
          { title: "Develop ranges with a market rationale", body: "Use buyer feedback to select tea groups, applications and segments; assess origin character alongside application performance and trading conditions. Prioritise product fit over adding more products for its own sake." },
          { title: "Strengthen the basis for repeat supply", body: "Clarify samples, packing, records and procurement cycles. Bring the results of one lot into planning the next. The aim is to narrow the gap between a successful trial and an ongoing buying relationship." },
          { title: "Build connections around implementation results", body: "Work with associations, trade-promotion bodies and commercial partners on a specific brief. Track sample evaluation, information gaps and commercial next steps; use actual results to decide whether to expand." },
        ],
      },
      contact: {
        title: "A point of contact beyond the meeting.",
        body: "Anh Long leads market development, partner connections and the coordination of export cooperation enquiries. To prepare a relevant discussion, partners can share their objectives, market or distribution channel, tea interests and proposed schedule. Hoàng Long and the partner then define the sample-evaluation scope, records for review and an appropriate next step. Signing authority and the power to make commitments are confirmed in the transaction documents.",
      },
    },
    labels: {
      brief: "Cooperation framework brief",
      company: "Corporate profile",
      catalog: "Product & technical reference",
      download: "Download PDF",
      viewBrief: "Read the cooperation brief",
      viewCompany: "View the corporate profile",
      viewCatalog: "View the detailed catalogue",
      objective: "Discussion objective",
      contribution: "What Hoàng Long can contribute",
      request: "Proposed areas of coordination",
      path: "Proposed working pathway",
      outcome: "Intended outcome",
      proposal: "A proposal for discussion",
      companyFacts: "Company-declared operating facts",
      diligence: "Supporting due-diligence records",
      diligenceNote: "Actual photographs, company records, test results and transaction documents are added within the available disclosure scope; illustrative images are not evidence.",
      mediaPending: "Reserved for an actual photograph · To be provided by Hoàng Long",
      appendixNote: "A separate reference document contains the detailed range and individual product formats. Prices and supply terms are confirmed in an order-specific quotation.",
      documentNote: "A company introduction and cooperation proposal. This document does not replace due diligence, a quotation or a contract.",
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

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
    eyebrow: "Hoàng Long · Sản xuất, cung ứng & phát triển xuất khẩu",
    title: "Phát triển giá trị trà Việt.",
    intro: "Kết nối đặc tính của nguồn trà với yêu cầu của thị trường. Từ nền tảng làm trà gia đình đến hoạt động chế biến tại Hà Giang, Hoàng Long phát triển sản phẩm và phương án cung ứng cho nhà nhập khẩu, nhà phân phối và doanh nghiệp đồ uống.",
    actions: { home: "Nhà Hoàng Long", catalog: "Danh mục cung ứng", pdf: "Hồ sơ năng lực & danh mục PDF", quote: "Gửi đề bài hợp tác", sample: "Đánh giá mẫu trà", call: "Gọi trao đổi", zalo: "Zalo Hoàng Long", story: "Nguồn trà & quá trình chế biến" },
    overview: {
      title: "Một nguồn trà. Nhiều khả năng phát triển.",
      body: "Giá trị của trà không dừng ở vùng trồng hay một mẫu trà ngon. Với người mua doanh nghiệp, sản phẩm cần đồng thời phù hợp về hương vị, phẩm cấp, giá, quy cách và khả năng cung ứng. Hoàng Long đặt kinh nghiệm lựa chọn nguyên liệu Tây Bắc và hoạt động chế biến tại Tân Lập, Hà Giang trong mối liên hệ đó: từ đặc tính lá trà đến một danh mục có thể đưa vào kinh doanh, đánh giá và đặt lại.",
      facts: [
        { label: "Kinh nghiệm", value: "Làm trà từ 1995", note: "Nền tảng kinh nghiệm làm trà của gia đình Hoàng Long." },
        { label: "Năng lực sản xuất tham chiếu", value: "50–100 tấn/tháng", note: "Theo công bố của Hoàng Long; cơ cấu trà, khối lượng sẵn và tiến độ được cân đối theo kế hoạch sản xuất." },
        { label: "Chế biến & điểm nhận EXW", value: "Tân Lập · Hà Giang", note: "Nhà máy Trà Hoàng Long. Văn phòng và kho tại Hà Nội là địa điểm làm việc riêng." },
        { label: "Phạm vi thương mại", value: "Nguyên liệu · Phân phối", note: "Trà cho ứng dụng F&B, danh mục chuyên trà và hợp tác phát triển thị trường xuất khẩu." },
      ],
    },
    origins: {
      title: "Bản sắc vùng trà, khả năng ứng dụng của sản phẩm.",
      body: "Nguồn trà vùng cao Tây Bắc, trong đó có Hà Giang, là nền tảng cho các dòng trà Việt của Hoàng Long. Đặc tính nguyên liệu chỉ phát huy giá trị khi được lựa chọn và chế biến theo mục đích cụ thể: giữ nét riêng cho người thưởng trà, hoặc tạo nền vị phù hợp với công thức đồ uống và nhu cầu phân phối.",
      entries: [
        { title: "Hiểu nguyên liệu trước khi chọn phẩm cấp", body: "Vùng trà, mùa thu hái và hình thái nguyên liệu ảnh hưởng đến ngoại hình, sắc nước và cấu trúc vị. Vì vậy, việc chọn trà bắt đầu từ đặc tính cần giữ và ứng dụng cần đạt, thay vì chỉ so sánh tên gọi hoặc giá trên mỗi kg." },
        { title: "Chế biến để phục vụ một mục đích rõ ràng", body: "Danh mục gồm các dòng lục trà, hồng trà và trà ướp hương; công nghệ hấp hơi Nhật Bản được sử dụng trong phương pháp chế biến phù hợp. Khi đánh giá sản phẩm, đối tác đối chiếu cả mẫu trà khô, nước pha và kết quả trong ứng dụng thực tế." },
        { title: "Phân biệt nguồn sản xuất và danh mục thương mại", body: "Bên cạnh nền tảng sản xuất trà Việt, Hoàng Long cung ứng các dòng trà tuyển chọn. Xuất xứ, phương pháp chế biến và hồ sơ của từng sản phẩm được xem xét riêng; danh mục thương mại không đồng nghĩa mọi loại trà đều được sản xuất tại Hà Giang." },
      ],
    },
    portfolio: {
      title: "Danh mục được xây quanh cách đối tác kinh doanh.",
      body: "Cùng một loại trà có thể phù hợp với những thị trường rất khác nhau. Chúng tôi phân chia đề bài thương mại theo ứng dụng, phân khúc và cách sản phẩm đến tay người dùng, rồi mới lựa chọn dòng trà và phương án cung ứng.",
      segments: [
        { title: "Trà nguyên liệu cho F&B", buyer: "Quán, chuỗi đồ uống và nhà cung cấp nguyên liệu", products: "Lục trà, hồng trà và trà ướp hương cho các công thức trà trái cây, trà sữa hoặc trà uống nguyên vị.", approach: "Đánh giá nền vị sau pha, khả năng kết hợp với thành phần khác, định mức trà và chi phí mỗi phần phục vụ. Mẫu cần được thử trong công thức của đối tác trước khi chọn phẩm cấp và lượng đặt." },
        { title: "Danh mục cho nhập khẩu & phân phối", buyer: "Nhà nhập khẩu, nhà bán sỉ và đơn vị chuyên trà", products: "Các dòng trà Shan, lục trà, hồng trà, bạch trà và trà tuyển chọn theo danh mục hiện hành.", approach: "Xây cơ cấu sản phẩm theo phân khúc giá, ngoại hình và hương vị; đối chiếu mẫu, quy cách lô lớn, yêu cầu thị trường đích và lịch cung ứng. Thông tin nguồn được xác nhận theo từng dòng và lô hàng." },
        { title: "Tuyển chọn cho tiêu dùng & quà tặng", buyer: "Cửa hàng trà, khách hàng doanh nghiệp và người dùng cuối", products: "Trà thưởng thức, trà ướp hương, tuyển chọn theo dịp và các quy cách bán lẻ đang có.", approach: "Chú trọng trải nghiệm hương vị, cách giới thiệu sản phẩm và quy cách phù hợp với người nhận. Danh mục bán lẻ được tách khỏi bao PP/PE dành cho đơn nguyên liệu và xuất khẩu." },
      ],
    },
    operatingModel: {
      title: "Từ nguyên liệu đến giao dịch: vai trò rõ ở từng khâu.",
      body: "Một phương án cung ứng cần gắn được nơi làm trà với người quyết định mua. Hoàng Long tổ chức trao đổi quanh bốn đầu việc, để yêu cầu từ thị trường có thể chuyển thành đề bài sản phẩm và kế hoạch thực hiện.",
      links: [
        { title: "Lựa chọn nguồn & dòng trà", body: "Đối chiếu đặc tính nguyên liệu, nhóm sản phẩm, mùa và phẩm cấp với nhu cầu sử dụng. Chọn những mẫu có lý do thương mại rõ ràng để đối tác đánh giá.", output: "Đầu ra: danh sách mẫu và thông tin sản phẩm cần đối chiếu." },
        { title: "Chế biến & chuẩn bị hàng", body: "Lấy hoạt động tại Tân Lập, Hà Giang làm nền tảng cho kế hoạch các dòng trà sản xuất. Cân đối cơ cấu sản phẩm, lượng đặt, quy cách và tiến độ; phân biệt hàng sẵn với hàng cần sản xuất.", output: "Đầu ra: phương án lô hàng và lịch hàng sẵn theo đơn." },
        { title: "Điều phối thương mại", body: "Đầu mối phát triển xuất khẩu và văn phòng Hà Nội tiếp nhận yêu cầu, kết nối đánh giá mẫu, báo giá và nội dung hợp đồng; phân định trách nhiệm giao nhận và chứng từ.", output: "Đầu ra: đề xuất thương mại và danh mục trách nhiệm hai bên." },
        { title: "Triển khai tại thị trường", body: "Đối tác phụ trách kênh bán và yêu cầu nhập khẩu tại thị trường của mình. Phản hồi về ứng dụng, mức giá và tiêu thụ là cơ sở điều chỉnh danh mục và lập kế hoạch lô tiếp theo.", output: "Đầu ra: phản hồi sản phẩm và đề bài tái cung ứng." },
      ],
    },
    supply: {
      title: "Từ đánh giá mẫu đến kế hoạch cung ứng.",
      intro: "Mỗi giai đoạn cần đủ thông tin để quyết định bước tiếp theo. Cách làm này giúp hạn chế chênh lệch giữa mẫu được chọn, hàng đặt mua và điều kiện thực tế khi giao nhận.",
      steps: [
        { title: "Đề bài mua hàng", body: "Xác định thị trường, kênh bán, ứng dụng, phân khúc giá và lượng dự kiến. Kết quả là danh sách trà cần đánh giá và các yêu cầu kỹ thuật, pháp lý phải làm rõ trước khi báo giá chính thức." },
        { title: "Mẫu & tiêu chí chấp nhận", body: "Thử cảm quan và ứng dụng; ghi nhận mẫu, phẩm cấp, điều kiện pha và các chỉ tiêu cần kiểm nghiệm. Nếu cần khảo sát nhà máy, nội dung đánh giá được chuẩn bị theo đúng sản phẩm và mục tiêu mua hàng." },
        { title: "Lô hàng & điều kiện thương mại", body: "Chốt lượng đặt, giá, bao bì, nhãn, thanh toán, mốc hàng sẵn và hồ sơ cần có. Với đề xuất EXW Tân Lập, Hà Giang, phân định riêng phần bốc hàng, vận tải và thủ tục do các bên phụ trách." },
        { title: "Giao nhận & chu kỳ kế tiếp", body: "Đối chiếu lượng, quy cách, tình trạng hàng và chứng từ theo đơn. Sau giao nhận, tổng hợp phản hồi và nhu cầu tiếp theo để việc đặt lại dựa trên kết quả sử dụng, thay vì bắt đầu lại từ đầu." },
      ],
    },
    quality: {
      title: "Chất lượng phải có cơ sở để đối chiếu.",
      body: "Một mẫu trà phù hợp về hương vị chưa thay thế được việc đánh giá cả lô hàng. Đề bài chất lượng cần kết nối ba lớp: mẫu tham chiếu, thông số sản phẩm và yêu cầu của thị trường đích. Những nội dung dưới đây là cơ sở lập hồ sơ làm việc cho từng đơn.",
      items: ["Nhận diện mẫu, dòng trà, phẩm cấp và tiêu chí cảm quan", "Thông số cần kiểm soát, phương pháp đánh giá và phạm vi chấp nhận", `Đơn lô lớn / xuất khẩu: ${B2B_BULK_PACKING.vi.text}`, "Nguồn sản phẩm, mã lô, khối lượng, nhãn và điều kiện bảo quản", "Kiểm nghiệm hoặc chứng nhận theo yêu cầu: xác định đơn vị thực hiện, ngày, lô, phạm vi, chi phí và trách nhiệm"],
    },
    technical: {
      title: "Bốn nội dung cần đi sâu trước khi đặt hàng.",
      body: "Bộ thông số làm việc được xây theo sản phẩm và mục đích sử dụng. Các ví dụ chỉ tiêu dưới đây là nội dung cần đánh giá, không phải kết quả kiểm nghiệm hay chứng nhận sẵn có của mọi sản phẩm.",
      checks: [
        { title: "Cảm quan & hiệu quả sử dụng", body: "Ngoại hình lá, độ đồng đều, hương, sắc nước và vị được so với mẫu tham chiếu. Với trà pha chế, cần ghi cả lượng trà, nước, thời gian pha và thành phần kết hợp để so sánh trong cùng điều kiện; từ đó xem hiệu quả mỗi phần phục vụ cùng với giá nguyên liệu." },
        { title: "Thông số & yêu cầu thị trường", body: "Làm rõ chỉ tiêu phù hợp với sản phẩm, chẳng hạn độ ẩm, dư lượng thuốc bảo vệ thực vật, vi sinh hoặc kim loại nặng khi có yêu cầu. Giới hạn áp dụng, phương pháp thử, phòng thử nghiệm và thời điểm lấy mẫu cần được xác định cho thị trường nhập khẩu và lô cụ thể." },
        { title: "Nhận diện lô & bao bì", body: "Đối chiếu tên hàng, mã lô, khối lượng tịnh, loại bao và nội dung nhãn. Bao PP/PE 20, 30 hoặc 35 kg được chọn theo ngoại hình trà và nhu cầu sử dụng; thông tin bảo quản, xếp hàng và bảo vệ khỏi ẩm, mùi cần đi cùng phương án giao nhận." },
        { title: "Hàng sẵn & hồ sơ giao nhận", body: "Danh mục kiểm tra trước giao cần bao quát lượng hàng, tình trạng bao, phương tiện/container, ảnh và chứng từ đã thỏa thuận. Invoice, packing list, vận đơn, chứng từ xuất xứ hoặc hồ sơ khác được xác định theo giao dịch thực tế; không mặc định mọi loại chứng từ áp dụng cho mọi đơn." },
      ],
    },
    direction: {
      title: "Định hướng phát triển: tăng giá trị, không chỉ tăng sản lượng.",
      body: "Hoàng Long hướng tới quan hệ cung ứng trong đó người mua có cơ sở kinh doanh lâu dài, còn nguồn trà được phát triển bằng nhu cầu thị trường rõ ràng. Ba ưu tiên dưới đây định hướng việc lựa chọn sản phẩm và chương trình hợp tác.",
      priorities: [
        { title: "Chuyển bản sắc thành giá trị sản phẩm", body: "Giữ thông tin nguồn trà và đặc tính chế biến gắn với lựa chọn của người mua; phát triển danh mục có sự khác biệt về ứng dụng và phân khúc, thay vì cạnh tranh chỉ bằng giá nguyên liệu." },
        { title: "Tạo điều kiện cho đơn hàng lặp lại", body: "Đưa phản hồi mẫu và sử dụng thực tế vào đề bài cung ứng, làm rõ quy cách và kế hoạch hàng để đối tác có cơ sở dự tính chu kỳ mua tiếp theo." },
        { title: "Phát triển thị trường qua đối tác phù hợp", body: "Kết nối với nhà nhập khẩu, nhà phân phối và đơn vị xúc tiến trên các đề bài cụ thể. Ưu tiên bước thử có tiêu chí đánh giá, rồi mới mở rộng quy mô theo kết quả thực hiện." },
      ],
    },
    cooperation: {
      title: "Hợp tác từ một đề bài có thể triển khai.",
      body: "Đối với nhà mua hàng, hiệp hội và cơ quan xúc tiến thương mại, Hoàng Long đề xuất bắt đầu từ mục tiêu thị trường và nhóm sản phẩm cụ thể. Một cuộc gặp có giá trị cần dẫn tới danh sách mẫu, nội dung đánh giá hoặc kế hoạch lô thử, cùng người phụ trách và mốc thực hiện rõ ràng.",
      tracks: [
        { title: "Nhập khẩu & phân phối", body: "Chọn cơ cấu dòng trà và phân khúc, xây bộ mẫu và đề xuất quy cách. Bước tiếp theo là đánh giá mức phù hợp với kênh bán, yêu cầu nhập khẩu và phương án lô đầu." },
        { title: "Ứng dụng & phát triển danh mục", body: "Cùng đối tác F&B hoặc chuyên trà xác định nền vị, tiêu chí sử dụng và khoảng giá mục tiêu. Kết quả thử mẫu giúp thu hẹp lựa chọn trước khi quyết định lượng và kế hoạch mua." },
        { title: "Xúc tiến thương mại & khảo sát", body: "Chuẩn bị danh mục giới thiệu, nội dung làm việc với người mua và chương trình khảo sát nhà máy khi phù hợp. Tách rõ hoạt động giới thiệu, đánh giá năng lực và cam kết giao dịch của từng bên." },
      ],
      brief: ["Đơn vị chủ trì, người phụ trách và mục tiêu buổi làm việc", "Thị trường, đối tượng mua hàng hoặc kênh phân phối", "Dòng trà, ứng dụng, yêu cầu kỹ thuật và sản lượng dự kiến", "Lịch triển khai, địa điểm làm việc và hồ sơ cần đối chiếu", "Bước tiếp theo, đầu mối thực hiện và cách đánh giá kết quả"],
      cta: "Trao đổi chương trình hợp tác",
    },
    evidence: {
      title: "Từ thông tin giới thiệu đến hồ sơ thẩm định.",
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
    eyebrow: "Hoàng Long · Tea production, supply & export development",
    title: "Developing the value of Vietnamese tea.",
    intro: "Connecting the character of tea at origin with the requirements of its market. Building on family tea-making experience and processing in Hà Giang, Hoàng Long develops products and supply proposals for importers, distributors and beverage businesses.",
    actions: { home: "House of Hoàng Long", catalog: "Supply catalogue", pdf: "Company capabilities & catalogue PDF", quote: "Submit a cooperation brief", sample: "Evaluate tea samples", call: "Discuss your requirements", zalo: "Hoàng Long on Zalo", story: "Tea origins & processing" },
    overview: {
      title: "Tea at origin. Possibilities across markets.",
      body: "The value of tea extends beyond its growing region or an appealing sample. For a business buyer, flavour, grade, price, packing and supply capability must work together. Hoàng Long connects Northwest Vietnamese tea selection with processing at Tân Lập, Hà Giang: turning the character of the leaf into a range that buyers can evaluate, bring to market and reorder.",
      facts: [
        { label: "Experience", value: "Making tea since 1995", note: "The foundation of the Hoàng Long family's tea-making experience." },
        { label: "Indicative production capacity", value: "50–100 tonnes/month", note: "Declared by Hoàng Long; product mix, available volume and timing are coordinated against the production plan." },
        { label: "Processing & EXW collection", value: "Tân Lập · Hà Giang", note: "Hoàng Long Tea Factory. The Hanoi commercial office and warehouse are a separate location." },
        { label: "Commercial scope", value: "Ingredients · Distribution", note: "Tea for F&B applications, specialist ranges and export-market development." },
      ],
    },
    origins: {
      title: "Regional character. A purpose for the product.",
      body: "Northwest Vietnam's highland tea, including Hà Giang, underpins Hoàng Long's Vietnamese tea lines. Raw-material character creates value when selection and processing serve a defined purpose: preserving distinction for tea drinkers or providing a suitable base for beverage recipes and distribution.",
      entries: [
        { title: "Understand the material before choosing the grade", body: "Region, harvest season and leaf form influence appearance, liquor colour and flavour structure. Selection therefore starts with the character to preserve and the application to achieve, rather than the product name or price per kilogram alone." },
        { title: "Processing with an intended use", body: "The range includes green, black and scented teas, with Japanese steam-processing technology used in the relevant production method. Product evaluation considers the dry leaf, brewed liquor and performance in the buyer's actual application." },
        { title: "Separate production origins from the traded range", body: "Alongside its Vietnamese tea production base, Hoàng Long supplies selected teas. Each product's origin, processing method and supporting records are reviewed individually; inclusion in the commercial catalogue does not mean every tea is manufactured in Hà Giang." },
      ],
    },
    portfolio: {
      title: "A portfolio built around the buyer's business.",
      body: "A tea can serve very different markets. We structure the commercial brief around application, segment and route to the consumer before selecting the tea and supply proposal.",
      segments: [
        { title: "Tea ingredients for F&B", buyer: "Cafés, beverage chains and ingredient suppliers", products: "Green, black and scented teas for fruit tea, milk tea or straight-tea recipes.", approach: "Evaluate the brewed base, interaction with other ingredients, tea dosage and cost per serving. Test samples in the partner's recipe before selecting grade and order volume." },
        { title: "Ranges for import & distribution", buyer: "Importers, wholesalers and specialist tea businesses", products: "Shan, green, black, white and selected teas from the current catalogue.", approach: "Build a range by price segment, leaf appearance and flavour; review samples, bulk packing, destination-market requirements and supply timing. Origin information is confirmed for the product and lot." },
        { title: "Selections for consumption & gifting", buyer: "Tea retailers, business gift buyers and consumers", products: "Drinking teas, scented teas, occasion-led selections and available retail formats.", approach: "Focus on flavour experience, product presentation and formats suited to the recipient. Retail ranges are kept separate from PP/PE sacks for ingredient and export orders." },
      ],
    },
    operatingModel: {
      title: "From raw material to transaction: a role at each stage.",
      body: "A supply proposal must connect the place where tea is made with the people who decide to buy it. Hoàng Long structures discussions around four responsibilities, translating market requirements into a product brief and an implementation plan.",
      links: [
        { title: "Select origins & tea lines", body: "Match raw-material character, product family, season and grade to the intended use. Select samples with a clear commercial rationale for buyer evaluation.", output: "Output: a sample shortlist and product information for review." },
        { title: "Process & prepare goods", body: "Use operations at Tân Lập, Hà Giang as the basis for planning the manufactured lines. Balance product mix, volume, packing and timing; distinguish available stock from goods requiring production.", output: "Output: an order-specific lot proposal and goods-readiness schedule." },
        { title: "Coordinate commercial execution", body: "The export development contact and Hanoi office receive requirements and coordinate samples, quotations and contract details, with clear responsibilities for delivery and documentation.", output: "Output: a commercial proposal and a division of responsibilities." },
        { title: "Develop the destination market", body: "The partner leads its sales channels and local import requirements. Feedback on applications, price and demand informs range adjustments and planning for subsequent shipments.", output: "Output: product feedback and a repeat-supply brief." },
      ],
    },
    supply: {
      title: "From sample evaluation to a supply plan.",
      intro: "Each stage should provide enough information to decide the next step. This approach helps reduce gaps between the selected sample, the ordered goods and the conditions of delivery.",
      steps: [
        { title: "The procurement brief", body: "Define the market, channel, application, price segment and expected volume. The result is a sample shortlist and the technical and regulatory questions to resolve before a formal quotation." },
        { title: "Samples & acceptance criteria", body: "Evaluate taste and application; record the sample, grade, brewing conditions and testing parameters. Where a factory visit is needed, prepare the assessment around the product and procurement objectives." },
        { title: "The lot & commercial terms", body: "Confirm volume, price, packing, labels, payment, goods-readiness milestones and required records. For EXW Tân Lập, Hà Giang offers, identify the parties responsible for loading, transport and formalities separately." },
        { title: "Delivery & the next supply cycle", body: "Reconcile volume, packing, goods condition and documents against the order. Use delivery and application feedback to plan repeat supply, building on the previous evaluation rather than starting again." },
      ],
    },
    quality: {
      title: "Quality needs a basis for comparison.",
      body: "An appealing sample does not replace evaluation of a shipment. The quality brief must connect three layers: the reference sample, product specifications and destination-market requirements. The following points guide the working file for each order.",
      items: ["Sample identity, tea line, grade and sensory criteria", "Parameters to control, evaluation methods and acceptance scope", `Bulk / export orders: ${B2B_BULK_PACKING.en.text}`, "Product origin, lot identification, weight, labelling and storage conditions", "Required testing or certification: identify provider, date, lot, scope, costs and responsibilities"],
    },
    technical: {
      title: "Four areas to examine before placing an order.",
      body: "The working specification is developed for the product and intended use. Parameters below are evaluation topics, not existing test results or certifications for every product.",
      checks: [
        { title: "Sensory character & application performance", body: "Compare leaf appearance, uniformity, aroma, liquor colour and taste against the reference sample. For beverage use, record tea dosage, water, brewing time and accompanying ingredients so results can be compared under the same conditions; assess cost per serving alongside raw-material price." },
        { title: "Specifications & market requirements", body: "Identify relevant parameters, such as moisture, pesticide residues, microbiology or heavy metals where required. Applicable limits, methods, laboratory and sampling timing must be established for the importing market and specific lot." },
        { title: "Lot identification & packing", body: "Review product name, lot code, net weight, sack type and label information. Choose 20, 30 or 35 kg PP/PE sacks to suit leaf form and intended use; include storage, loading and protection from moisture and odour in the delivery plan." },
        { title: "Goods readiness & delivery records", body: "The pre-delivery review should cover volume, packing condition, vehicle/container, photographs and agreed documents. Invoices, packing lists, transport and origin documents or other records are established for the actual transaction; not every document applies to every order." },
      ],
    },
    direction: {
      title: "Our direction: grow value as well as volume.",
      body: "Hoàng Long aims to build supply relationships that give buyers a basis for long-term business and connect tea development with defined market demand. Three priorities guide product and cooperation decisions.",
      priorities: [
        { title: "Translate origin character into product value", body: "Connect origin information and processing character with buyer choice. Develop distinction through application and segment, rather than competing on raw-material price alone." },
        { title: "Build the conditions for repeat business", body: "Bring sample and application feedback into the supply brief, clarify formats and goods planning, and give partners a basis for anticipating their next procurement cycle." },
        { title: "Develop markets through suitable partners", body: "Work with importers, distributors and trade-promotion organisations on specific briefs. Start with trials that have clear evaluation criteria, then expand according to implementation results." },
      ],
    },
    cooperation: {
      title: "Cooperation starts with an actionable brief.",
      body: "For buyers, associations and trade-promotion bodies, Hoàng Long proposes starting with a defined market objective and product group. A useful meeting should lead to a sample shortlist, assessment scope or trial-shipment plan, with responsible contacts and practical milestones.",
      tracks: [
        { title: "Import & distribution", body: "Select tea families and segments, assemble samples and propose packing. The next decision is their fit with sales channels, import requirements and a first-shipment plan." },
        { title: "Applications & range development", body: "Work with F&B or specialist-tea partners to define the flavour base, usage criteria and target price range. Sample trials narrow the selection before volume and procurement decisions." },
        { title: "Trade promotion & site assessment", body: "Prepare product presentations, buyer-meeting agendas and factory visits where appropriate. Distinguish introductions, capability assessment and each party's transaction commitments." },
      ],
      brief: ["Convening organisation, responsible contact and meeting objectives", "Market, buyer audience or distribution channel", "Tea range, application, technical requirements and planned volume", "Schedule, meeting location and documents for review", "Next action, responsible person and how results will be assessed"],
      cta: "Discuss a cooperation programme",
    },
    evidence: {
      title: "From company introduction to due diligence.",
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

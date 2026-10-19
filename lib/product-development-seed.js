// Internal Phase 1 planning data from the Product Universe brief, 2026-10-19.
// These are development concepts, never sellable catalog SKUs. No stock or price is seeded.
// Supplier details are supplied by the brief and have not been independently verified.
export const DEVELOPMENT_SEED_VERSION = 'product-universe-2026-10-19-v1';

export const DEVELOPMENT_CATEGORIES = [
  { code: 'A', name: 'Trà khô truyền thống và đặc sản', status: 'active', priority: 'high', note: 'Kiểm kê và liên kết trà hiện có trước khi phát triển công thức mới.' },
  { code: 'B', name: 'Quy cách trà lá bán lẻ và bán sỉ', status: 'active', priority: 'high', note: 'Quy cách đóng gói của trà gốc; không tự tạo công thức hay SKU.' },
  { code: 'C', name: 'Trà túi lọc và pha tiện lợi', status: 'active', priority: 'high', note: 'Ưu tiên C001, C003, C004, C006, C007; xác minh đối tác nhận trà Hoàng Long.' },
  { code: 'D', name: 'Trà phối trộn và tạo hương', status: 'research_only', priority: 'later', note: 'Chỉ lưu nghiên cứu; chưa lập kế hoạch sản xuất.' },
  { code: 'E', name: 'Trà ép và lưu niên', status: 'development', priority: 'high', note: 'Ưu tiên E001, E003, E004, E007; xác minh quy trình, độ ẩm và bảo quản.' },
  { code: 'F', name: 'Trà nền cho đồ uống B2B', status: 'partial', priority: 'high', note: 'Chỉ tập trung trà khô, công thức pha, gói định lượng và cung ứng riêng; hoãn cốt lỏng và premix.' },
  { code: 'G', name: 'Trà đá phổ thông', status: 'active', priority: 'high', note: 'Ưu tiên G001–G004; chỉ sử dụng phân đoạn trà được duyệt cho thực phẩm.' },
  { code: 'H', name: 'Trà pha sẵn và đóng chai', status: 'research_only', priority: 'later', note: 'Chỉ lưu nghiên cứu; chưa cam kết chế biến, đóng chai hay hạn dùng.' },
  { code: 'K', name: 'Bột trà, trà hòa tan và chiết xuất', status: 'research_only', priority: 'later', note: 'Chỉ lưu nghiên cứu; chưa cam kết đầu tư hoặc sản xuất.' },
  { code: 'M', name: 'Phân đoạn trà và tận dụng phụ phẩm', status: 'research', priority: 'medium', note: 'Phân biệt thực phẩm, nguyên liệu chiết xuất, phi thực phẩm và loại bỏ; phải duyệt mục đích sử dụng.' },
  { code: 'N', name: 'Sản xuất, OEM và dịch vụ', status: 'development', priority: 'high', note: 'Năng lực chưa xác minh chỉ được mô tả là phát triển theo yêu cầu, qua tư vấn.' },
];

export const DEVELOPMENT_DIVISIONS = [
  { id: 'everyday', name: 'Hoàng Long Everyday', position: 'Trà dùng hằng ngày, giá dễ tiếp cận', note: 'Bộ phận thương mại nội bộ; không phải pháp nhân riêng.' },
  { id: 'professional', name: 'Hoàng Long Professional', position: 'Trà nguyên liệu cho quán và doanh nghiệp đồ uống', note: 'Bộ phận thương mại nội bộ; không phải pháp nhân riêng.' },
  { id: 'heritage', name: 'Hoàng Long Heritage', position: 'Trà đặc sản và di sản Việt Nam', note: 'Bộ phận thương mại nội bộ; không phải pháp nhân riêng.' },
  { id: 'manufacturing_lab', name: 'Hoàng Long Manufacturing & Lab', position: 'Nghiên cứu, phát triển và điều phối sản xuất', note: 'Bộ phận thương mại nội bộ; không phải pháp nhân riêng. Năng lực bên ngoài phải được xác minh.' },
];

// Explicit identity matches only. Consumers must also check these IDs exist in the current catalog.
// A005/A006 deliberately have no match: similarly scented catalog teas do not prove Shan Tuyết identity.
export const EXISTING_DEVELOPMENT_PRODUCT_MAP = {
  A001: 'hong-tra-shan-mat',
  A002: 'hong-tra-shan-khoi',
  A003: 'luc-tra-shan-moc',
  A004: 'luc-tra-ngoc-lan',
};

const project = (code, name, category, division, kind, workstream, description, nextTask, extra = {}) => ({
  code,
  name,
  category_code: category,
  division_id: division,
  kind,
  lifecycle_stage: 'research',
  public_availability: 'hidden',
  priority: 'high',
  linked_product_ids: EXISTING_DEVELOPMENT_PRODUCT_MAP[code] ? [EXISTING_DEVELOPMENT_PRODUCT_MAP[code]] : [],
  description,
  next_task: nextTask,
  blocker: '',
  workstream_code: workstream,
  ...extra,
});

export const DEVELOPMENT_PROJECT_SEEDS = [
  project('A001', 'Hồng Trà Shan Mật — rà soát sản phẩm hiện có', 'A', 'heritage', 'catalog_audit', 'WS01', 'Đối chiếu trà gốc, quy cách và lô hiện có; giữ nguyên sản phẩm thương mại đang vận hành.', 'Xác nhận thông số và biến thể từ hồ sơ sản phẩm hiện có.'),
  project('A002', 'Hồng Trà Shan Khói — rà soát sản phẩm hiện có', 'A', 'heritage', 'catalog_audit', 'WS01', 'Đối chiếu trà gốc và dữ liệu hiện có trước khi dùng cho quy cách phát triển.', 'Rà soát nguồn gốc, thông số và hướng dẫn pha của sản phẩm hiện có.'),
  project('A003', 'Lục Trà Shan Mộc — rà soát sản phẩm hiện có', 'A', 'heritage', 'catalog_audit', 'WS01', 'Liên kết trà gốc hiện có; không suy ra số lượng tồn kho hay tình trạng bán từ ý tưởng này.', 'Xác nhận thông số trà gốc và những quy cách thực sự đang có.'),
  project('A004', 'Lục Trà Hoa Ngọc Lan — rà soát sản phẩm hiện có', 'A', 'heritage', 'catalog_audit', 'WS01', 'Dùng đúng mã trà ngọc lan hiện có, tránh tạo trùng sản phẩm.', 'Đối chiếu hồ sơ trà và những thông tin chất lượng đã được xác nhận.'),
  project('A005', 'Trà Nhài Shan Tuyết — xác minh danh tính trà', 'A', 'heritage', 'catalog_audit', 'WS01', 'Tên trong brief chưa khớp chính xác các trà lài hiện có. Chưa gán mã sản phẩm.', 'Xác minh tên, giống trà và nguồn gốc trước khi chọn bản ghi hiện có.', { blocker: 'Chưa xác nhận trà lài hiện có tương ứng với Trà Nhài Shan Tuyết.' }),
  project('A006', 'Trà Sen Shan Tuyết — xác minh danh tính trà', 'A', 'heritage', 'catalog_audit', 'WS01', 'Tên trong brief chưa khớp chính xác Lục Trà Hoa Sen. Chưa gán mã sản phẩm.', 'Xác minh danh tính trà sen và nguyên liệu trước khi liên kết.', { blocker: 'Chưa xác nhận trà sen hiện có tương ứng với Trà Sen Shan Tuyết.' }),
  project('B003', 'Quy cách trà đặc sản lá rời 100g', 'B', 'heritage', 'format', 'WS01', 'Quy cách đóng gói dự kiến của trà gốc đã chọn; không phải công thức riêng.', 'Kiểm tra quy cách 100g hiện có rồi lập yêu cầu bao bì cho phần còn thiếu.'),
  project('B006', 'Quy cách trà lá bán sỉ 1kg', 'B', 'professional', 'format', 'WS01', 'Quy cách bán sỉ dự kiến; liên kết trà gốc và biến thể thực tế sau khi kiểm kê.', 'Đối chiếu bao bì, biến thể và yêu cầu B2B hiện có.'),
  project('C001', 'Trà xanh túi lọc hằng ngày · 20 × 2g', 'C', 'everyday', 'concept', 'WS03', 'Thử mẫu OEM dùng trà Hoàng Long; nguyên liệu và thông số túi cần được xác minh.', 'Xác minh đối tác nhận trà do Hoàng Long cung cấp và yêu cầu báo giá mẫu.', { lifecycle_stage: 'supplier_sourcing' }),
  project('C003', 'Trà nhài túi tam giác cao cấp · 15 × 3g', 'C', 'heritage', 'concept', 'WS03', 'Nghiên cứu túi tam giác; chưa mặc định trà lài hiện có là nguyên liệu Shan Tuyết.', 'Xác nhận trà đầu vào và yêu cầu đối tác báo thông số túi, mức tối thiểu và mẫu.', { lifecycle_stage: 'supplier_sourcing' }),
  project('C004', 'Trà sen túi tam giác cao cấp · 15 × 3g', 'C', 'heritage', 'concept', 'WS03', 'Hoàng Long sở hữu trà và đặc tính sản phẩm; đối tác chỉ hoàn thiện khi phù hợp.', 'Xác nhận trà sen đầu vào, khả năng giữ hương và chính sách nhận nguyên liệu.', { lifecycle_stage: 'supplier_sourcing' }),
  project('C006', 'Trà nhài túi pha lạnh · 10 × 8g', 'C', 'everyday', 'concept', 'WS03', 'Thử chiết xuất lạnh có kiểm soát; chưa có hạn dùng hoặc tuyên bố an toàn cho sản phẩm mới.', 'Lập yêu cầu thử pha, thời gian bảo quản mẫu và quy cách túi OEM.', { lifecycle_stage: 'supplier_sourcing' }),
  project('C007', 'Túi trà pha cho nhà hàng · 10 × 20g', 'C', 'professional', 'concept', 'WS03', 'Dạng túi định lượng cho nhà hàng; đối chiếu G003 để tránh tạo hai công thức giống nhau.', 'Thống nhất nhu cầu pha theo mẻ và yêu cầu mẫu túi 20g.', { lifecycle_stage: 'supplier_sourcing' }),
  project('E001', 'Bánh trà Shan Tuyết nguyên liệu lưu niên · 200g', 'E', 'heritage', 'concept', 'WS04', 'Phải xác định quy trình từ lá tươi phù hợp. Không ép lục trà hấp thành phẩm rồi gọi là Phổ Nhĩ sống.', 'Tìm và xác minh đối tác chỉ ép thuê bằng trà Hoàng Long; lập tiêu chí quy trình, độ ẩm và bảo quản.', { lifecycle_stage: 'supplier_sourcing', blocker: 'Chưa xác minh đối tác chỉ ép thuê nhận trà Hoàng Long và quy trình nguyên liệu phù hợp; nhiệm vụ vẫn mở.' }),
  project('E003', 'Bạch trà Shan Tuyết ép · 200g', 'E', 'heritage', 'concept', 'WS04', 'Thử nghiệm nguyên liệu bạch trà, ép, sấy và hồ sơ lô; không khẳng định trà hiện có là nguyên liệu đã duyệt.', 'Xác định trà đầu vào và tiêu chí đánh giá mẫu ép.', { blocker: 'Chưa duyệt trà đầu vào, phương pháp ép và tiêu chí bảo quản.' }),
  project('E004', 'Lục trà sen ép · 100g', 'E', 'heritage', 'concept', 'WS04', 'Thử riêng dạng ép từ lục trà thành phẩm; không gắn với tuyên bố Phổ Nhĩ sống.', 'Đánh giá giữ hương, độ ẩm, khả năng tách và điều kiện bảo quản mẫu.'),
  project('E007', 'Bộ lưu trữ niên vụ Shan Tuyết · phiên bản giới hạn', 'E', 'heritage', 'concept', 'WS04', 'Khái niệm lưu hồ sơ niên vụ, nguồn gốc và diễn biến cảm quan; chưa có số lượng hay niên vụ được cam kết.', 'Xác định mẫu hồ sơ niên vụ và lịch kiểm tra bảo quản; không hứa tăng giá.'),
  project('F001', 'Trà khô Shan Mật làm nền trà sữa', 'F', 'professional', 'concept', 'WS05', 'Chuẩn hóa trà khô và công thức pha; trà đầu vào tham chiếu A001, không tạo SKU thương mại.', 'Đối chiếu công thức hiện có, thử tỷ lệ chiết xuất và ghi định mức trà.'),
  project('F006', 'Trà khô Shan Mộc làm nền đồ uống', 'F', 'professional', 'concept', 'WS05', 'Chuẩn hóa trà khô và hướng dẫn pha; trà đầu vào tham chiếu A003.', 'Đo định mức và đánh giá pha theo nhu cầu quán từ công thức hiện có.'),
  project('F008', 'Phối trà khô theo yêu cầu quán', 'F', 'professional', 'concept', 'WS05', 'Dịch vụ phát triển trà khô theo yêu cầu; công thức, chi phí và khả năng cung ứng cần được duyệt.', 'Lập biểu mẫu yêu cầu vị, mục đích pha và tiêu chí mẫu, nối luồng báo giá hiện có.'),
  project('G001', 'Trà phổ thông dùng hằng ngày · 1kg', 'G', 'everyday', 'concept', 'WS02', 'Chỉ dùng trà đạt phân hạng thực phẩm; không coi mọi vụn trà là nguyên liệu uống được.', 'Xác định phân hạng trà phù hợp, công thức pha và giá trị nguyên liệu thực tế.'),
  project('G002', 'Trà đá nhà hàng · 1kg', 'G', 'professional', 'concept', 'WS02', 'Thử trà đá theo nhu cầu nhà hàng; cần đánh giá cảm quan và chi phí nguyên liệu.', 'Thử mẻ pha chuẩn và thu phản hồi từ nhu cầu khách đã xác nhận.'),
  project('G003', 'Túi trà đá định lượng · 20g', 'G', 'professional', 'format', 'WS02', 'Quy cách túi 20g cho trà đá; phối hợp C007 để tránh trùng hồ sơ công thức.', 'Chọn trà gốc đã duyệt và so sánh hiệu quả chiết xuất của túi 20g.'),
  project('G004', 'Túi trà pha theo mẻ lớn · 50g', 'G', 'professional', 'format', 'WS02', 'Quy cách túi định lượng 50g; chưa có sản lượng pha hay mức đặt hàng được xác nhận.', 'Xác định thể tích pha mục tiêu và thử mẫu túi 50g.'),
  project('M001', 'Phân đoạn trà mịn đạt chuẩn thực phẩm', 'M', 'manufacturing_lab', 'material_research', 'WS06', 'Cần duyệt mục đích sử dụng theo từng lô; tách riêng thực phẩm, chiết xuất, phi thực phẩm và loại bỏ.', 'Kiểm kê phân đoạn, đo khối lượng và yêu cầu chất lượng trước khi gán mục đích.', { priority: 'medium' }),
  project('M002', 'Phối trà lá gãy đạt chuẩn thực phẩm', 'M', 'manufacturing_lab', 'material_research', 'WS06', 'Chỉ dùng lá gãy đã được duyệt cho thực phẩm; không chuyển lô mốc, nhiễm bẩn hoặc bị loại sang đồ uống.', 'Ghi nguồn lô, phân hạng và quy tắc duyệt nguyên liệu lá gãy.', { priority: 'medium' }),
  project('M003', 'Sản phẩm từ cuộng trà', 'M', 'manufacturing_lab', 'material_research', 'WS06', 'Đánh giá phân hạng và mục đích; chưa mặc định cuộng trà là thực phẩm.', 'Xác nhận phân hạng, chất lượng và mục đích được phép cho từng lô.', { priority: 'medium' }),
  project('D-RESEARCH', 'Nghiên cứu nhóm trà phối trộn và tạo hương', 'D', 'manufacturing_lab', 'category_research', 'WS08', 'Lưu ý tưởng trà trái cây, citrus, gừng, hoa, gia vị và phối trà riêng; chưa cam kết sản xuất.', 'Ghi yêu cầu kỹ thuật và câu hỏi nghiên cứu cho từng ý tưởng.', { priority: 'later' }),
  project('H-RESEARCH', 'Nghiên cứu nhóm trà pha sẵn và đóng chai', 'H', 'manufacturing_lab', 'category_research', 'WS08', 'Lưu các ý tưởng trà đen, xanh, nhài, sen đóng chai, pha lạnh, trà sữa và cốt trà; chưa cam kết sản xuất.', 'Ghi yêu cầu chế biến, bao bì, an toàn và thẩm định hạn dùng.', { priority: 'later' }),
  project('K-RESEARCH', 'Nghiên cứu nhóm bột trà và chiết xuất', 'K', 'manufacturing_lab', 'category_research', 'WS08', 'Lưu các ý tưởng nghiền, hòa tan, cô đặc, cao trà, sấy thăng hoa và chiết xuất; chưa cam kết sản xuất.', 'Ghi yêu cầu công nghệ, quyền sở hữu nguyên liệu và tiêu chí chất lượng.', { priority: 'later' }),
];

const supplier = (id, name, region, website, services, formats, nextTask) => ({
  id,
  name,
  region,
  website,
  service_capabilities: services,
  supported_formats: formats,
  status: 'lead',
  evidence_status: 'brief_unverified',
  accepts_customer_tea: null,
  minimum_order_quantity: null,
  estimated_unit_cost: null,
  sample_cost: null,
  lead_time: null,
  notes: 'Đầu mối do brief ngày 19/10/2026 cung cấp, chưa xác minh website, pháp nhân, dịch vụ, chứng nhận hoặc báo giá. Chưa phải đối tác được duyệt.',
  next_task: nextTask,
});

export const DEVELOPMENT_SUPPLIER_SEEDS = [
  supplier('an-viet-tra', 'An Việt Trà', 'Đông Anh, Hà Nội — theo brief, chưa xác minh', 'https://anviettra.vn/', ['Gia công trà túi lọc — cần xác minh'], ['Túi lọc — cần xác minh'], 'Xác minh đầu mối và việc nhận trà Hoàng Long; hỏi mức tối thiểu, thử mẫu, truy xuất lô.'),
  supplier('hcn-pharma', 'HCN Pharma / Giacong.vn', 'Ninh Bình — theo brief, chưa xác minh', 'https://giacong.vn/gia-cong-tra-tui-loc/', ['Gia công túi lọc', 'Phối trộn', 'Nghiền', 'Gia công từng công đoạn'], ['Túi lọc — cần xác minh'], 'Xác minh từng công đoạn thực nhận, nguyên liệu do khách cung cấp và yêu cầu kỹ thuật.'),
  supplier('nuky-nguyen-ky', 'NUKY / Nguyên Ký', 'TP. Hồ Chí Minh — theo brief, chưa xác minh', 'https://www.nuky.vn/trang/gia-cong-oem', ['Gia công túi lọc', 'Đóng gói nhãn riêng'], ['Túi vuông — cần xác minh', 'Túi tam giác — cần xác minh'], 'Xác minh dịch vụ túi vuông/tam giác, sở hữu trà, phương án bao bì và điều kiện thử mẫu.'),
  supplier('vida-farm', 'Vida Farm', 'Việt Nam — theo brief, chưa xác minh', 'https://vidafarm.vn/en/oem-private-label/', ['Nhãn riêng', 'Phối trộn', 'Đóng gói'], ['Túi lọc — cần xác minh', 'Túi tam giác — cần xác minh'], 'Xác minh nhận trà khách cung cấp, mức tối thiểu và phạm vi báo giá mẫu; không dùng mức tối thiểu suy đoán.'),
  supplier('hvl-tea', 'HVL TEA', 'Long Biên, Hà Nội — theo brief, chưa xác minh', null, ['Vật tư túi lọc', 'Túi và hộp bao bì'], ['Vật tư lọc và bao bì — cần xác minh'], 'Xác minh đúng pháp nhân, website và đầu mối trước khi đánh giá vật tư tiếp xúc thực phẩm.'),
  supplier('eurofins-sac-ky-hai-dang', 'Eurofins Sắc Ký Hải Đăng', 'Việt Nam — theo brief, chưa xác minh', 'https://www.eurofins.vn/', ['Kiểm nghiệm sản phẩm — cần xác minh phạm vi'], ['Mẫu kiểm nghiệm — thống nhất theo yêu cầu'], 'Xác minh phòng thử nghiệm, phạm vi được công nhận, chỉ tiêu, mẫu yêu cầu và báo giá hiện hành.'),
];

export const DEVELOPMENT_WORKSTREAMS = [
  { code: 'WS01', name: 'Kiểm kê trà và quy cách hiện có', status: 'planned', next_task: 'Đối chiếu danh mục, biến thể và lô thực tế; xác minh A005/A006 để tránh tạo trùng.' },
  { code: 'WS02', name: 'Trà đá phổ thông', status: 'planned', next_task: 'Chọn phân hạng thực phẩm, chuẩn hóa mẻ pha 1kg và thử túi 20g/50g.' },
  { code: 'WS03', name: 'Gia công trà túi lọc', status: 'planned', next_task: 'Xác minh ít nhất ba đầu mối nhận trà Hoàng Long; yêu cầu báo giá và mẫu thực tế.' },
  { code: 'WS04', name: 'Trà ép và lưu trữ niên vụ', status: 'planned', next_task: 'Tìm và xác minh đối tác chỉ ép thuê bằng trà Hoàng Long cùng quy trình phù hợp; nhiệm vụ này vẫn mở, chưa hoàn tất.' },
  { code: 'WS05', name: 'Trà nền B2B dạng khô', status: 'planned', next_task: 'Dùng công thức, mẫu và báo giá hiện có để chuẩn hóa định mức và hướng dẫn pha.' },
  { code: 'WS06', name: 'Phân hạng và tận dụng nguyên liệu', status: 'planned', next_task: 'Đo phân đoạn theo lô và duyệt mục đích thực phẩm/chiết xuất/phi thực phẩm/loại bỏ.' },
  { code: 'WS07', name: 'Website dịch vụ và hợp tác sản xuất', status: 'later', next_task: 'Giai đoạn 3: rà soát năng lực thực có rồi nối yêu cầu hợp tác vào CRM và mẫu hiện có.' },
  { code: 'WS08', name: 'Lưu nghiên cứu D, H và K', status: 'research_only', next_task: 'Lưu ý tưởng và yêu cầu kỹ thuật; chưa tạo cam kết sản xuất hoặc đầu tư.' },
];

export const DEVELOPMENT_BUDGET_ALLOWANCES = [
  { code: 'retail_packaging', name: 'Thử đóng gói trà lá', min_vnd: 2000000, max_vnd: 5000000 },
  { code: 'tea_bag_samples', name: 'Mẫu gia công trà túi lọc', min_vnd: 2000000, max_vnd: 6000000 },
  { code: 'economy_iced_tea', name: 'Thử trà đá phổ thông và B2B', min_vnd: 1000000, max_vnd: 4000000 },
  { code: 'tea_cake_trials', name: 'Thử trà ép', min_vnd: 2000000, max_vnd: 6000000 },
  { code: 'laboratory_testing', name: 'Kiểm nghiệm', min_vnd: 2000000, max_vnd: 8000000 },
  { code: 'packaging_prototypes', name: 'Thiết kế và mẫu bao bì', min_vnd: 1000000, max_vnd: 3000000 },
  { code: 'contingency', name: 'Dự phòng', min_vnd: 2000000, max_vnd: 5000000 },
].map(item => ({ ...item, provenance: 'internal_estimate', approval_status: 'not_approved', source: 'Brief 19/10/2026 — dự toán nghiên cứu, không phải báo giá nhà cung cấp' }));

export const DEVELOPMENT_BUDGET_NOTE = 'Các khoản thành phần cộng thành 12–37 triệu đồng, khác tổng 12–35 triệu đồng ghi trong brief; cần đối chiếu trước khi duyệt. Chưa có ngân sách được duyệt, chi thực tế hoặc cam kết thanh toán. Chưa tính giá trị trà đầu vào, chi phí vận hành thường kỳ và vốn sản xuất thương mại.';

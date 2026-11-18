const people = 'Nhân sự';
export const DOCUMENT_GROUPS = ['Kinh doanh & đối tác', 'Dịch vụ & tài sản', 'Quản trị & dữ liệu', 'Khi có giao dịch đầu tư', people];
export const EMPLOYEE_SECTION = 'Người lao động';

const service = 'Triển khai dịch vụ';
const assets = 'Tài sản và quyền sử dụng';
const privacy = 'Xử lý dữ liệu cá nhân';
const decision = 'Nội dung quyết định';
const deal = 'Nội dung đề xuất';
const employment = 'Công việc và thời hạn';
const employmentPay = 'Lương và điều kiện làm việc';
const employmentBenefits = 'Bảo hiểm và đào tạo';

export const BUSINESS_DOCUMENT_FIELDS = [
  ['work_scope', 'Phạm vi công việc, bên thực hiện và đầu mối', service],
  ['work_acceptance', 'Đầu ra, mốc giao, tiêu chí nghiệm thu và cách yêu cầu sửa', service],
  ['work_payment', 'Phí, chi phí, thuế, chứng từ và lịch thanh toán', service],
  ['sow_contract', 'Số, ngày và tên hợp đồng dịch vụ làm căn cứ', service],
  ['sow_project', 'Tên dự án / đợt công việc và khoảng thời gian thực hiện', service],
  ['sow_schedule', 'Mốc bàn giao, sản phẩm bàn giao và hạn của từng mốc', service],
  ['sow_changes', 'Người duyệt thay đổi, phát sinh chi phí và hạn mức', service],
  ['employment_job', 'Vị trí, nhiệm vụ và địa điểm làm việc', employment],
  ['employment_pay', 'Lương theo công việc (VND), hình thức và kỳ trả, phụ cấp và khoản bổ sung', employmentPay],
  ['employment_raise', 'Chế độ nâng bậc, nâng lương', employmentPay],
  ['employment_hours', 'Thời giờ làm việc, nghỉ ngơi và cách bố trí ca', employmentPay],
  ['employment_safety', 'Trang bị bảo hộ lao động và điều kiện an toàn theo vị trí', employmentPay],
  ['employment_insurance', 'BHXH, BHYT, BHTN và trách nhiệm thực hiện', employmentBenefits],
  ['employment_training', 'Đào tạo, bồi dưỡng và nâng cao kỹ năng nghề', employmentBenefits],
  ['work_exit', 'Bảo mật, quyền đối với đầu ra, chấm dứt và bàn giao', service],
  ['advisor_conflicts', 'Công việc đang thực hiện, xung đột lợi ích và cách thông báo', service],
  ['ip_assets', 'Bên có quyền, danh mục tài sản, phiên bản và hồ sơ chứng minh', assets],
  ['ip_grant', 'Quyền chuyển nhượng hoặc cấp phép, phạm vi và thời hạn', assets],
  ['ip_exclusions', 'Tài sản có trước, quyền giữ lại và giấy phép bên thứ ba', assets],
  ['ip_handover', 'Bàn giao, phí, thời điểm hiệu lực và thủ tục đăng ký khi áp dụng', assets],
  ['data_roles', 'Hợp đồng chính, vai trò, đầu mối và thời hạn xử lý của từng bên', privacy],
  ['data_scope', 'Chủ thể, loại dữ liệu, mục đích, nguồn và thao tác được phép', privacy],
  ['data_safeguards', 'Quyền truy cập, biện pháp bảo vệ, nhật ký và hỗ trợ kiểm tra', privacy],
  ['data_vendors', 'Bên xử lý phụ, quốc gia lưu trữ/truy cập và cơ chế phê duyệt', privacy],
  ['data_incidents', 'Tiếp nhận yêu cầu về quyền dữ liệu, sự cố và thời hạn báo cho Hoàng Long', privacy],
  ['data_retention', 'Thời hạn lưu, hoàn trả, tiêu hủy và xử lý bản sao phải giữ', privacy],
  ['owner_basis', 'Căn cứ theo điều lệ và hồ sơ liên quan', decision],
  ['owner_resolution', 'Nội dung được quyết định, phạm vi và hạn mức nếu có', decision],
  ['owner_execution', 'Người thực hiện, hiệu lực, thời hạn và nơi lưu hồ sơ', decision],
  ['proposal_scope', 'Phạm vi hợp tác hoặc giao dịch dự kiến', deal],
  ['proposal_commercial', 'Điều kiện thương mại dự kiến và giả định cần xác nhận', deal],
  ['proposal_steps', 'Việc cần xác minh, điều kiện tiên quyết và thời hạn xem xét', deal],
  ['funding_structure', 'Cấu trúc dự kiến, giá trị, định giá và quyền đề xuất nếu có', deal],
];

const section = (title, fields, note) => ({ title, fields, note });

export function businessDocumentTemplates(partyFields, essentials) {
  const definitions = [
    {
      id: 'professional_services',
      title: 'Hợp đồng dịch vụ chuyên nghiệp',
      group: DOCUMENT_GROUPS[1],
      description: 'Dùng cho thiết kế bao bì, phát triển website, chụp ảnh, kiểm nghiệm hoặc dịch vụ thuê ngoài.',
      sections: [
        section('Phạm vi và nghiệm thu', ['work_scope', 'work_acceptance'], 'Thay đổi phạm vi, chi phí hoặc thời hạn cần được các bên xác nhận bằng văn bản trước khi triển khai phần thay đổi.'),
        section('Phí và kết thúc dịch vụ', ['work_payment', 'work_exit'], 'Hai bên xác định rõ đầu ra hoặc mốc làm căn cứ nghiệm thu và thanh toán. Việc bàn giao bản sao tệp chỉ chuyển quyền khai thác nếu các bên đã thỏa thuận quyền đó.'),
      ],
    },
    {
      id: 'statement_of_work',
      title: 'Phụ lục mô tả công việc (SOW)',
      group: DOCUMENT_GROUPS[1],
      description: 'Gắn với hợp đồng dịch vụ khi giao một đợt thiết kế bao bì, chụp ảnh hoặc làm website.',
      sections: [
        section('Hợp đồng chính và phạm vi công việc', ['sow_contract', 'sow_project', 'work_scope'], 'Phụ lục cụ thể hóa công việc theo hợp đồng được dẫn chiếu. Các điều khoản chung tiếp tục áp dụng theo hợp đồng chính.'),
        section('Tiến độ, bàn giao và nghiệm thu', ['sow_schedule', 'work_acceptance'], 'Ghi đầu ra cho từng mốc, định dạng bàn giao, người nghiệm thu và thời hạn phản hồi.'),
        section('Chi phí và thay đổi', ['work_payment', 'sow_changes'], 'Hai bên xác nhận bằng văn bản thay đổi phạm vi, thời hạn, phí hoặc công việc phát sinh trước khi thực hiện. Nếu sửa điều khoản của hợp đồng chính, ghi rõ điều khoản và nội dung sửa đổi để hai bên xác nhận.'),
      ],
    },
    {
      id: 'employment_agreement',
      title: 'Hợp đồng lao động',
      group: people,
      employee: true,
      description: 'Bản nháp tuyển nhân viên trưởng thành làm việc tại Việt Nam. Bản tải xuống có thông tin định danh và lương, cần lưu ở nơi riêng tư.',
      sections: [
        section('Công việc, địa điểm và thời hạn', ['employment_job', 'employment_type', 'employment_start', 'employment_end'], 'Hợp đồng có hiệu lực kể từ ngày bắt đầu làm việc ghi ở trên.'),
        section('Tiền lương và điều kiện làm việc', ['employment_pay', 'employment_raise', 'employment_hours', 'employment_safety']),
        section('Bảo hiểm, đào tạo và chấm dứt', ['employment_insurance', 'employment_training'], 'Các bên thực hiện việc sửa đổi, chấm dứt, thông báo và giải quyết quyền lợi theo Bộ luật Lao động và quy định áp dụng. Khi kết thúc hợp đồng, hai bên bàn giao công việc và tài sản, đối chiếu các khoản phải trả và thực hiện các thủ tục liên quan theo quy định.'),
      ],
      sources: [{ label: 'Bộ luật Lao động 45/2019/QH14', href: 'https://vanban.chinhphu.vn/?docid=198540&pageid=27160' }],
    },
    {
      id: 'advisor_agreement',
      title: 'Hợp đồng cố vấn',
      group: DOCUMENT_GROUPS[1],
      description: 'Dùng khi mời cố vấn về sản phẩm, phân phối, xuất khẩu hoặc vận hành.',
      sections: [
        section('Nhiệm vụ cố vấn', ['work_scope', 'work_acceptance', 'advisor_conflicts'], 'Cố vấn đưa ra ý kiến chuyên môn. Quyết định và quyền cam kết thay công ty thuộc người có thẩm quyền. Cố vấn công bố xung đột lợi ích khi phát sinh.'),
        section('Thù lao, bảo mật và bàn giao', ['work_payment', 'work_exit'], 'Quyền đối với vốn công ty chỉ được xem xét theo giao dịch và hồ sơ riêng. Các bên xác định nghĩa vụ theo cách công việc thực tế được tổ chức và thực hiện.'),
      ],
    },
    {
      id: 'ip_transfer',
      title: 'Thỏa thuận chuyển giao quyền sở hữu trí tuệ',
      group: DOCUMENT_GROUPS[1],
      description: 'Dùng cho logo, nhãn trà, ảnh, nội dung, thiết kế bao bì hoặc mã nguồn.',
      sections: [
        section('Tài sản và quyền được giao', ['ip_assets', 'ip_grant', 'ip_exclusions'], 'Chỉ quyền được phép chuyển giao và được liệt kê rõ mới nằm trong phạm vi thỏa thuận. Quyền nhân thân không thể chuyển giao vẫn thuộc người có quyền. Kiểm tra giấy phép font, ảnh, mã nguồn, tư liệu và quyền của đồng tác giả trước khi bàn giao.'),
        section('Bàn giao và hoàn tất', ['ip_handover'], 'Ghi rõ tệp gốc, phiên bản, tài khoản hoặc kho mã, tài liệu chứng minh chuỗi quyền và thủ tục cần thực hiện đối với từng loại tài sản.'),
      ],
    },
    {
      id: 'data_processing',
      title: 'Phụ lục xử lý dữ liệu cá nhân (DPA)',
      group: DOCUMENT_GROUPS[2],
      description: 'Dùng khi bên cung cấp xử lý dữ liệu khách hàng hoặc nhân sự theo chỉ dẫn của Hoàng Long.',
      sections: [
        section('Vai trò và phạm vi xử lý', ['data_roles', 'data_scope'], 'Bên xử lý thực hiện theo chỉ dẫn hợp pháp, có ghi nhận của bên kiểm soát. Xác định căn cứ xử lý và nghĩa vụ thông báo trước khi xử lý theo mục đích đã thống nhất. Dùng danh mục dữ liệu, không chép dữ liệu thật vào phụ lục.'),
        section('Bảo vệ, bên xử lý phụ và sự cố', ['data_safeguards', 'data_vendors', 'data_incidents'], 'Giới hạn quyền truy cập theo nhiệm vụ và ràng buộc bảo mật. Chỉ cho phép bên xử lý phụ theo cơ chế phê duyệt đã xác nhận và áp dụng nghĩa vụ tương ứng. Đánh giá nghĩa vụ về xử lý và chuyển dữ liệu xuyên biên giới trước khi triển khai. Bên xử lý báo ngay qua đầu mối đã thỏa thuận để bên có trách nhiệm thực hiện nghĩa vụ thông báo đúng hạn.'),
        section('Kết thúc xử lý', ['data_retention'], 'Xác nhận việc hoàn trả hoặc xóa, kể cả xử lý bản sao lưu. Nếu phải lưu theo pháp luật, ghi căn cứ, giới hạn truy cập và lịch xóa.'),
      ],
      sources: [
        { label: 'Luật 91/2025/QH15', href: 'https://vanban.chinhphu.vn/?docid=214590&pageid=27160' },
        { label: 'Nghị định 356/2025/NĐ-CP', href: 'https://vanban.chinhphu.vn/?docid=216387&pageid=27160' },
      ],
    },
    {
      id: 'owner_decision',
      title: 'Quyết định của chủ sở hữu công ty',
      group: DOCUMENT_GROUPS[2],
      description: 'Văn bản nội bộ của chủ sở hữu TNHH một thành viên. Dùng trong phạm vi thẩm quyền theo điều lệ.',
      oneParty: true,
      sections: [
        section('Căn cứ và nội dung quyết định', ['owner_basis', 'owner_resolution']),
        section('Tổ chức thực hiện', ['owner_execution'], 'Giao đầu mối cập nhật và lưu hồ sơ. Nếu nội dung cần thông báo, đăng ký hoặc văn bản kèm theo, ghi rõ người chịu trách nhiệm và thời hạn.'),
      ],
    },
    {
      id: 'letter_of_intent',
      title: 'Thư ý định hợp tác (LOI)',
      group: DOCUMENT_GROUPS[0],
      description: 'Dùng khi trao đổi ban đầu về thử mẫu, phân phối, gia công hoặc đơn trà B2B.',
      sections: [
        section('Nội dung dự kiến', ['proposal_scope', 'proposal_commercial'], 'Có thể ghi danh mục trà, mẫu, sản lượng dự kiến, điều kiện giao hàng và tiêu chí duyệt mẫu.'),
        section('Bước tiếp theo và tính chất của thư', ['proposal_steps'], 'Thư ghi nhận ý định trao đổi. Thư không tạo đơn đặt hàng, nghĩa vụ đặt cọc, mua hoặc cung cấp hàng, độc quyền hay nghĩa vụ ký hợp đồng. Nếu cần bảo mật, các bên dùng thỏa thuận bảo mật riêng.'),
      ],
    },
    {
      id: 'investment_term_sheet',
      title: 'Bản điều khoản đầu tư sơ bộ (Term Sheet)',
      group: DOCUMENT_GROUPS[3],
      description: 'Chỉ mở khi có trao đổi với nhà đầu tư. Dùng để xem xét cấu trúc phù hợp với công ty hiện tại.',
      sections: [
        section('Đề xuất và điều kiện tiên quyết', ['proposal_scope', 'funding_structure', 'proposal_steps'], 'Xác định tư cách nhà đầu tư, phương thức giao dịch, thẩm quyền và thủ tục chuyển đổi hoặc đăng ký nếu cấu trúc dự kiến yêu cầu.'),
        section('Tính chất của bản điều khoản', [], 'Bản điều khoản ghi nhận phương án thảo luận. Các bên chưa có nghĩa vụ góp vốn, chuyển nhượng, phát hành cổ phần, cấp quyền sở hữu hoặc chuyển tiền. Chỉ triển khai sau khi đủ điều kiện và có văn bản giao dịch chính thức.'),
      ],
    },
  ];
  return definitions.map(template => {
    const subjectFields = template.sections.flatMap(({ fields }) => fields);
    const companyOnly = template.oneParty || template.employee;
    const employeeFields = template.employee ? ['employee_name', 'employee_birth', 'employee_gender', 'employee_address', 'employee_id'] : [];
    const identityFields = companyOnly ? partyFields.filter(field => !field.startsWith('partner_')) : partyFields;
    const requiredIdentity = companyOnly ? essentials.filter(field => !field.startsWith('partner_')) : essentials;
    return {
      ...template,
      fields: [...identityFields, ...employeeFields, ...subjectFields, 'other_terms'],
      required: [...requiredIdentity, ...employeeFields, ...subjectFields.filter(field => field !== 'employment_end')],
    };
  });
}

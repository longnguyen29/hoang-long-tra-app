// Constructed only on the server from the saved enquiry, never from an API caller's text.
export function eventEnquiryTelegramMessage(row) {
  const type = {sample:'Yêu cầu mẫu', quote:'Yêu cầu báo giá', cooperation:'Yêu cầu hợp tác'}[row.intent] || 'Yêu cầu liên hệ';
  return [
    `🍃 ${type} mới`,
    `👤 ${row.name || 'Chưa có tên'}`,
    row.business ? `🏪 ${row.business}` : null,
    `📞 ${row.contact || 'Chưa có liên hệ'}`,
    row.note ? `📝 ${row.note}` : null,
    `📍 Nguồn: ${[row.source, row.medium].filter(Boolean).join(' · ') || 'website'}`,
    'Mở CRM: https://www.hoanglongtra.com/admin/pipeline',
  ].filter(Boolean).join('\n');
}

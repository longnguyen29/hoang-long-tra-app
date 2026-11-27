export const businessPhases = [
  { id:"plant", label:"Ươm nền", verb:"Chuẩn bị", advice:"Ghi đúng ngày gửi mẫu, câu hỏi phản hồi và chi phí. Chọn dòng trà dễ bắt đầu cho quán." },
  { id:"grow", label:"Tăng trưởng", verb:"Mở rộng", advice:"Tăng tiếp cận ở kênh đã cho khách phù hợp. Theo dõi tỷ lệ mẫu thành đơn và biên gộp." },
  { id:"harvest", label:"Thu kết quả", verb:"Chốt đơn", advice:"Chốt báo giá, giao đúng, thu tiền và xây lịch mua lại với khách đã dùng trà." },
  { id:"restore", label:"Hồi phục", verb:"Củng cố", advice:"Đối soát tồn, công nợ và giá vốn. Sửa nút thắt trước khi mở thêm đơn hoặc tăng ngân sách." },
];

export const vnToday = (now = new Date()) => new Intl.DateTimeFormat("sv-SE", {
  year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Asia/Ho_Chi_Minh",
}).format(now);

function validDate(value) {
  if (typeof value!=="string" || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false;
  const date=new Date(`${value}T00:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0,10)===value;
}

export function validateBusinessCycle(input, period) {
  if (input===null) return null;
  if (!input || !businessPhases.some(phase=>phase.id===input.phase)
    || !validDate(input.startsOn) || !validDate(input.reviewOn)
    || input.startsOn.slice(0,7)!==period.slice(0,7) || input.reviewOn<input.startsOn
    || typeof input.readyWhen!=="string" || !input.readyWhen.trim() || input.readyWhen.trim().length>350) return undefined;
  return {phase:input.phase,startsOn:input.startsOn,reviewOn:input.reviewOn,readyWhen:input.readyWhen.trim()};
}

export function currentBusinessCycle(rows,today) {
  // Rows arrive in descending period order. A scheduled cycle becomes active
  // on the Vietnam date chosen by the owner.
  return rows.find(row=>row.cycle?.startsOn<=today && businessPhases.some(phase=>phase.id===row.cycle.phase)) || null;
}

export function reviewLabel(reviewOn, today) {
  const days=(Date.parse(reviewOn)-Date.parse(today))/86400000;
  if (days===0) return "Xem lại hôm nay";
  return days>0?`Còn ${days} ngày`:`Trễ ${Math.abs(days)} ngày`;
}

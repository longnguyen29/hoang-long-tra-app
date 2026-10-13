// Only owner-approved, public presentation contacts belong here. These are not
// Partner Network accounts and do not grant lead ownership or commission rights.
export const EXPORT_SALES_PROFILES = [
  { id: "house", label: "Hoàng Long", contact: null, pdf: "/downloads/hoang-long-b2b-sales-kit-vi.pdf" },
  {
    id: "anh-long", label: "Anh Long",
    contact: { name: "Anh Long", role: "Đối tác được Hoàng Long ủy quyền", phone: "+84782293579", phoneLabel: "078 229 3579" },
    pdf: "/downloads/hoang-long-b2b-sales-kit-anh-long.pdf",
  },
];

export const EXPORT_DELIVERY_WINDOW = {
  value: "2–8 tuần",
  note: "Đã gồm thời gian vận chuyển; chưa bao gồm chậm trễ ngoài dự kiến.",
};

export function getExportSalesProfile(value) {
  if (value === undefined) return EXPORT_SALES_PROFILES[0];
  return typeof value === "string" ? EXPORT_SALES_PROFILES.find(profile => profile.id === value) || null : null;
}

// Development-only records for reviewing /brain without a Supabase project.
// BrainPage refuses this mode in production builds, even if the public flag is set.
export const brainDemoData = {
  orders: [
    { id: "HL-260821-01", ts: "2026-08-21T08:30:00+07:00", type: "wholesale", customer_name: "Serein Coffee", contact: "demo@serein.example", status: "pending" },
    { id: "HL-260819-04", ts: "2026-08-19T14:10:00+07:00", type: "retail", customer_name: "Lotus Pantry", contact: "demo@lotus.example", status: "confirmed" },
  ],
  leads: [{ id: "lead-mori", ts: "2026-08-20T10:00:00+07:00", name: "Mori Lab", contact: "demo@mori.example", interest: "wholesale", unread: true }],
  samples: [
    { id: "sample-an-nhien", ts: "2026-08-21T07:45:00+07:00", store_name: "An Nhiên Tea Room", phone: "0900000000", pack: "100g", status: "new" },
    { id: "sample-serein", ts: "2026-08-18T09:20:00+07:00", store_name: "Serein Coffee", phone: "0900000001", pack: "250g", status: "sent" },
  ],
  threads: [{ id: "thread-1", customer_id: "demo-customer", customer_name: "An Nhiên Tea Room", unread_for_admin: true, created_at: "2026-08-21T09:05:00+07:00", messages: [{ text: "Can this Shan Black hold up in oat milk?" }] }],
  notes: [{ contact_key: "demo@serein.example", note: "Bar lead wants strong aroma with less astringency at service speed.", updated_at: "2026-08-20T16:00:00+07:00", updated_by: "Long" }],
  products: [{ id: "shan-black", name: { en: "Tây Côn Lĩnh Shan Black", vi: "Hồng Trà Shan Tây Côn Lĩnh" } }],
  vendors: [{ id: "vendor-ha-giang", name: "Hà Giang Mountain Collective" }],
  sessions: [],
};

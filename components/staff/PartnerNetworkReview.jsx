"use client";
import { PartnerCard, ReferralCard, ReconcileForm, CommissionCard } from "./PartnerNetworkDesk";
import styles from "./PartnerNetworkDesk.module.css";

// Read-only design fixture: the server route exists only in local development.
// No client/backend is supplied, all save actions are disabled and never call an RPC.
const partner = { id: "10000000-0000-4000-8000-000000000001", code: "HL-P-DEMO", status: "approved", business_name: "Đối tác minh hoạ", contact_name: "Người kiểm thử", email: "partner@example.test", phone: "0900000000", region: "Hà Nội", partner_type: "consultant", first_order_rate_percent: 3, default_rate_percent: 3, rate_percent: 3, repeat_rate_percent: 1, repeat_order_limit: 3, terms: "Ví dụ để xem giao diện; không phải điều kiện hợp tác đã công bố.", created_at: "2026-10-11T08:00:00Z" };
const referral = { id: "20000000-0000-4000-8000-000000000002", partner_id: partner.id, business_name: "Quán minh hoạ", contact_name: "Người liên hệ", contact: "cafe@example.test", location: "Hà Nội", product_interest: "Hồng trà cho trà sữa", expected_volume_kg: 50, status: "accepted", opportunity_id: "opp-referral-demo", pipeline_stage: "quoted", created_at: "2026-10-11T10:00:00Z", duplicates: [] };
const orders = [{ id: "order-DEMO-20261012", customer_name: referral.business_name, collected: 10000000, partner_id: partner.id, referral_id: referral.id }];
const commission = { id: "30000000-0000-4000-8000-000000000003", partner_id: partner.id, referral_id: referral.id, order_id: orders[0].id, status: "review", rate_percent: 3, collected_amount: 10000000, current_collected: 10000000, collection_complete: true, current_vat_amount: 800000, current_billed_shipping_amount: 200000, current_refunded_amount: 0, current_cancelled: false, vat_amount: 800000, billed_shipping_amount: 200000, refunded_amount: 0, eligible_base: 9000000, current_eligible_base: 9000000, calculated_amount: 270000, current_amount: 270000, adjustment_amount: 0, internal_cost_total: 7000000, minimum_retained_profit: 1500000, cost_total: 7000000, minimum_profit: 1500000, current_commission_cap: 500000, review_note: "Số liệu minh hoạ để duyệt cách trình bày, không phải giá vốn thật.", stale: false };
const disabled = { busy: false, ready: false, onAction: async () => {} };
export default function PartnerNetworkReview() {
  return <main className={styles.page} data-no-translate lang="vi">
    <header className={styles.header}><div><p>Hoàng Long · Duyệt giao diện</p><h1>Mạng lưới đối tác</h1><span>Dữ liệu mô phỏng. Các nút lưu bị khoá; không gửi email, không tạo khách hoặc chi trả.</span></div></header>
    <p className={styles.internalNotice}>Bản nội bộ chỉ mở trên máy này khi bật chế độ phát triển. Tỷ lệ và chi phí dưới đây là ví dụ bố cục, chưa phải chính sách công bố.</p>
    <section className={styles.workspace} aria-label="Hồ sơ minh hoạ">
      <h2>Đối tác</h2><PartnerCard partner={partner} {...disabled}/>
      <h2>Khách giới thiệu</h2><ReferralCard referral={referral} partner={partner} orders={orders} {...disabled}/>
      <h2>Đối soát theo tiền thực thu</h2><ReconcileForm orders={orders} partners={new Map([[partner.id, partner]])} {...disabled}/>
      <CommissionCard commission={commission} partner={partner} referral={referral} role="admin" onReview={() => {}} {...disabled}/>
    </section>
  </main>;
}

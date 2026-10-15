"use client";
import { Award } from "lucide-react";
import styles from "./PartnerRewards.module.css";
const money = value => value == null ? "Chưa đủ dữ liệu đối soát" : Number(value).toLocaleString("vi-VN") + "đ";
const list = value => Array.isArray(value) ? value : [];
const states = { review: "Chờ duyệt", approved: "Đã duyệt, chưa trả", paid: "Đã trả", void: "Đã hủy" };
const period = row => row.kind === "yearly" || row.period_kind === "yearly" ? `Năm ${String(row.period_start || row.month).slice(0, 4)}` : `Tháng ${String(row.period_start || row.month).slice(5, 7)}/${String(row.period_start || row.month).slice(0, 4)}`;
const label = row => row.kind === "personal" ? "Thưởng cá nhân" : row.legacy ? "Thưởng theo số đơn (lịch sử)" : `Thưởng doanh thu ${row.kind === "yearly" ? "năm" : "tháng"}`;
export default function PartnerRewardsView({ rewards = {} }) {
 const active = list(rewards.classic_agreements).filter(row => new Date(row.effective_at) <= new Date()).sort((a, b) => b.version - a.version)[0];
 const records = list(rewards.rewards);
 const previews = list(rewards.period_previews).sort((a, b) => String(b.period_start).localeCompare(String(a.period_start)));
 return <section className={styles.panel}>
  <header><Award size={22}/><div><h2>Điều kiện & thưởng</h2><p>Hoa hồng từng đơn, thưởng doanh thu tháng hoặc năm và thưởng cá nhân.</p></div></header>
  {active ? <div className={styles.card}><h3>{active.tier_name || "Classic"}</h3><p>Hai đơn đủ điều kiện đầu của cùng khách: <strong>{active.first_rate}% lãi sau chi phí</strong>. Từ đơn thứ ba: <strong>{active.repeat_rate}%</strong>.</p><p className={styles.hint}>Chỉ áp dụng đơn phát sinh từ {new Date(active.effective_at).toLocaleDateString("vi-VN")}, gắn đúng nguồn của bạn. Đơn trước được tính khi hoàn tất, thu đủ tiền và không hoàn tiền. Lãi tính trước hoa hồng; chi phí chưa đối soát thì số tiền chưa chốt. Báo giá hưởng chênh dùng điều kiện riêng, không cộng chồng tỷ lệ này.</p>{Number(active.monthly_bonus_multiplier) !== 1 && <small>Hệ số thưởng doanh thu theo kỳ đã thỏa thuận: {active.monthly_bonus_multiplier}. Không áp dụng cho thưởng cá nhân.</small>}</div> : <p className={styles.notice}>Chưa có điều kiện Classic có hiệu lực. Điều kiện đã thỏa thuận trước đó vẫn giữ nguyên; Hoàng Long sẽ xác nhận khi có thay đổi.</p>}
  <div className={styles.card}><h3>Thưởng doanh thu theo kỳ</h3><p>Chọn một chu kỳ tháng hoặc năm theo thỏa thuận, không cộng chồng. Chỉ tính tiền thực thu từ đơn được xác nhận do bạn mang về, trừ VAT, phí vận chuyển thu hộ và hoàn tiền. Không xét số lượng đơn.</p>
   {previews.length ? previews.map(row => <div key={`${row.period_kind}-${row.period_start}`} className={styles.preview}><strong>{period(row)}</strong><span>Thu thuần: {money(row.revenue_amount)}</span><b>{row.rule_enabled ? `${money(row.estimated_amount)}${row.estimated_amount == null ? "" : " dự kiến"}` : "Chưa có bảng thưởng áp dụng"}</b>{Number(row.unreviewed_orders) > 0 && <small>Còn dữ liệu thu tiền cần đối soát.</small>}</div>) : <p className={styles.hint}>Hoàng Long chưa xác nhận chu kỳ thưởng doanh thu cho bạn.</p>}
   <small>Thanh toán từng phần được ghi vào kỳ nhận tiền; số dự kiến có thể đổi khi hoàn tiền/đối soát. Áp dụng bậc cao nhất đạt được, quản lý duyệt khi kỳ kết thúc. Không tự chi trả.</small>
  </div>
  <div className={styles.card}><h3>Các khoản thưởng</h3>{records.length ? records.map(row => <article key={row.id} className={styles.reward}><div className={styles.rewardHead}><strong>{label(row)} · {period(row)}</strong><span className={styles.chip}>{states[row.status] || row.status}</span></div><b className={styles.amount}>{money(row.amount)}</b><p>{row.reason}</p>{row.reward_basis === "net_collected_revenue" && <small>Doanh thu thuần khi đối soát: {money(row.qualifying_revenue)}</small>}{row.legacy && <small>{row.qualifying_orders} đơn theo quy tắc cũ; giữ để đối chiếu lịch sử.</small>}{row.stale && <p className={styles.warning}>Có thay đổi ở dữ liệu nguồn. Hoàng Long cần đối chiếu lại; lịch sử khoản đã trả vẫn được giữ.</p>}{row.paid_at && <small>Ghi nhận trả: {new Date(row.paid_at).toLocaleDateString("vi-VN")}{row.paid_reference ? ` · ${row.paid_reference}` : ""}</small>}</article>) : <p className={styles.hint}>Chưa có khoản thưởng riêng. Hoa hồng đơn hàng nằm trong mục Đơn & tiến độ / Hoa hồng.</p>}</div>
 </section>;
}

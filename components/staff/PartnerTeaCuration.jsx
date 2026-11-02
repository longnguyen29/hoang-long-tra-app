"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./PartnerTeaCuration.module.css";

const emptySnapshot = { products: [], batches: [], reviews: [] };
const productName = p => (typeof p?.name === "object" ? (p.name?.vi || p.name?.en) : p?.name) || p?.id || "Chưa có tên";
const decisionText = decision => decision === "approved" ? "Đã chọn" : decision === "withdrawn" ? "Đã thu hồi" : "Chưa chọn";
const systemReasonText = reason => ({ reference_changed: "Tự động thu hồi do thông tin lô thay đổi", supplier_changed: "Tự động thu hồi do nhà cung cấp thay đổi", product_changed: "Tự động thu hồi do hồ sơ sản phẩm thay đổi" }[reason] || (reason ? "Tự động thu hồi do thông tin thay đổi" : ""));
const readResult = data => {
  const value = Array.isArray(data) && data.length === 1 ? data[0] : data;
  if (!value || !Array.isArray(value.products) || !Array.isArray(value.batches) || !Array.isArray(value.reviews)) throw new Error("invalid_result");
  return value;
};

export default function PartnerTeaCuration({ supabase }) {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [selectedId, setSelectedId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [tastedOn, setTastedOn] = useState("");
  const [note, setNote] = useState("");
  const [attested, setAttested] = useState(false);
  const [publishIdentity, setPublishIdentity] = useState(false);
  const [registerConfirmed, setRegisterConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await supabase.rpc("list_curated_tea_admin");
      if (result.error) throw result.error;
      setSnapshot(readResult(result.data));
    } catch {
      setError("Chưa tải được hồ sơ tuyển chọn. Vui lòng thử lại; có thể phần dữ liệu chưa được cài đặt hoặc tài khoản không có quyền.");
      setSnapshot(emptySnapshot);
    } finally { setLoading(false); }
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const product = useMemo(() => snapshot.products.find(item => item.id === selectedId), [selectedId, snapshot.products]);
  const batches = useMemo(() => snapshot.batches.filter(item => item.product_id === selectedId), [selectedId, snapshot.batches]);
  const batch = batches.find(item => item.id === batchId);
  const reviews = useMemo(() => snapshot.reviews.filter(item => item.product_id === selectedId), [selectedId, snapshot.reviews]);
  const latest = reviews[0];

  // Never carry consent or tasting confirmation across different identities,
  // including a refresh that changes the stored name of the supplier/producer.
  useEffect(() => { setAttested(false); setPublishIdentity(false); }, [selectedId, batchId, product?.supplier_name, batch?.producer, batch?.code]);

  function chooseProduct(event) {
    setSelectedId(event.target.value); setBatchId(""); setTastedOn(""); setNote(""); setAttested(false); setPublishIdentity(false); setRegisterConfirmed(false); setNotice(""); setError("");
  }

  async function register() {
    if (!product || busy || !registerConfirmed) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await supabase.rpc("register_curated_tea_product", { p_product_id: product.id });
      if (result.error) throw result.error;
      setRegisterConfirmed(false);
      await load();
      setNotice("Đã đưa sản phẩm vào diện xét chọn và ẩn khỏi bán. Hãy chọn lô và ghi kết quả thử trà.");
    } catch { setError("Chưa xác nhận đăng ký được sản phẩm. Hãy tải lại để kiểm tra trước khi thử lại."); }
    finally { setBusy(false); }
  }

  async function decide(event, decision, selectedBatch = batch) {
    event.preventDefault();
    if (!product || !selectedBatch || busy) return;
    if (decision === "approved" && (!tastedOn || !note.trim() || !attested || !publishIdentity || !product.supplier_name?.trim() || !selectedBatch.producer?.trim())) {
      setError("Hãy ghi ngày thử, lý do chọn và xác nhận việc thử trà cùng quyền công khai tên đối tác và nhà sản xuất."); return;
    }
    if (decision === "approved" && (selectedBatch.status !== "released" || selectedBatch.code !== product.batch)) {
      setError("Lô phải ở trạng thái đã phát hành và mã lô phải khớp hồ sơ sản phẩm trước khi chọn."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await supabase.rpc("set_curated_tea_review", {
        p_product_id: product.id,
        p_batch_id: decision === "approved" ? selectedBatch.id : null,
        p_decision: decision,
        p_tasted_on: decision === "approved" ? tastedOn : null,
        p_public_note: decision === "approved" ? note.trim() : "",
        p_attested: decision === "approved" && attested,
        p_publish_identity: decision === "approved" && publishIdentity,
        p_expected_supplier_name: decision === "approved" ? product.supplier_name : null,
        p_expected_producer_name: decision === "approved" ? selectedBatch.producer : null,
        p_expected_batch_code: decision === "approved" ? selectedBatch.code : null,
        p_expected_latest_review_id: latest?.id ?? null,
      });
      if (result.error) throw result.error;
      setTastedOn(""); setNote(""); setAttested(false); setPublishIdentity(false);
      await load();
      setNotice(decision === "approved" ? "Đã ghi nhận lựa chọn cho lô này. Kiểm tra giá, tồn và chủ động bật bán trong Danh mục khi sẵn sàng." : "Đã thu hồi lựa chọn. Sản phẩm được đưa về trạng thái ẩn.");
    } catch { setError("Chưa xác nhận lưu được quyết định. Thông tin hoặc quyết định có thể đã thay đổi. Hãy tải lại trước khi thử lại."); }
    finally { setBusy(false); }
  }

  return <section className={styles.panel} aria-labelledby="partner-tea-heading">
    <header className={styles.header}><div><p>HOÀNG LONG TUYỂN CHỌN</p><h2 id="partner-tea-heading">Trà từ đối tác</h2><span>Ghi nhận lô trà bạn trực tiếp thử và quyết định đưa vào bộ sưu tập.</span></div><button type="button" onClick={load} disabled={loading || busy}>Tải lại</button></header>
    <div className={styles.body}>
      <p className={styles.explanation}>Dấu tuyển chọn chỉ thể hiện đánh giá cảm quan của Hoàng Long. Không phải giấy chứng nhận an toàn hoặc kiểm nghiệm. Khi đổi lô, hãy thử và duyệt lại trước khi bán.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {loading ? <p aria-live="polite">Đang tải hồ sơ…</p> : !snapshot.products.length ? <div className={styles.empty}><strong>Chưa có sản phẩm có nhà cung cấp.</strong><p>Tạo sản phẩm ở tab Danh mục, gắn nhà cung cấp và giữ trạng thái ẩn trước. Tạo lô trà trong Vận hành.</p><div><Link href="/admin/operations">Mở quản lý lô trà →</Link></div></div> : <>
        <label className={styles.field}>Sản phẩm<select value={selectedId} onChange={chooseProduct} disabled={busy}><option value="">Chọn trà cần xét</option>{snapshot.products.map(item => <option value={item.id} key={item.id}>{productName(item)} · {item.supplier_name || "Chưa ghi tên nhà cung cấp"}</option>)}</select></label>
        {!product ? <p className={styles.muted}>Chọn một sản phẩm để xem tình trạng và ghi quyết định.</p> : <>
          <div className={styles.record}><div><span>Nhà cung cấp</span><strong>{product.supplier_name || "Chưa có thông tin"}</strong></div><div><span>Trạng thái bán</span><strong>{product.available ? "Đang bán" : "Đang ẩn"}</strong></div><div><span>Mã lô trên sản phẩm</span><strong>{product.batch || "Chưa ghi"}</strong></div><div><span>Quyết định gần nhất</span><strong>{latest ? decisionText(latest.decision) : "Chưa ghi nhận"}</strong></div></div>
          {!product.curated_partner_required ? <div className={styles.block}><h3>Bắt đầu xét trà đối tác</h3><p>Chỉ dùng cho trà thực sự do đối tác cung cấp. Đăng ký sẽ đưa sản phẩm về trạng thái ẩn để bạn kiểm tra lô và ghi quyết định. Việc này không tự bật bán hoặc xác nhận giấy tờ chất lượng.</p><label className={styles.check}><input type="checkbox" checked={registerConfirmed} onChange={event => setRegisterConfirmed(event.target.checked)}/><span>Tôi xác nhận đây là trà đối tác và đồng ý ẩn sản phẩm để xét duyệt.</span></label><button type="button" disabled={busy || !registerConfirmed} onClick={register}>Đăng ký xét tuyển chọn</button></div> : <>
            <div className={styles.block}><h3>Ghi quyết định theo lô</h3><p>Lô phải thuộc sản phẩm, đã được phát hành và có mã trùng với mã lô trong Danh mục. Trà chưa sẵn sàng vẫn để ẩn. <Link href="/admin/operations">Quản lý lô trà →</Link></p>
              {!batches.length ? <p className={styles.muted}>Chưa có lô gắn với sản phẩm này. Hãy tạo hoặc liên kết lô trong Vận hành.</p> : <form onSubmit={event => decide(event, "approved")}>
                <label className={styles.field}>Lô trà<select value={batchId} onChange={event => { setBatchId(event.target.value); setAttested(false); setPublishIdentity(false); }} required><option value="">Chọn lô đã thử</option>{batches.map(item => <option key={item.id} value={item.id}>{item.code} · {item.status === "released" ? "Đã phát hành" : item.status === "held" ? "Đang giữ" : item.status === "exhausted" ? "Đã hết" : "Chưa phát hành"}{item.producer ? ` · ${item.producer}` : ""}</option>)}</select></label>
                {batch && (batch.status !== "released" || batch.code !== product.batch || !batch.producer) && <p className={styles.warning}>Cần lô đã phát hành, có tên nhà sản xuất và mã lô khớp hồ sơ sản phẩm. Hãy kiểm tra trước khi duyệt.</p>}
                <label className={styles.field}>Ngày trực tiếp thử<input type="date" value={tastedOn} onChange={event => setTastedOn(event.target.value)} required/></label>
                <label className={styles.field}>Vì sao chọn trà này <small>Nội dung có thể hiển thị cho khách; không ghi thông tin riêng tư hoặc cam kết chưa kiểm chứng.</small><textarea value={note} onChange={event => setNote(event.target.value)} maxLength={500} rows={3} required/></label>
                <label className={styles.check}><input type="checkbox" checked={attested} onChange={event => setAttested(event.target.checked)}/><span>Tôi xác nhận đã trực tiếp thử và lựa chọn đúng lô trà này.</span></label>
                <label className={styles.check}><input type="checkbox" checked={publishIdentity} onChange={event => setPublishIdentity(event.target.checked)} disabled={!batch || !product.supplier_name?.trim() || !batch.producer?.trim()}/><span>Tôi xác nhận có quyền công khai tên nhà cung cấp <strong>{product.supplier_name || "chưa có tên"}</strong> và nhà sản xuất <strong>{batch?.producer || "chưa chọn lô"}</strong> cho lô <strong>{batch?.code || "chưa chọn lô"}</strong> trên website.</span></label>
                <div className={styles.actions}><button type="submit" disabled={busy || !batch || !attested || !publishIdentity || !product.supplier_name?.trim() || batch.status !== "released" || batch.code !== product.batch || !batch.producer?.trim()}>Ghi nhận đã lựa chọn</button></div>
              </form>}
            </div>
            {latest?.decision === "approved" && <div className={styles.withdraw}><strong>Cần tạm dừng bộ tuyển chọn?</strong><p>Thu hồi sẽ ẩn sản phẩm khỏi bán. Hãy kiểm tra lô hoặc xử lý phản ánh trước khi ghi lựa chọn mới.</p><button type="button" disabled={busy} onClick={event => { const current = batches.find(item => item.id === latest.batch_id); if (!current) { setError("Không tìm thấy lô đã được chọn. Hãy tải lại dữ liệu."); return; } decide(event, "withdrawn", current); }}>Thu hồi lựa chọn và ẩn sản phẩm</button></div>}
          </>}
          <div className={styles.history}><h3>Lịch sử quyết định</h3><p>Hiển thị 200 quyết định gần nhất trên toàn hệ thống cùng quyết định mới nhất của mỗi sản phẩm; lịch sử có thể chưa đầy đủ.</p>{reviews.length ? <ol>{reviews.map(item => <li key={item.id}><strong>{item.system_reason ? systemReasonText(item.system_reason) : decisionText(item.decision)}</strong><span>Lô: {snapshot.batches.find(row => row.id === item.batch_id)?.code || item.batch_id || "—"}</span><span>Ngày thử: {item.tasted_on || "—"}</span>{item.public_note && <p>{item.public_note}</p>}</li>)}</ol> : <p>Chưa có quyết định tuyển chọn được ghi nhận.</p>}</div>
        </>}
      </>}
    </div>
  </section>;
}

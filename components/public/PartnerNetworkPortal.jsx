"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Loader2, LogOut, Mail, Plus, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COMMISSION_STATUS, PARTNER_STATUS, PARTNER_TYPES, REFERRAL_STATUS, formatPartnerMoney, normalizePartnerLead, partnerErrorMessage, partnerStageLabel } from "@/lib/partner-network";
import { PartnerNetworkApplicationForm, clearPartnerApplicationDraft } from "./PartnerNetworkLanding";
import styles from "./PartnerNetworkPortal.module.css";

const EMPTY_LEAD = { business_name: "", contact_name: "", contact: "", location: "", product_interest: "", expected_volume_kg: "", notes: "", contact_authorized: false };
const dateLabel = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function PartnerLeadForm({ onSubmitted }) {
  const supabase = useMemo(() => createClient(), []);
  const requestId = useRef("");
  const [input, setInput] = useState(EMPTY_LEAD);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const change = (event) => {
    const { name, value, checked, type } = event.target;
    requestId.current = "";
    setInput((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSuccess("");
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setSuccess("");
    if (!requestId.current) requestId.current = crypto.randomUUID();
    const result = normalizePartnerLead({ ...input, request_id: requestId.current });
    setErrors(result.errors || {});
    if (!result.data || Object.keys(result.errors || {}).length) { setError("Kiểm tra các thông tin được đánh dấu trước khi gửi khách."); return; }
    setBusy(true);
    try {
      const { error: submitError } = await supabase.rpc("partner_network_submit_lead", { p_input: result.data });
      if (submitError) { setError(partnerErrorMessage(submitError)); return; }
      setInput(EMPTY_LEAD);
      requestId.current = "";
      setSuccess("Đã gửi khách giới thiệu. Hoàng Long sẽ kiểm tra trùng và xác nhận tiếp nhận trước khi xử lý.");
      await onSubmitted();
    } catch { setError("Chưa xác nhận được lượt gửi. Kiểm tra mạng rồi bấm gửi lại; hệ thống tránh tạo trùng cho cùng lượt gửi."); }
    finally { setBusy(false); }
  };
  const fieldError = (name) => errors[name] ? <span className={styles.fieldError} id={`referral-${name}-error`}>{errors[name]}</span> : null;
  const props = (name) => ({ name, value: input[name], onChange: change, "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `referral-${name}-error` : undefined });
  return <details className={styles.leadForm} open>
    <summary><span><Plus size={18} aria-hidden="true" />Giới thiệu khách mới</span><ChevronDown size={18} className={styles.disclosure} aria-hidden="true" /></summary>
    <form onSubmit={submit}>
      <p className={styles.formNote}>Chỉ chia sẻ thông tin liên hệ bạn được phép cung cấp. Hồ sơ trùng hoặc khách đã có sẽ được Hoàng Long xem xét trước khi ghi nhận giới thiệu.</p>
      <fieldset className={styles.fields} disabled={busy}>
        <label className={styles.wide}>Tên công ty / quán<input {...props("business_name")} required maxLength={160} autoComplete="off" />{fieldError("business_name")}</label>
        <label>Người liên hệ<input {...props("contact_name")} required maxLength={100} autoComplete="off" />{fieldError("contact_name")}</label>
        <label>Số điện thoại hoặc email<input {...props("contact")} required maxLength={160} autoComplete="off" /><span className={styles.hint}>Thông tin người liên hệ đã cho phép chia sẻ.</span>{fieldError("contact")}</label>
        <label className={styles.wide}>Địa điểm<input {...props("location")} required maxLength={240} placeholder="Quận/huyện, tỉnh/thành hoặc địa chỉ quán" />{fieldError("location")}</label>
        <label className={styles.wide}>Trà / nhu cầu quan tâm<input {...props("product_interest")} required maxLength={500} placeholder="Ví dụ: hồng trà cho trà sữa, ô long cho trà trái cây" />{fieldError("product_interest")}</label>
        <label>Sản lượng dự kiến mỗi tháng (kg)<input {...props("expected_volume_kg")} type="number" inputMode="decimal" min="0" max="10000000" step="0.01" placeholder="Chưa rõ thì để trống" />{fieldError("expected_volume_kg")}</label>
        <label className={styles.wide}>Ghi chú <span className={styles.optional}>(không bắt buộc)</span><textarea {...props("notes")} maxLength={1500} rows={3} placeholder="Nhu cầu, thời điểm dự kiến hoặc thông tin giúp Hoàng Long trao đổi đúng hướng." />{fieldError("notes")}</label>
        <label className={`${styles.consent} ${styles.wide}`}><input name="contact_authorized" type="checkbox" checked={input.contact_authorized} onChange={change} required aria-invalid={Boolean(errors.contact_authorized)} /><span>Tôi được phép chia sẻ thông tin này để Hoàng Long liên hệ về nhu cầu mua trà.</span></label>
      </fieldset>
      {fieldError("contact_authorized")}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status"><Check size={18} aria-hidden="true" />{success}</p>}
      <button className={`${styles.button} ${styles.primary}`} disabled={busy} type="submit">{busy ? <Loader2 className={styles.spinner} size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}{busy ? "Đang gửi…" : "Gửi khách giới thiệu"}</button>
    </form>
  </details>;
}

export default function PartnerNetworkPortal() {
  const supabase = useMemo(() => createClient(), []);
  const identity = useRef("");
  const authVersion = useRef(0);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [tab, setTab] = useState("referrals");
  const [search, setSearch] = useState("");
  const verified = Boolean(user?.email && user.email_confirmed_at);

  useEffect(() => {
    let active = true;
    if (new URLSearchParams(window.location.search).get("auth_error") === "1") setError("Liên kết đăng nhập đã hết hạn hoặc được mở ở trình duyệt khác. Gửi liên kết mới và mở trên thiết bị này.");
    const sync = async () => {
      const version = ++authVersion.current;
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (!active || version !== authVersion.current) return;
        const nextUser = data.user || null;
        if (identity.current !== (nextUser?.id || "")) setSnapshot(null);
        identity.current = nextUser?.id || "";
        setUser(nextUser);
        if (authError && data.user) setError(partnerErrorMessage(authError));
      } catch { if (active && version === authVersion.current) setError("Chưa kiểm tra được đăng nhập. Kiểm tra mạng rồi tải lại trang."); }
      finally { if (active && version === authVersion.current) setAuthLoading(false); }
    };
    sync();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if ((session?.user?.id || "") !== identity.current) {
        authVersion.current += 1;
        identity.current = "";
        setSnapshot(null); setUser(null); setAuthLoading(true); setSearch("");
      }
      setTimeout(sync, 0);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [supabase]);

  const load = useCallback(async () => {
    if (!verified) { setSnapshot(null); return; }
    const requestedFor = user?.id;
    setLoading(true);
    setError("");
    try {
      const { data, error: loadError } = await supabase.rpc("partner_network_snapshot");
      if (identity.current !== requestedFor) return;
      if (loadError) { setError(partnerErrorMessage(loadError)); return; }
      if (!data || typeof data !== "object" || Array.isArray(data)) { setError("Chưa tải được bàn đối tác. Hãy thử lại."); return; }
      setSnapshot(data);
    } catch { if (identity.current === requestedFor) setError("Chưa tải được dữ liệu. Kiểm tra mạng rồi thử lại."); }
    finally { setLoading(false); }
  }, [supabase, verified, user?.id]);
  useEffect(() => { load(); }, [load, user?.id]);

  const login = async (event) => {
    event.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/partners/auth/callback?next=/partners/network` } });
      if (authError) setError(partnerErrorMessage(authError));
      else setCheckEmail(true);
    } catch { setError("Chưa gửi được liên kết. Kiểm tra mạng rồi thử lại."); }
    finally { setAuthBusy(false); }
  };
  const logout = async () => {
    setError("");
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) { setError(partnerErrorMessage(logoutError)); return; }
    clearPartnerApplicationDraft();
    identity.current = "";
    setSnapshot(null);
    setUser(null);
    setTab("referrals");
    setSearch("");
  };
  const partner = snapshot?.partner;
  const firstRate = partner?.first_order_rate_percent ?? partner?.default_rate_percent;
  const referrals = Array.isArray(snapshot?.referrals) ? snapshot.referrals.map(row => ({
    ...row, review_status: row.status, display_stage: row.status === "rejected" ? "rejected" : row.status === "pending" ? "pending" : row.pipeline_stage,
  })) : [];
  const commissions = Array.isArray(snapshot?.commissions) ? snapshot.commissions.map(row => ({
    ...row, business_name: referrals.find(referral => referral.id === row.referral_id)?.business_name,
    order_reference: row.order_id, base: row.eligible_base, rate: row.rate_percent, current_eligible: row.eligible_amount,
  })) : [];
  const visibleReferrals = referrals.filter((referral) => `${referral.business_name || ""} ${referral.location || ""}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  const totals = commissions.reduce((sum, row) => ({ eligible: sum.eligible + (row.status === "void" ? 0 : numeric(row.current_eligible)), approved: sum.approved + numeric(row.approved_amount), paid: sum.paid + numeric(row.paid_amount) }), { eligible: 0, approved: 0, paid: 0 });

  return <main className={styles.page} data-no-translate lang="vi">
    <header className={styles.header}><Link className={styles.brand} href="/partners"><span className={styles.seal} aria-hidden="true">皇龍</span><span>Hoàng Long · Đối tác B2B</span></Link>{user ? <button type="button" className={styles.iconButton} onClick={logout}><LogOut size={17} aria-hidden="true" /><span>Đăng xuất</span></button> : <Link href="/partners" className={styles.backLink}><ArrowLeft size={17} aria-hidden="true" />Chương trình</Link>}</header>
    <div className={styles.content}>
      <div className={styles.titleRow}><div><p className={styles.eyebrow}>Mạng lưới giới thiệu khách hàng</p><h1>Bàn đối tác.</h1><p className={styles.subtitle}>{partner?.business_name || "Theo dõi hồ sơ, khách giới thiệu và hoa hồng tại một nơi."}</p></div>{verified && <button type="button" className={styles.button} onClick={load} disabled={loading}><RefreshCw size={17} className={loading ? styles.spinner : undefined} aria-hidden="true" />{loading ? "Đang tải…" : "Cập nhật"}</button>}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {authLoading ? <div className={styles.loading} role="status"><Loader2 className={styles.spinner} size={22} aria-hidden="true" />Đang kiểm tra đăng nhập…</div> : !verified ? <section className={styles.loginPanel} aria-labelledby="partner-login-title"><div><h2 id="partner-login-title">Đăng nhập bằng email.</h2><p>Dùng email bạn đã đăng ký hợp tác. Không cần mật khẩu. Nếu chưa có hồ sơ, bạn có thể đăng ký sau khi xác minh email.</p><p>Đăng nhập không tự phê duyệt hồ sơ hoặc cấp quyền gửi khách mới.</p></div><form onSubmit={login}><label>Email<input name="email" type="email" required autoComplete="email" maxLength={254} value={email} onChange={(event) => { setEmail(event.target.value); setCheckEmail(false); }} /></label>{checkEmail && <p className={styles.emailNotice} role="status"><Mail size={20} aria-hidden="true" /><span>Đã gửi liên kết đăng nhập. Mở email trên thiết bị này để tiếp tục; kiểm tra thư rác nếu chưa thấy.</span></p>}<button className={`${styles.button} ${styles.primary}`} type="submit" disabled={authBusy}>{authBusy ? <Loader2 className={styles.spinner} size={18} aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}{authBusy ? "Đang gửi…" : checkEmail ? "Gửi lại liên kết đăng nhập" : "Gửi liên kết đăng nhập"}</button></form></section> : loading && !snapshot ? <div className={styles.loading} role="status"><Loader2 className={styles.spinner} size={22} aria-hidden="true" />Đang tải hồ sơ của bạn…</div> : !snapshot ? <section className={styles.empty}><h2>Chưa tải được hồ sơ</h2><p>Bấm cập nhật để thử lại. Nếu phần đối tác chưa được thiết lập, hãy liên hệ Hoàng Long.</p><Link href="/company#contact" className={styles.textLink}>Liên hệ Hoàng Long<ArrowRight size={17} aria-hidden="true" /></Link></section> : !partner ? <section className={styles.applicationPanel}><div><h2>Hoàn tất hồ sơ đăng ký.</h2><p>Email đã được xác minh. Gửi thông tin dưới đây để Hoàng Long xem xét hợp tác; bạn chỉ được gửi khách mới sau khi hồ sơ được duyệt.</p></div><PartnerNetworkApplicationForm key={user.id} user={user} onApplied={load} /></section> : <>
        <section className={styles.partnerSummary} aria-label="Hồ sơ đối tác"><div><span className={`${styles.chip} ${partner.status === "approved" ? styles.good : styles.notice}`}>{PARTNER_STATUS[partner.status] || "Đang xử lý"}</span><p className={styles.partnerCode}>{partner.code ? <>Mã đối tác <strong>{partner.code}</strong></> : "Mã đối tác được cấp sau khi phê duyệt."}</p></div><dl><div><dt>Khu vực</dt><dd>{partner.region || "—"}</dd></div><div><dt>Loại đối tác</dt><dd>{PARTNER_TYPES.find((type) => type.id === partner.partner_type)?.label || "—"}</dd></div><div><dt>Tỷ lệ đơn đầu</dt><dd>{firstRate === null || firstRate === undefined ? "Thỏa thuận khi duyệt" : `${numeric(firstRate).toLocaleString("vi-VN")}%`}</dd></div>{partner.repeat_rate_percent !== null && partner.repeat_rate_percent !== undefined && <div><dt>Tỷ lệ mua lại</dt><dd>{numeric(partner.repeat_rate_percent).toLocaleString("vi-VN")}%</dd></div>}{partner.repeat_order_limit !== null && partner.repeat_order_limit !== undefined && <div><dt>Giới hạn đơn mua lại</dt><dd>{numeric(partner.repeat_order_limit).toLocaleString("vi-VN")} đơn</dd></div>}</dl>{partner.terms && <details className={styles.referralNotes}><summary>Điều kiện hợp tác đã ghi nhận</summary><p>{partner.terms}</p></details>}</section>
        {partner.status !== "approved" && <div className={styles.statusNotice} role="status"><h2>{partner.status === "pending" ? "Hồ sơ đang chờ Hoàng Long xem xét." : partner.status === "disabled" ? "Quyền gửi khách mới đang tạm ngưng." : "Hồ sơ chưa được phê duyệt."}</h2><p>{partner.status === "pending" ? "Chưa cần gửi thông tin khách. Khi được phê duyệt, bạn sẽ thấy mã đối tác và chức năng giới thiệu khách tại đây." : "Bạn vẫn có thể xem thông tin đã được ghi nhận. Liên hệ Hoàng Long để trao đổi bước tiếp theo."}</p><Link href="/company#contact" className={styles.textLink}>Liên hệ Hoàng Long<ArrowRight size={17} aria-hidden="true" /></Link></div>}
        <dl className={styles.metrics}><div><dt>Khách đã giới thiệu</dt><dd>{referrals.length}</dd></div><div><dt>Hoa hồng tạm tính</dt><dd>{formatPartnerMoney(totals.eligible)}</dd></div><div><dt>Đã được duyệt</dt><dd>{formatPartnerMoney(totals.approved)}</dd></div><div><dt>Đã ghi nhận chi trả</dt><dd>{formatPartnerMoney(totals.paid)}</dd></div></dl>
        <p className={styles.moneyNote}>Hoa hồng tạm tính có thể thay đổi theo tiền thực thu, VAT, vận chuyển, hoàn tiền và đơn hủy. Số đã duyệt và đã chi trả được Hoàng Long ghi nhận sau đối soát.</p>
        <div className={styles.tabs} aria-label="Nội dung bàn đối tác"><button type="button" className={tab === "referrals" ? styles.activeTab : undefined} aria-pressed={tab === "referrals"} onClick={() => setTab("referrals")}>Khách giới thiệu <span>{referrals.length}</span></button><button type="button" className={tab === "commissions" ? styles.activeTab : undefined} aria-pressed={tab === "commissions"} onClick={() => setTab("commissions")}>Hoa hồng <span>{commissions.length}</span></button></div>
        {tab === "referrals" ? <section aria-labelledby="own-referrals-title"><div className={styles.sectionTitle}><h2 id="own-referrals-title">Khách bạn đã giới thiệu</h2>{referrals.length > 0 && <label className={styles.search}><span>Tìm khách / khu vực</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên quán hoặc địa điểm" /></label>}</div>{visibleReferrals.length ? <div className={styles.referrals}>{visibleReferrals.map((referral) => <details className={styles.referral} key={referral.id}><summary><div><h3>{referral.business_name}</h3><p>{referral.location || "Chưa có địa điểm"} · Gửi {dateLabel(referral.submitted_at || referral.created_at)}</p></div><div className={styles.referralStatus}><span className={`${styles.chip} ${referral.review_status === "accepted" ? styles.good : styles.notice}`}>{REFERRAL_STATUS[referral.review_status] || "Chờ kiểm tra"}</span><span className={styles.stageLabel}>{partnerStageLabel(referral.display_stage)}</span><ChevronDown size={18} className={styles.disclosure} aria-hidden="true" /></div></summary><dl className={styles.referralDetails}><div><dt>Người liên hệ</dt><dd>{referral.contact_name || "—"}</dd></div><div><dt>Điện thoại / email</dt><dd>{referral.contact || "—"}</dd></div><div><dt>Đơn từng thanh toán đủ</dt><dd>{numeric(referral.paid_order_count).toLocaleString("vi-VN")} đơn</dd></div><div><dt>Nhu cầu trà</dt><dd>{referral.product_interest || "—"}</dd></div><div><dt>Sản lượng dự kiến / tháng</dt><dd>{referral.expected_volume_kg === null || referral.expected_volume_kg === undefined ? "Chưa rõ" : `${numeric(referral.expected_volume_kg).toLocaleString("vi-VN")} kg`}</dd></div></dl>{referral.notes && <p className={styles.referralNotes}>{referral.notes}</p>}</details>)}</div> : <div className={styles.empty}><h3>{search ? "Không tìm thấy khách phù hợp." : "Chưa có khách giới thiệu."}</h3><p>{search ? "Thử tên quán hoặc địa điểm khác." : partner.status === "approved" ? "Gửi nhu cầu khách qua biểu mẫu bên dưới. Mỗi hồ sơ sẽ được kiểm tra trước khi tiếp nhận." : "Bạn có thể gửi khách mới sau khi hồ sơ đối tác được duyệt."}</p></div>}{partner.status === "approved" && <PartnerLeadForm onSubmitted={load} />}</section> : <section aria-labelledby="own-commissions-title"><div className={styles.sectionTitle}><h2 id="own-commissions-title">Đối soát hoa hồng</h2></div>{commissions.length ? <div className={styles.commissions}>{commissions.map((row) => <article className={styles.commission} key={row.id}><div className={styles.commissionHead}><div><h3>{row.business_name || row.referral_business_name || "Khách giới thiệu"}</h3><p>{row.order_reference || "Đơn hàng đã được liên kết"}</p></div><span className={`${styles.chip} ${row.status === "approved" || row.status === "paid" ? styles.good : styles.notice}`}>{COMMISSION_STATUS[row.status] || "Chờ đối soát"}</span></div><dl><div><dt>Doanh thu thực thu đủ điều kiện</dt><dd>{formatPartnerMoney(row.base)}</dd></div><div><dt>Tỷ lệ áp dụng</dt><dd>{row.rate === null || row.rate === undefined ? "Chưa thỏa thuận" : `${numeric(row.rate).toLocaleString("vi-VN")}%`}</dd></div><div><dt>Hoa hồng tạm tính</dt><dd>{formatPartnerMoney(row.current_eligible)}</dd></div><div><dt>Đã duyệt</dt><dd>{formatPartnerMoney(row.approved_amount)}</dd></div><div><dt>Đã ghi nhận chi trả</dt><dd>{formatPartnerMoney(row.paid_amount)}</dd></div></dl>{row.stale && <p className={styles.moneyNote} role="status">Đơn có thay đổi; Hoàng Long cần đối soát lại. Lịch sử đã chi trả vẫn được giữ nguyên.</p>}{row.paid_at && <p className={styles.commissionDate}>Ghi nhận chi trả: {dateLabel(row.paid_at)}</p>}</article>)}</div> : <div className={styles.empty}><h3>Chưa có khoản hoa hồng được ghi nhận.</h3><p>Hoa hồng xuất hiện khi đơn đã được liên kết với khách bạn giới thiệu và Hoàng Long đã đối soát doanh thu thực thu.</p></div>}</section>}
      </>}
      <footer className={styles.footer}><Link href="/partners">Chương trình đối tác</Link><Link href="/catalog">Catalog trà</Link><Link href="/company#contact">Liên hệ Hoàng Long</Link><Link href="/privacy">Bảo mật thông tin</Link></footer>
    </div>
  </main>;
}

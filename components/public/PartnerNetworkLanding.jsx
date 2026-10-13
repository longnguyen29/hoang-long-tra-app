"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PARTNER_TYPES, normalizePartnerApplication, partnerErrorMessage, partnerRegistrationAllowed } from "@/lib/partner-network";
import { clearPartnerDraft, readPartnerDraft, savePartnerDraft } from "@/lib/partner-network-draft";
import styles from "./PartnerNetworkLanding.module.css";

const EMPTY_APPLICATION = { business_name: "", contact_name: "", phone: "", region: "", partner_type: "consultant", notes: "", consent: false };

export function clearPartnerApplicationDraft() {
  try { clearPartnerDraft(localStorage); } catch { /* A successful application remains saved on the server. */ }
}

export function PartnerNetworkApplicationForm({ user, onApplied, allowRegistration = false, publicRegistration = false }) {
  const supabase = useMemo(() => createClient(), []);
  const [input, setInput] = useState(EMPTY_APPLICATION);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);
  const verified = Boolean(user?.email && user?.email_confirmed_at);

  useEffect(() => {
    try {
      const saved = readPartnerDraft(localStorage, user?.email_confirmed_at ? user.email : null);
      if (saved) setInput({ ...EMPTY_APPLICATION, ...saved });
    } catch { /* A storage-restricted browser can still submit a verified application. */ }
  }, [user?.email, user?.email_confirmed_at]);

  const change = (event) => {
    const { name, value, checked, type } = event.target;
    setInput((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSuccess("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy || !allowRegistration) return;
    setError("");
    setSuccess("");
    const result = normalizePartnerApplication(input);
    setErrors(result.errors || {});
    if (!result.data || Object.keys(result.errors || {}).length) {
      setError("Kiểm tra các thông tin được đánh dấu trước khi tiếp tục.");
      return;
    }
    setBusy(true);
    try {
      if (!verified) {
        if (!publicRegistration) { setError("Đăng nhập bằng tài khoản quản lý đã xác minh để thử hồ sơ nội bộ. Chương trình chưa mở đăng ký mới."); return; }
        try { savePartnerDraft(localStorage, result.data, email); } catch {
          setError("Trình duyệt không lưu được bản nháp. Hãy cho phép lưu dữ liệu trang rồi thử lại.");
          return;
        }
        const { error: authError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: publicRegistration, emailRedirectTo: `${window.location.origin}/partners/auth/callback?next=/partners/network` },
        });
        if (authError) { setError(partnerErrorMessage(authError)); return; }
        setCheckEmail(true);
        return;
      }
      const { error: applyError } = await supabase.rpc("partner_network_apply", { p_input: result.data });
      if (applyError) { setError(partnerErrorMessage(applyError)); return; }
      clearPartnerApplicationDraft();
      setSuccess("Đã gửi hồ sơ. Hoàng Long sẽ xem xét trước khi cấp quyền giới thiệu khách hàng.");
      if (onApplied) await onApplied();
    } catch { setError("Chưa kết nối được. Kiểm tra mạng rồi thử lại; hồ sơ chưa được xác nhận gửi."); }
    finally { setBusy(false); }
  };

  const fieldError = (name) => errors[name] ? <span className={styles.fieldError} id={`partner-${name}-error`}>{errors[name]}</span> : null;
  const fieldProps = (name) => ({ name, value: input[name], onChange: change, "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `partner-${name}-error` : undefined });

  if (!allowRegistration) return <div className={styles.applicationExists}><h3>Chưa mở đăng ký đối tác mới.</h3><p>Hồ sơ đã có vẫn được theo dõi tại bàn đối tác. Liên hệ Hoàng Long để trao đổi về chương trình thử nghiệm.</p><Link href="/partners/network" className={`${styles.button} ${styles.primary}`}>Mở bàn đối tác<ArrowRight size={18} aria-hidden="true" /></Link></div>;

  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.formIntro}>
      <h3>Thông tin đăng ký</h3>
      <p>{verified ? <>Đăng ký bằng email đã xác minh: <strong>{user.email}</strong>.</> : "Xác minh email trước, sau đó gửi hồ sơ để Hoàng Long xét duyệt."}</p>
    </div>
    <div className={styles.fields}>
      <label className={styles.wide}>Tên doanh nghiệp / tên hoạt động<input {...fieldProps("business_name")} required maxLength={160} autoComplete="organization" />{fieldError("business_name")}</label>
      <label>Người liên hệ<input {...fieldProps("contact_name")} required maxLength={100} autoComplete="name" />{fieldError("contact_name")}</label>
      <label>Điện thoại<input {...fieldProps("phone")} required maxLength={40} type="tel" autoComplete="tel" />{fieldError("phone")}</label>
      {!verified && <label className={styles.wide}>Email đăng nhập<input name="email" value={email} onChange={(event) => { setEmail(event.target.value); setCheckEmail(false); }} required type="email" maxLength={254} autoComplete="email" /><span className={styles.hint}>Dùng email bạn sẽ mở trên thiết bị này để tiếp tục hồ sơ.</span></label>}
      <label>Khu vực hoạt động<input {...fieldProps("region")} required maxLength={160} placeholder="Ví dụ: Hà Nội, miền Bắc" />{fieldError("region")}</label>
      <label>Hình thức hợp tác<select {...fieldProps("partner_type")}>{PARTNER_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select>{fieldError("partner_type")}</label>
      <label className={styles.wide}>Giới thiệu ngắn <span className={styles.optional}>(không bắt buộc)</span><textarea {...fieldProps("notes")} rows={4} maxLength={1500} placeholder="Nhóm khách hàng bạn đang phục vụ và cách bạn muốn hợp tác." />{fieldError("notes")}</label>
    </div>
    <label className={styles.consent}><input name="consent" type="checkbox" checked={input.consent} onChange={change} required aria-invalid={Boolean(errors.consent)} /><span>Tôi đồng ý để Hoàng Long lưu và sử dụng thông tin này nhằm xem xét hồ sơ, liên hệ về hợp tác theo <Link href="/privacy">Chính sách bảo mật</Link>. Việc gửi hồ sơ không đồng nghĩa với được phê duyệt.</span></label>
    {fieldError("consent")}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {success && <p className={styles.success} role="status"><Check size={18} aria-hidden="true" />{success}</p>}
    {checkEmail && <div className={styles.emailNotice} role="status"><Mail size={22} aria-hidden="true" /><div><strong>Kiểm tra email của bạn</strong><p>Mở liên kết đăng nhập, rồi bấm “Gửi hồ sơ đăng ký” tại bàn đối tác. Bản nháp được lưu trên thiết bị này tối đa 24 giờ, gắn với email vừa xác minh và được xoá sau khi gửi thành công hoặc đăng xuất.</p><p>Nếu chưa thấy email, kiểm tra thư rác. Bạn có thể đổi email và gửi lại.</p></div></div>}
    <button className={`${styles.button} ${styles.primary}`} type="submit" disabled={busy}>{busy ? <Loader2 className={styles.spinner} size={18} aria-hidden="true" /> : verified ? <ArrowRight size={18} aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}{busy ? "Đang xử lý…" : verified ? "Gửi hồ sơ đăng ký" : checkEmail ? "Gửi lại liên kết xác minh" : "Xác minh email để đăng ký"}</button>
  </form>;
}

export default function PartnerNetworkLanding({ allowRegistration = false, publicRegistration = false, registrationUserId = null }) {
  const supabase = useMemo(() => createClient(), []);
  const identity = useRef("");
  const authVersion = useRef(0);
  const [user, setUser] = useState(null);
  const [existingPartner, setExistingPartner] = useState(false);
  const [applied, setApplied] = useState(false);
  const registrationAllowed = partnerRegistrationAllowed(allowRegistration, registrationUserId, user);
  useEffect(() => {
    let active = true;
    const sync = async () => {
      const version = ++authVersion.current;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!active || version !== authVersion.current) return;
        const nextUser = error ? null : data.user || null;
        const nextIdentity = nextUser?.id || "";
        if (identity.current !== nextIdentity) {
          if (identity.current) clearPartnerApplicationDraft();
          setApplied(false);
        }
        identity.current = nextIdentity;
        setUser(nextUser);
        setExistingPartner(false);
        if (nextUser?.email_confirmed_at) {
          const { data: snapshot, error: snapshotError } = await supabase.rpc("partner_network_snapshot");
          if (active && version === authVersion.current && identity.current === nextIdentity) setExistingPartner(!snapshotError && Boolean(snapshot?.partner));
        }
      } catch {
        if (active && version === authVersion.current) {
          identity.current = "";
          setUser(null); setExistingPartner(false); setApplied(false);
        }
      }
    };
    sync();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextIdentity = session?.user?.id || "";
      if (nextIdentity !== identity.current) {
        authVersion.current += 1;
        if (identity.current) clearPartnerApplicationDraft();
        identity.current = nextIdentity;
        setUser(null); setExistingPartner(false); setApplied(false);
      }
      setTimeout(sync, 0);
    });
    return () => { active = false; authVersion.current += 1; data.subscription.unsubscribe(); };
  }, [supabase]);

  return <main className={styles.page} data-no-translate lang="vi">
    <header className={styles.header}>
      <Link className={styles.wordmark} href="/"><span className={styles.seal} aria-hidden="true">皇龍</span><span>House of Hoàng Long</span></Link>
      <Link className={styles.portalLink} href="/partners/network">Bàn đối tác<ArrowRight size={17} aria-hidden="true" /></Link>
    </header>
    <section className={styles.hero} aria-labelledby="partner-network-title">
      <div><p className={styles.eyebrow}>Mạng lưới đối tác B2B</p><h1 id="partner-network-title">Kết nối khách hàng với nguồn trà Hoàng Long.</h1><p className={styles.intro}>Bạn hiểu nhu cầu của quán và doanh nghiệp. Hoàng Long tiếp nhận nhu cầu, hỗ trợ chọn trà, thử mẫu, báo giá và thực hiện đơn hàng.</p><a href="#register" className={`${styles.button} ${styles.primary}`}>Đăng ký hợp tác<ArrowRight size={18} aria-hidden="true" /></a></div>
      <aside className={styles.referralNote} aria-label="Nguyên tắc ghi nhận giới thiệu"><p className={styles.eyebrow}>Một giới thiệu, một hồ sơ rõ ràng</p><h2>Từ nhu cầu thật đến đơn hàng được thanh toán.</h2><p>Mỗi khách giới thiệu được kiểm tra trước khi đưa vào quy trình bán hàng. Bạn theo dõi trạng thái và hoa hồng được ghi nhận tại bàn đối tác.</p><div className={styles.rateNote}><ShieldCheck size={22} aria-hidden="true" /><p>Tỷ lệ hoa hồng, phạm vi sản phẩm và giới hạn đơn mua lại được thỏa thuận sau khi hồ sơ được phê duyệt. Không có một mức áp dụng cho tất cả đối tác.</p></div></aside>
    </section>
    <section className={styles.section} aria-labelledby="who-title"><div className={styles.sectionHead}><h2 id="who-title">Dành cho người kết nối ngành đồ uống.</h2><p>Chúng tôi tìm đối tác có quan hệ kinh doanh thực tế và hiểu nhóm khách hàng mình giới thiệu.</p></div><ul className={styles.partnerTypes}>{PARTNER_TYPES.map((type) => <li key={type.id}>{type.label}</li>)}</ul></section>
    <section className={styles.section} aria-labelledby="process-title"><div className={styles.sectionHead}><h2 id="process-title">Hợp tác như thế nào?</h2><p>Đăng ký và xét duyệt là hai bước riêng. Chỉ đối tác đã được duyệt mới có thể đăng ký khách giới thiệu.</p></div><ol className={styles.steps}><li><span aria-hidden="true">01</span><div><h3>Thống nhất hợp tác</h3><p>Gửi hồ sơ, trao đổi với Hoàng Long và thống nhất phạm vi, tỷ lệ cùng điều kiện hoa hồng. Sau khi được duyệt, bạn nhận mã đối tác riêng.</p></div></li><li><span aria-hidden="true">02</span><div><h3>Đăng ký khách có nhu cầu</h3><p>Gửi thông tin doanh nghiệp và người liên hệ đã cho phép chia sẻ. Hoàng Long kiểm tra khách trùng hoặc khách đã có, rồi xác nhận xử lý hồ sơ.</p></div></li><li><span aria-hidden="true">03</span><div><h3>Theo dõi và đối soát</h3><p>Khách đi qua quy trình chọn trà, mẫu, báo giá và đơn hàng hiện có. Hoa hồng tính trên doanh thu thực thu đủ điều kiện, được xét duyệt và ghi nhận thanh toán.</p></div></li></ol><p className={styles.finePrint}>Doanh thu tính hoa hồng không gồm VAT, phí vận chuyển, khoản hoàn tiền và đơn hủy. Quyền hưởng trên đơn đầu hoặc số đơn mua lại có giới hạn phải được thỏa thuận; không mặc định hoa hồng lâu dài. Hoàng Long đối soát trước khi duyệt, không cam kết thu nhập và hệ thống không tự chi trả.</p><p className={styles.finePrint}>Nhà phân phối mua để bán lại áp dụng điều kiện giá sỉ riêng, không tự cộng thêm hoa hồng giới thiệu.</p></section>
    <section className={styles.registration} id="register" aria-labelledby="register-title"><div className={styles.registrationHead}><p className={styles.eyebrow}>Bắt đầu hợp tác</p><h2 id="register-title">Gửi hồ sơ đối tác.</h2><p>Cho chúng tôi biết bạn đang hoạt động ở đâu và phục vụ nhóm khách nào. Không cần thông tin ngân hàng ở bước này.</p><div className={styles.resourceLinks}><Link href="/catalog">Xem catalog trà<ArrowRight size={16} aria-hidden="true" /></Link><Link href="/company">Hồ sơ Hoàng Long<ArrowRight size={16} aria-hidden="true" /></Link></div></div><div>{existingPartner || applied ? <div className={styles.applicationExists}><Check size={24} aria-hidden="true" /><h3>{applied ? "Đã nhận hồ sơ đăng ký" : "Bạn đã có hồ sơ đối tác"}</h3><p>Xem trạng thái xét duyệt và tiếp tục làm việc tại bàn đối tác.</p><Link href="/partners/network" className={`${styles.button} ${styles.primary}`}>Mở bàn đối tác<ArrowRight size={18} aria-hidden="true" /></Link></div> : <PartnerNetworkApplicationForm key={user?.id || "unverified"} user={user} allowRegistration={registrationAllowed} publicRegistration={publicRegistration} onApplied={() => { if (identity.current === user?.id) setApplied(true); }} />}</div></section>
    <footer className={styles.footer}><p>House of Hoàng Long · Trà cho kinh doanh đồ uống</p><nav aria-label="Liên kết cuối trang"><Link href="/partners/account">Đặt hàng dành cho khách sỉ</Link><Link href="/company">Hồ sơ công ty</Link><Link href="/catalog">Catalog B2B</Link><Link href="/privacy">Bảo mật thông tin</Link></nav></footer>
  </main>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, Check, Clock, Globe2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyHouse } from "@/lib/notify";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./TeaSessions.module.css";

const COPY = {
  vi: {
    switcher: "EN", back: "Nhà Hoàng Long", eyebrow: "Bàn trà tại Nhà", title: "Chậm lại đủ lâu để thật sự nếm được trà.",
    intro: "Một buổi trà riêng tại Hà Nội để tìm hiểu nguồn gốc, cách chế biến và cách pha của những lá trà đang có trong Nhà.",
    book: "Chọn ngày", place: "Hà Nội · xác nhận địa chỉ sau khi đặt", duration: "Khoảng 60–90 phút", price: "Hiện tại không thu phí",
    flowTitle: "Buổi trà diễn ra thế nào", flow: [["01","Nhận biết lá trà","Nhìn, ngửi và hiểu mẻ trà trước khi nước chạm vào lá."],["02","Pha có chủ đích","Thay đổi nhiệt độ, tỷ lệ và thời gian để thấy cấu trúc của cùng một loại trà."],["03","Mang về cách pha phù hợp","Ghi lại cách pha phù hợp với bàn trà, quầy bar hoặc công việc của bạn."]],
    formEyebrow: "Đặt một buổi trà", formTitle: "Chọn một khoảng thời gian để bắt đầu.", date: "Ngày", time: "Giờ", name: "Tên của bạn", contact: "Số điện thoại hoặc email", note: "Bạn muốn tìm hiểu điều gì? (không bắt buộc)",
    consent: "Tôi đồng ý để Nhà Hoàng Long dùng thông tin này để sắp xếp buổi trà.", submit: "Gửi yêu cầu đặt lịch", sending: "Đang đặt…", taken: "Ngày này đã có lịch. Vui lòng chọn ngày khác.", failed: "Chưa đặt được lịch. Vui lòng thử lại.", required: "Vui lòng điền ngày, giờ, tên, liên hệ và xác nhận đồng ý.",
    success: "Lịch của bạn đã vào sổ.", successBody: "Nhà sẽ liên hệ để xác nhận địa chỉ và chi tiết buổi trà.", another: "Đặt một buổi khác", footer: "Một bàn trà. Một mẻ lá. Đủ thời gian.",
  },
  en: {
    switcher: "VI", back: "House of Hoàng Long", eyebrow: "Tea at the house", title: "Slow down long enough to actually taste the tea.",
    intro: "A private tea session in Hà Nội, moving through origin, processing and the brewing logic of the leaves currently in the house.",
    book: "Choose a date", place: "Hà Nội · address confirmed after booking", duration: "Around 60–90 minutes", price: "Currently offered without charge",
    flowTitle: "How the session unfolds", flow: [["01","Meet the leaf","See, smell and understand the batch before water reaches it."],["02","Brew with intent","Change temperature, ratio and time to reveal the structure of one tea."],["03","Take something useful home","Record a brew that suits your table, bar or working practice."]],
    formEyebrow: "Book tea", formTitle: "Choose a moment to begin.", date: "Date", time: "Time", name: "Your name", contact: "Phone or email", note: "What would you like to explore? (optional)",
    consent: "I agree that House of Hoàng Long may use these details to arrange the session.", submit: "Request this session", sending: "Booking…", taken: "That date is already reserved. Please choose another.", failed: "The session could not be booked. Please try again.", required: "Please add a date, time, name, contact, and consent.",
    success: "Your session is in the book.", successBody: "The house will contact you to confirm the address and details.", another: "Book another session", footer: "One table. One batch. Enough time.",
  },
};

export default function TeaSessions() {
  const { locale: lang, toggleLocale } = useLocale();
  const [taken, setTaken] = useState(new Set());
  const [form, setForm] = useState({ date: "", time: "", name: "", contact: "", note: "", consent: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState(null);
  const supabase = useMemo(() => createClient(), []);
  const t = COPY[lang];
  const tomorrow = useMemo(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10), []);

  useEffect(() => {
    const to = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    supabase.rpc("list_taken_tea_session_dates", { p_from: tomorrow, p_to: to }).then(({ data }) => {
      if (data) setTaken(new Set(data.map((item) => item.date)));
    });
  }, [supabase, tomorrow]);

  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (!form.date || !form.time || !form.name.trim() || !form.contact.trim() || !form.consent) { setError(t.required); return; }
    if (taken.has(form.date)) { setError(t.taken); return; }
    setLoading(true);
    const { data, error: bookError } = await supabase.rpc("book_tea_session", {
      p_date: form.date, p_time: form.time, p_customer_name: form.name.trim(), p_contact: form.contact.trim(), p_note: form.note.trim(), p_payment_method: "cash",
    });
    setLoading(false);
    if (bookError || !data?.length) {
      if (bookError?.message?.includes("date_taken")) { setTaken((current) => new Set([...current, form.date])); setError(t.taken); }
      else setError(t.failed);
      return;
    }
    notifyHouse("tea_sessions", data[0].id);
    setBooked({ id: data[0].id, date: data[0].date, time: data[0].session_time?.slice(0, 5) || form.time });
  };

  return <main className={styles.page}>
    <header className={styles.header}><Link href="/"><ArrowLeft size={17}/>{t.back}</Link><button onClick={toggleLocale}><Globe2 size={15}/>{t.switcher}</button></header>
    <section className={styles.hero}>
      <div><p>{t.eyebrow}</p><h1>{t.title}</h1><p className={styles.intro}>{t.intro}</p><a href="#booking">{t.book}<ArrowRight size={16}/></a></div>
      <figure><img src="/landing/4.jpg" alt="A prepared tea at House of Hoàng Long"/><figcaption><span><MapPin size={15}/>{t.place}</span><span><Clock size={15}/>{t.duration}</span><span><Calendar size={15}/>{t.price}</span></figcaption></figure>
    </section>
    <section className={styles.flow}><h2>{t.flowTitle}</h2><div>{t.flow.map(([n,title,body])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className={styles.booking} id="booking">
      <div><p>{t.formEyebrow}</p><h2>{t.formTitle}</h2></div>
      {booked ? <div className={styles.success}><span><Check size={20}/></span><h3>{t.success}</h3><p>{booked.date} · {booked.time}</p><code>{booked.id}</code><p>{t.successBody}</p><button onClick={()=>{setBooked(null);setForm({date:"",time:"",name:"",contact:"",note:"",consent:false});}}>{t.another}</button></div> :
      <form onSubmit={submit}>
        <div className={styles.when}><label>{t.date}<input type="date" min={tomorrow} value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})}/></label><label>{t.time}<input type="time" value={form.time} onChange={(e)=>setForm({...form,time:e.target.value})}/></label></div>
        {form.date && taken.has(form.date) && <p className={styles.error}>{t.taken}</p>}
        <label>{t.name}<input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})}/></label>
        <label>{t.contact}<input value={form.contact} onChange={(e)=>setForm({...form,contact:e.target.value})}/></label>
        <label>{t.note}<textarea value={form.note} onChange={(e)=>setForm({...form,note:e.target.value})}/></label>
        <label className={styles.consent}><input type="checkbox" checked={form.consent} onChange={(e)=>setForm({...form,consent:e.target.checked})}/>{t.consent}</label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button disabled={loading || taken.has(form.date) || !form.date || !form.time || !form.name.trim() || !form.contact.trim() || !form.consent}>{loading?t.sending:t.submit}<ArrowRight size={16}/></button>
      </form>}
    </section>
    <footer>{t.footer}</footer>
  </main>;
}

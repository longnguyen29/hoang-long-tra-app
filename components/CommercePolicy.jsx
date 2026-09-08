import Link from "next/link";
import policies from "@/lib/commerce-policies.json";
import styles from "./CommercePolicy.module.css";
export default function CommercePolicy({kind}) {
 const policy = policies[kind];
 return <main lang="vi" className={styles.page}>
  <header><Link href="/">← Nhà Hoàng Long</Link><a href="tel:+84903333841">0903 333 841</a></header>
  <article>
   <p className={styles.date}>Áp dụng từ 08/09/2026 · Cập nhật 08/09/2026</p>
   <h1>{policy.title}</h1><p className={styles.intro}>{policy.intro}</p>
   <nav className={styles.contents} aria-label="Nội dung chính sách">{policy.sections.map(([title],i)=><a key={title} href={`#section-${i+1}`}>{title}</a>)}</nav>
   {policy.sections.map(([title,paragraphs],i)=><section id={`section-${i+1}`} key={title}><h2>{title}</h2>{paragraphs.map(p=><p key={p}>{p}</p>)}</section>)}
  </article>
  <footer><nav aria-label="Chính sách liên quan">{Object.entries(policies).map(([key,p])=><Link href={`/${key}`} aria-current={key===kind?"page":undefined} key={key}>{p.title}</Link>)}<Link href="/privacy">Quyền riêng tư & cookie</Link></nav><p>Cần hỗ trợ? <a href="tel:+84903333841">0903 333 841</a> · <a href="mailto:hotro.trahoanglong@gmail.com">hotro.trahoanglong@gmail.com</a></p></footer>
 </main>;
}

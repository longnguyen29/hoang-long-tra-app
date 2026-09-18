"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Globe2, Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { catalogText, isTradeTea, TRADE_CATALOG_FIELDS, tradeEnquiryHref } from "@/lib/trade-catalog";
import PolicyLinks from "@/components/PolicyLinks";
import styles from "./TradeCatalog.module.css";

export default function TradeCatalog() {
  const { locale, toggleLocale } = useLocale();
  const vi = locale === "vi";
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    let live = true;
    setSearch(window.location.search);
    setStatus("loading");
    supabase.from("catalog_products").select(TRADE_CATALOG_FIELDS).eq("available", true).order("id")
      .then(({ data, error }) => {
        if (!live) return;
        setStatus(error ? "error" : "ready");
        if (!error) setProducts((data || []).filter(isTradeTea));
      }).catch(() => { if (live) setStatus("error"); });
    return () => { live = false; };
  }, [supabase, attempt]);
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/"><ArrowLeft size={17}/>Hoàng Long</Link>
      <nav aria-label={vi ? "Điều hướng" : "Navigation"}><Link href={tradeEnquiryHref(null, "quote", search)}>{vi ? "Trao đổi nhu cầu" : "Discuss your brief"}<ArrowRight size={17}/></Link><button onClick={toggleLocale} aria-label={vi ? "Switch to English" : "Chuyển sang tiếng Việt"}><Globe2 size={17}/>{vi ? "EN" : "VI"}</button></nav>
    </header>
    <section className={styles.intro}>
      <h1>{vi ? "Danh mục trà" : "Our tea catalogue"}</h1>
      <div><p>{vi ? "Chọn dòng trà cho kế hoạch phân phối và xuất khẩu của bạn." : "Find a tea for your distribution and export plans."}</p><p>{vi ? "Bắt đầu bằng mẫu trà, rồi thống nhất chất lượng, quy cách, khối lượng và giá tại xưởng. Các thông số chưa công bố sẽ được xác nhận khi trao đổi." : "Start with a sample, then agree on quality, packing, volume and factory pricing. Unlisted specifications will be confirmed during your enquiry."}</p></div>
    </section>
    <section className={styles.products} aria-label={vi ? "Các dòng trà" : "Tea range"} aria-busy={status === "loading"}>
      {status === "loading" && <p role="status">{vi ? "Đang tải danh mục trà…" : "Loading teas…"}</p>}
      {status === "error" && <div role="alert"><p>{vi ? "Chưa tải được danh mục. Vui lòng thử lại." : "The catalogue could not load. Please try again."}</p><button onClick={() => setAttempt(value => value + 1)}>{vi ? "Thử lại" : "Retry"}</button></div>}
      {status === "ready" && !products.length && <p>{vi ? "Danh mục đang được cập nhật. Bạn vẫn có thể gửi nhu cầu cung ứng." : "The catalogue is being updated. You can still send your supply requirements."}</p>}
      {status === "ready" && products.map(product => <article key={product.id} id={product.id}>
        <div className={styles.photo}>{product.photo_url ? <img src={product.photo_url} alt={catalogText(product.name, locale)} loading="lazy" style={{ objectPosition: product.photo_position || "center" }}/> : <Leaf aria-hidden="true"/>}</div>
        <div className={styles.details}><h2>{catalogText(product.name, locale)}</h2><p>{catalogText(product.notes, locale) || (vi ? "Liên hệ để trao đổi đặc tính và nhận mẫu trà." : "Contact us to discuss characteristics and request a sample.")}</p>
          {product.pack_size && <p className={styles.packing}>{vi ? "Quy cách đang niêm yết" : "Currently listed packing"}: {product.pack_size}</p>}
          <p className={styles.packing}>{vi ? "Quy cách đơn sỉ và giá được xác nhận theo yêu cầu." : "Wholesale packing and pricing are confirmed for your requirements."}</p>
          <div className={styles.actions}><Link href={tradeEnquiryHref(product.id, "sample", search)}>{vi ? "Trao đổi mẫu trà" : "Enquire about samples"}</Link><Link href={tradeEnquiryHref(product.id, "quote", search)}>{vi ? "Yêu cầu báo giá" : "Request a quote"}<ArrowRight size={17}/></Link></div>
        </div>
      </article>)}
    </section>
    <footer className={styles.footer}><Link href="/cho-quan">{vi ? "Trà dành cho quán" : "Tea for cafés"}</Link><Link href="/shop">{vi ? "Mua trà dùng tại nhà" : "Shop tea for home"}</Link><PolicyLinks/></footer>
  </main>;
}

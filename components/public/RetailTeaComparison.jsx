"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { retailTeaComparisons, retailTeaComparisonCopy } from "@/lib/retail-tea-comparison";
import { sellingUnitLabel } from "@/lib/selling-units";
import styles from "./RetailTeaComparison.module.css";

const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const COPY = {
  vi: { familiar: "Lựa chọn bạn đã quen", house: "Trà Hoàng Long đáng khám phá", current: "Bạn đang xem trà này", view: "Khám phá trà", note: "Đây là gợi ý chọn trà để thử. Hương vị phụ thuộc từng sản phẩm và cách pha; Nhà chưa thực hiện phép thử nếm đối chiếu để xác nhận độ tương đồng.", price: "Giá theo quy cách hiện có", hints: "Chọn từ gu trà quen thuộc của bạn" },
  en: { familiar: "Your familiar choice", house: "Explore at Hoàng Long", current: "You are viewing this tea", view: "Explore tea", note: "These are suggestions for exploration. Flavour varies by product and brewing method; the house has not run comparative tastings to confirm similarity.", price: "Current pack price", hints: "Start with a tea you already know" },
};

function SuggestedTea({ entry, current, locale, copy }) {
  const [failedImage, setFailedImage] = useState("");
  const { product, facts, options, href } = entry;
  const option = options.reduce((best, item) => !best || item.price < best.price ? item : best, null);
  const contents = <>
    {product.photoUrl && failedImage !== product.photoUrl
      ? <img className={styles.photo} src={product.photoUrl} alt={facts.name} loading="lazy" style={{ objectPosition: product.photoPosition || "center" }} onError={() => setFailedImage(product.photoUrl)}/>
      : <span className={styles.photoPlaceholder} aria-hidden="true">皇龍</span>}
    <div className={styles.teaCopy}>
      <span className={styles.group}>{facts.groupLabel}</span>
      <h4>{facts.name}</h4>
      {facts.flavors.length > 0 && <p className={styles.flavors}>{facts.flavors.slice(0, 3).join(" · ")}</p>}
      {option && <p className={styles.price} aria-label={copy.price}>{money.format(option.price)}<small> / {sellingUnitLabel(option.unit, locale)}{option.weight ? ` · ${option.weight}` : ""}</small></p>}
      <span className={styles.view}>{current ? copy.current : <>{copy.view}<ArrowRight size={15} aria-hidden="true"/></>}</span>
    </div>
  </>;
  return current ? <div className={styles.tea} data-current="true">{contents}</div> : <Link href={href} className={styles.tea}>{contents}</Link>;
}

export default function RetailTeaComparison({ products = [], locale = "vi", currentProductId }) {
  const language = locale === "en" ? "en" : "vi";
  const t = retailTeaComparisonCopy(language);
  const copy = COPY[language];
  const id = useId();
  const [selectedId, setSelectedId] = useState("");
  const groups = retailTeaComparisons(products, language, { productId: currentProductId });
  const selected = groups.find(group => group.id === selectedId) || groups[0];
  if (!selected) return null;
  const suggestions = [...selected.products].sort((a, b) => Number(b.product.id === currentProductId) - Number(a.product.id === currentProductId)).slice(0, 2);
  return <section className={`${styles.section}${currentProductId ? ` ${styles.detail}` : ""}`} aria-labelledby={`${id}-title`}>
    <details open={Boolean(currentProductId)} className={styles.disclosure}>
      <summary><div><span className={styles.eyebrow}>{copy.hints}</span><h2 id={`${id}-title`}>{t.title}</h2></div><ChevronDown size={23} aria-hidden="true"/></summary>
      <div className={styles.body}>
        <p className={styles.intro}>{t.intro}</p>
        {groups.length > 1 && <div className={styles.choices} role="group" aria-label={t.choose}>{groups.map(group => <button type="button" key={group.id} aria-pressed={selected.id === group.id} aria-controls={`${id}-comparison`} onClick={() => setSelectedId(group.id)}>{group.label}</button>)}</div>}
        <div className={styles.comparison} id={`${id}-comparison`} role="region" aria-label={selected.label}>
          <div className={styles.familiar}>
            <p className={styles.caption}>{copy.familiar}</p><h3>{selected.label}</h3><p>{selected.intro}</p>
            <h4>{t.compare}</h4><ul>{selected.compare.map(item => <li key={item}>{item}</li>)}</ul>
            {selected.sources.length > 0 && <details className={styles.sources}><summary>{t.sources}<ChevronDown size={14} aria-hidden="true"/></summary><ul>{selected.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}<ArrowRight size={13} aria-hidden="true"/></a></li>)}</ul></details>}
          </div>
          <div className={styles.suggestions}><p className={styles.caption}>{copy.house}</p>{suggestions.map(entry => <SuggestedTea key={entry.product.id} entry={entry} current={entry.product.id === currentProductId} locale={language} copy={copy}/>)}</div>
        </div>
        <p className={styles.note}>{copy.note}</p>
      </div>
    </details>
  </section>;
}

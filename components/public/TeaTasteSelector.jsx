"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fromCatalogRow } from "@/lib/mappers";
import { recommendMenuLab } from "@/lib/menu-lab";
import styles from "./TeaTasteSelector.module.css";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const PROFILES = [
  {
    key: "mat",
    label: "Mật",
    summary: "Tròn, ấm, hậu ngọt",
    useCase: "fruit",
    character: "honey",
    productIds: ["hong-tra-shan-mat"],
    title: "Hậu mật để đỡ trái cây chín.",
    body: "Chọn hướng này khi món cần thân trà tròn, hậu ngọt tự nhiên và vẫn còn vị sau đào, mơ hoặc syrup vừa phải.",
    applications: ["Trà đào và trái cây chín", "Cold brew có độ ngọt vừa", "Món lạnh cần hậu vị tròn"],
  },
  {
    key: "khoi",
    label: "Khói",
    summary: "Đậm, rang nhẹ, bám vị",
    useCase: "milk",
    character: "smoky",
    productIds: ["hong-tra-shan-khoi"],
    title: "Vị trà còn lại sau sữa và kem.",
    body: "Nét rang–khói nhẹ giúp nền trà không biến mất khi đi cùng nguyên liệu béo. Đây là hướng nên thử cho món cần độ sâu hơn hương hoa.",
    applications: ["Trà sữa và latte", "Mè đen, cacao, kem muối", "Món béo cần vị trà rõ"],
  },
  {
    key: "moc",
    label: "Mộc",
    summary: "Xanh, rõ lá, ít gắt",
    useCase: "milk",
    character: "light",
    productIds: ["luc-tra-shan-moc"],
    title: "Vị lá rõ cho công thức ít che phủ.",
    body: "Shan Mộc phù hợp khi quán muốn giữ nét trà xanh tự nhiên, hạn chế syrup và để nguyên liệu hạt hoặc sữa nâng vị thay vì lấn át.",
    applications: ["Latte trà xanh", "Hạt dẻ cười và các loại hạt", "Món ít syrup cần vị lá rõ"],
  },
  {
    key: "hoa",
    label: "Hoa",
    summary: "Thơm sáng, sạch, thanh",
    useCase: "sparkling",
    character: "floral",
    productIds: ["luc-tra-ngoc-lan", "luc-tra-lai-tieu-chuan", "luc-tra-hoa-sen"],
    title: "Hương sáng cho món nhẹ và có gas.",
    body: "Nhóm trà ướp hoa giữ phần hương ở phía trước, hợp với citrus, soda hoặc nền sữa nhẹ khi công thức cần thơm rõ nhưng kết thúc sạch.",
    applications: ["Sparkling và citrus", "Trà trái cây sáng", "Nền sữa nhẹ hoặc dừa"],
  },
];

function profileFromLocation() {
  if (typeof window === "undefined") return "mat";
  const key = new URLSearchParams(window.location.search).get("profile");
  return PROFILES.some((item) => item.key === key) ? key : "mat";
}

export default function TeaTasteSelector() {
  const [supabase] = useState(() => createClient());
  const [profileKey, setProfileKey] = useState("mat");
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const tabRefs = useRef([]);

  useEffect(() => {
    setProfileKey(profileFromLocation());
  }, []);

  useEffect(() => {
    let live = true;
    supabase
      .from("catalog_products")
      .select("id,name,notes,photo_url,photo_position,available,kind,line,price,flavors")
      .eq("available", true)
      .eq("kind", "tea")
      .order("id")
      .then(({ data, error }) => {
        if (!live) return;
        if (error) {
          setStatus("error");
          return;
        }
        setProducts((data || []).map(fromCatalogRow));
        setStatus("ready");
      });
    return () => { live = false; };
  }, [supabase]);

  useEffect(() => {
    let session = "";
    const path = window.location.pathname;
    try {
      session = window.localStorage.getItem("hl-visitor-session") || crypto.randomUUID();
      window.localStorage.setItem("hl-visitor-session", session);
      const key = `hl-growth-view:${path}:tea-taste-selector`;
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      session = crypto.randomUUID();
    }
    supabase.rpc("record_growth_page_view", {
      p_path: path,
      p_session: session,
      p_referrer: document.referrer || "",
      p_lang: "vi",
      p_growth_code: "tea-taste-selector",
    }).then(({ error }) => {
      if (error) console.debug("Growth attribution unavailable", error.message);
    });
  }, [supabase]);

  const profile = PROFILES.find((item) => item.key === profileKey) || PROFILES[0];
  const recommendation = useMemo(
    () => recommendMenuLab({ useCase: profile.useCase, character: profile.character, cupMl: 500, trial: "refine" }, products, "vi"),
    [products, profile.character, profile.useCase],
  );
  const matchingProducts = useMemo(
    () => profile.productIds.map((id) => products.find((product) => product.id === id)).filter(Boolean),
    [products, profile.productIds],
  );
  const sampleHref = `/sample/menu-lab?utm_source=website&utm_medium=taste-selector&utm_campaign=tea_taste_selector&utm_content=${profile.key}&use=${profile.useCase}&character=${profile.character}`;

  const chooseProfile = (key, updateAddress = true) => {
    setProfileKey(key);
    if (updateAddress) {
      const url = new URL(window.location.href);
      url.searchParams.set("profile", key);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    }
  };

  const moveTab = (event, index) => {
    const keys = { ArrowRight: 1, ArrowLeft: -1 };
    let next = index;
    if (event.key in keys) next = (index + keys[event.key] + PROFILES.length) % PROFILES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = PROFILES.length - 1;
    else return;
    event.preventDefault();
    chooseProfile(PROFILES[next].key);
    tabRefs.current[next]?.focus({ preventScroll: true });
  };

  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link className={styles.wordmark} href="/" aria-label="Về trang chủ House of Hoang Long" translate="no">
          <span className={styles.seal} aria-hidden="true">皇龍</span>
          <span className="notranslate" translate="no">House of Hoang Long</span>
        </Link>
        <Link className={styles.shopLink} href="/shop">Xem toàn bộ trà<ArrowRight aria-hidden="true" /></Link>
      </header>

      <section className={styles.intro} aria-labelledby="taste-title">
        <div className={styles.introTitle}>
          <p>Bốn hướng vị · trà Nhà đang có</p>
          <h1 id="taste-title">Chọn trà theo vị.</h1>
        </div>
        <span>Chọn cảm giác bạn muốn giữ trong ly. Nhà sẽ nối nó với nền trà và một món nên thử trước—không bắt bạn đọc hết danh mục.</span>
      </section>

      <div className={styles.selector} role="tablist" aria-label="Chọn hướng vị trà">
        {PROFILES.map((item, index) => (
          <button
            aria-controls={`taste-panel-${item.key}`}
            aria-selected={item.key === profile.key}
            className={styles.tasteTab}
            data-selected={item.key === profile.key}
            id={`taste-tab-${item.key}`}
            key={item.key}
            onClick={() => chooseProfile(item.key)}
            onKeyDown={(event) => moveTab(event, index)}
            ref={(node) => { tabRefs.current[index] = node; }}
            role="tab"
            tabIndex={item.key === profile.key ? 0 : -1}
            type="button"
          >
            <strong>{item.label}</strong>
            <span>{item.summary}</span>
          </button>
        ))}
      </div>

      <section
        aria-labelledby={`taste-tab-${profile.key}`}
        className={styles.selection}
        id={`taste-panel-${profile.key}`}
        key={profile.key}
        role="tabpanel"
      >
        <div className={styles.selectionCopy}>
          <p>Hướng {profile.label}</p>
          <h2>{profile.title}</h2>
          <span>{profile.body}</span>
        </div>
        <div className={styles.application}>
          <h3>Nên thử trong</h3>
          <ul>{profile.applications.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div className={styles.recipe}>
          <span>Món tham chiếu</span>
          <strong>{recommendation.recipeName}</strong>
          <p>{recommendation.reason}</p>
          <small>Điểm bắt đầu để nếm và hiệu chỉnh tại quán; chưa phải công thức đã duyệt.</small>
        </div>
      </section>

      <section className={styles.catalog} aria-labelledby="matching-teas-title">
        <header>
          <div><h2 id="matching-teas-title">Trà đang khớp với hướng này</h2><p>Giá và tình trạng lấy trực tiếp từ danh mục của Nhà.</p></div>
          <span>{status === "ready" ? `${matchingProducts.length} lựa chọn` : "Đang đọc danh mục"}</span>
        </header>

        {status === "loading" ? (
          <div className={styles.loading} aria-label="Đang tải trà phù hợp" aria-live="polite"><i /><i /></div>
        ) : status === "error" ? (
          <p className={styles.error} role="alert">Chưa đọc được danh mục hiện tại. Bạn vẫn có thể mở Menu Lab và Nhà sẽ kiểm tra trà phù hợp khi nhận yêu cầu.</p>
        ) : matchingProducts.length ? (
          <div className={styles.productGrid}>
            {matchingProducts.map((product) => {
              const name = product.name?.vi || product.name?.en || product.id;
              const notes = product.notes?.vi || product.notes?.en || "";
              return (
                <article className={styles.product} key={product.id}>
                  <figure>
                    {product.photoUrl ? <img src={product.photoUrl} alt={name} width="1200" height="900" loading="lazy" style={{ objectPosition: product.photoPosition || "50% 50%" }} /> : <span aria-hidden="true">皇龍</span>}
                  </figure>
                  <div><h3>{name}</h3><p>{notes}</p><strong>{product.price ? `${money.format(product.price)} / kg` : "Liên hệ báo giá"}</strong></div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.empty}>Danh mục chưa có trà đang bán trong hướng này. Mở Menu Lab để Nhà chọn phương án gần nhất.</p>
        )}
      </section>

      <section className={styles.handoff}>
        <div><h2>Đã thấy đúng hướng vị?</h2><p>Đi tiếp để chọn cấu trúc món, cỡ ly và mức thử. Hướng vị vừa chọn sẽ được mang sang Menu Lab.</p></div>
        <div>
          <Link href={sampleHref}>Mở công thức mẫu<ArrowRight aria-hidden="true" /></Link>
          <Link href="/sample">Chọn bộ mẫu trực tiếp</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div><strong className="notranslate" translate="no">House of Hoang Long</strong><span>Trà Shan Tuyết cổ thụ Hà Giang · từ năm 1995</span></div>
        <div><a href="https://zalo.me/0903333841" target="_blank" rel="noreferrer">0903 333 841</a><Link href="/">Về trang chủ</Link></div>
      </footer>
    </main>
  );
}

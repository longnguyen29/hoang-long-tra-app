"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./TeaJourney.module.css";

const STAGES = [
  {
    number: "01",
    anchor: "nguon-tra",
    title: "Bắt đầu từ cây, nhưng chọn theo vụ.",
    body: "Trà Shan Tuyết cổ thụ thay đổi theo vùng, thời tiết và sản lượng thực tế. Nhà Hoàng Long chọn nguyên liệu theo mẻ đang có — không giả định rằng mùa nào cũng giống mùa nào.",
    image: "/landing/1.jpg",
    width: 1200,
    height: 2133,
    alt: "Cây trà Shan Tuyết cổ thụ tại vùng núi Hà Giang",
    caption: "Hà Giang · cây trà Shan Tuyết cổ thụ",
  },
  {
    number: "02",
    anchor: "la-tra",
    title: "Đọc lá trước khi đặt quy trình.",
    body: "Lá non, lượng nước và trạng thái sau thu hái quyết định cách mẻ trà cần được xử lý. Kinh nghiệm làm trà bắt đầu từ việc nhìn đúng nguyên liệu đang có trong tay.",
    image: "/landing/2.jpg",
    width: 1200,
    height: 2133,
    alt: "Lá trà được kiểm tra trong quá trình chế biến",
    caption: "Lá trà · kiểm tra theo từng mẻ",
  },
  {
    number: "03",
    anchor: "che-bien",
    title: "Kiểm soát nhiệt, nước và thời gian.",
    body: "Kinh nghiệm làm trà truyền thống đi cùng công nghệ chế biến hiện đại của Nhật Bản. Mục tiêu không phải làm trà Việt giống một nơi khác, mà giúp hương vị của lá hiện ra rõ và ít gắt hơn.",
    image: "/landing/3.jpg",
    width: 1024,
    height: 1024,
    alt: "Dây chuyền chế biến trà tại nhà máy Hoàng Long",
    caption: "Xưởng Hoàng Long · công nghệ chế biến",
  },
  {
    number: "04",
    anchor: "vao-menu",
    title: "Thử trà trong công thức của quán.",
    body: "Một loại trà chỉ thật sự phù hợp khi đi vào đúng món, đúng tỷ lệ và đúng cách phục vụ. Chúng tôi thử từ công thức của quán, rồi để kết quả trong ly quyết định.",
    image: "/landing/4.jpg",
    width: 1200,
    height: 2133,
    alt: "Một món pha chế dùng trà làm nền",
    caption: "Bàn pha · kiểm tra bằng món thật",
  },
  {
    number: "05",
    anchor: "phan-hoi",
    title: "Giữ lại điều đã học sau mỗi lần thử.",
    body: "Mẫu trà, phản hồi, công thức, báo giá và đơn hàng được nối trong cùng hành trình. Lần đặt sau không phải bắt đầu lại từ đầu — quán và Nhà cùng biết điều gì đã hiệu quả.",
    sequence: ["Nhận mẫu", "Thử món", "Ghi phản hồi", "Chốt trà nền", "Đặt theo nhu cầu"],
  },
];

export default function TeaJourney() {
  const stageRefs = useRef([]);
  const [reachedStage, setReachedStage] = useState(-1);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let session = "";
    const path = window.location.pathname;
    try {
      session = window.localStorage.getItem("hl-visitor-session") || crypto.randomUUID();
      window.localStorage.setItem("hl-visitor-session", session);
      const key = `hl-growth-view:${path}:tea-journey`;
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
      p_growth_code: "tea-journey",
    }).then(({ error }) => {
      if (error) console.debug("Growth attribution unavailable", error.message);
    });
  }, [supabase]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compact = window.matchMedia("(max-width: 40rem)").matches;
    if (reduceMotion || compact || !("IntersectionObserver" in window)) {
      setReachedStage(STAGES.length - 1);
      return undefined;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = Number(entry.target.dataset.index);
        setReachedStage((current) => Math.max(current, index));
      });
    }, { threshold: 0.45, rootMargin: "0px 0px -12%" });

    stageRefs.current.filter(Boolean).forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.masthead}>
        <p className={styles.issueLine}>Hà Giang · từ năm 1995 · bản thử nghiệm 01</p>
        <Link className={styles.wordmark} href="/" aria-label="Về trang chủ House of Hoàng Long" translate="no">
          <span className={styles.seal} aria-hidden="true">皇龍</span>
          <span className="notranslate" translate="no">House of Hoang Long</span>
        </Link>
        <nav aria-label="Hành trình của lá trà">
          <a href="#nguon-tra">Nguồn trà</a>
          <a href="#che-bien">Chế biến</a>
          <a href="#vao-menu">Vào menu</a>
          <Link href="/sample/menu-lab?utm_source=website&utm_medium=journey&utm_campaign=tea_journey">Nhận mẫu</Link>
        </nav>
        <span className={styles.doubleRule} aria-hidden="true" />
      </header>

      <section className={styles.hero}>
        <div className={styles.heroLead}>
          <p>Một đường đi có thể kiểm tra</p>
          <h1>Một lá trà đi đến quầy pha chế.</h1>
        </div>
        <div className={styles.heroBody}>
          <p>Không đi thẳng từ núi vào menu. Giữa hai nơi là một chuỗi lựa chọn về nguyên liệu, chế biến, cách pha và phản hồi từ chính quán.</p>
          <a href="#nguon-tra">Theo hành trình<ArrowRight aria-hidden="true" /></a>
        </div>
      </section>

      <section className={styles.journey} aria-label="Năm chặng của lá trà">
        {STAGES.map((stage, index) => {
          const reached = index <= reachedStage;
          return (
            <article
              className={styles.stage}
              data-reached={reached ? "true" : "false"}
              data-index={index}
              id={stage.anchor}
              key={stage.number}
              ref={(node) => { stageRefs.current[index] = node; }}
            >
              <div className={styles.rail} aria-hidden="true">
                <span className={styles.railFill} />
                <span className={styles.node} />
              </div>
              <div className={styles.stageCopy}>
                <span className={styles.stageNumber}>{stage.number}</span>
                <h2>{stage.title}</h2>
                <p>{stage.body}</p>
              </div>
              {stage.image ? (
                <figure className={styles.stageImage}>
                  <Image
                    src={stage.image}
                    alt={stage.alt}
                    width={stage.width}
                    height={stage.height}
                    sizes="(min-width: 960px) 44vw, 88vw"
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                  />
                  <figcaption>{stage.caption}</figcaption>
                </figure>
              ) : (
                <ol className={styles.sequence} aria-label="Từ mẫu thử đến đơn hàng">
                  {stage.sequence.map((item, itemIndex) => (
                    <li key={item}><span>{String(itemIndex + 1).padStart(2, "0")}</span>{item}</li>
                  ))}
                </ol>
              )}
            </article>
          );
        })}
      </section>

      <section className={styles.sampleCta}>
        <div>
          <h2>Bắt đầu từ món bạn đang làm.</h2>
          <p>Chọn loại đồ uống, nhận gợi ý trà nền và tỷ lệ pha khởi điểm. Sau đó mới quyết định bộ mẫu cần thử.</p>
        </div>
        <div className={styles.sampleLinks}>
          <Link href="/sample/menu-lab?utm_source=website&utm_medium=journey&utm_campaign=tea_journey">
            Mở Menu Lab<ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/sample?utm_source=website&utm_medium=journey&utm_campaign=tea_journey_control">
            Chọn bộ mẫu trực tiếp
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>Hẹn gặp ở một mẻ thử,<br /><strong>— Nhà Hoàng Long</strong></p>
        <div>
          <span>Hà Giang · Hà Nội</span>
          <a href="https://zalo.me/0903333841" target="_blank" rel="noreferrer">Trao đổi với Nhà · 0903 333 841</a>
          <Link href="/">Về trang chủ</Link>
        </div>
      </footer>
    </main>
  );
}

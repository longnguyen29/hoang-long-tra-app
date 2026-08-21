"use client";

import { ArrowRight, Calendar, ChevronRight, Mountain, Phone, Send, Sparkles } from "lucide-react";
import styles from "./HouseHome.module.css";

const COPY = {
  en: {
    eyebrow: "Vietnamese mountain tea · selected at origin",
    title: "Tea with a place, a person, and a reason to exist.",
    intro: "Hoàng Long brings high-mountain Vietnamese tea into modern cups—whole leaf for the table, dependable foundations for cafés, and an honest record of where each tea came from.",
    shop: "Explore the tea collection",
    trade: "Build a café tea program",
    proof: "The origin ledger",
    proofBody: "Not anonymous tea. Each lot begins with a mountain, a maker, a season, and the choices that shaped the cup.",
    path: "Choose your path",
    tableTitle: "Tea for your table",
    tableBody: "Whole-leaf teas selected for clarity, character, and repeatable brewing at home.",
    tableCta: "Shop retail",
    tradeTitle: "Tea for your menu",
    tradeBody: "Bases for milk tea, fruit tea, and signature drinks—supported with samples, recipes, and costing.",
    tradeCta: "Wholesale & samples",
    today: "From the tea room today",
    viewTea: "View this tea",
    sample: "Start with a sample",
    sampleBody: "Taste before committing. Compare the leaf in your own water, milk, and recipes.",
    story: "The house behind the leaf",
    storyBody: "A Vietnamese tea house connecting mountain craft with the way people drink now.",
    readStory: "Read our story",
    session: "Taste with Long",
    sessionBody: "Reserve a private tea session and find the right tea for your table or menu.",
    gallery: "Field notes",
    contact: "Begin a conversation",
    contactBody: "Tell us what you are trying to serve. We will point you toward the most useful next step.",
  },
  vi: {
    eyebrow: "Trà núi Việt Nam · tuyển chọn tại vùng nguyên liệu",
    title: "Một chén trà có vùng đất, con người và lý do để tồn tại.",
    intro: "Hoàng Long đưa trà núi cao Việt Nam vào nhịp sống hiện đại—trà nguyên lá cho bàn trà, trà nền ổn định cho quán, cùng hồ sơ minh bạch về nguồn gốc của từng mẻ.",
    shop: "Khám phá bộ sưu tập trà",
    trade: "Xây dựng chương trình trà cho quán",
    proof: "Hồ sơ vùng trà",
    proofBody: "Không phải trà vô danh. Mỗi mẻ bắt đầu từ một ngọn núi, một người làm trà, một mùa vụ và những lựa chọn tạo nên chén trà.",
    path: "Chọn lối đi của bạn",
    tableTitle: "Trà cho bàn trà",
    tableBody: "Trà nguyên lá được chọn vì độ trong, cá tính và khả năng pha ổn định tại nhà.",
    tableCta: "Mua trà lẻ",
    tradeTitle: "Trà cho thực đơn",
    tradeBody: "Trà nền cho trà sữa, trà trái cây và món signature—kèm mẫu thử, công thức và tính giá vốn.",
    tradeCta: "Sỉ & mẫu thử",
    today: "Từ phòng trà hôm nay",
    viewTea: "Xem trà này",
    sample: "Bắt đầu bằng mẫu thử",
    sampleBody: "Thử trước khi chọn. So sánh trà với chính nguồn nước, sữa và công thức của bạn.",
    story: "Ngôi nhà phía sau lá trà",
    storyBody: "Một nhà trà Việt kết nối nghề trà miền núi với cách thưởng trà hôm nay.",
    readStory: "Đọc câu chuyện",
    session: "Uống trà cùng Long",
    sessionBody: "Đặt một buổi trà riêng để tìm loại trà phù hợp cho bàn trà hoặc thực đơn của bạn.",
    gallery: "Ghi chép từ vùng trà",
    contact: "Bắt đầu một cuộc trò chuyện",
    contactBody: "Hãy kể món bạn muốn phục vụ. Chúng tôi sẽ gợi ý bước tiếp theo hữu ích nhất.",
  },
};

function Action({ children, onClick, secondary = false }) {
  return <button className={secondary ? styles.secondaryAction : styles.primaryAction} onClick={onClick}>{children}<ArrowRight size={15} /></button>;
}

export default function HouseHome({
  lang = "vi", photos = [], gallery = [], teaOfDay, samples = [], houseStory = {},
  onNavigate, onOpenTea, onOpenImage,
}) {
  const c = COPY[lang] || COPY.en;
  const heroPhoto = photos[0] || gallery[0]?.url || "/landing/1.jpg";
  const secondaryPhoto = photos[1] || gallery[1]?.url || "/landing/2.jpg";
  const stats = (houseStory.originStats || []).slice(0, 4);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}><span>皇龍</span>{c.eyebrow}</div>
          <h1>{c.title}</h1>
          <p>{c.intro}</p>
          <div className={styles.heroActions}>
            <Action onClick={() => onNavigate("retail")}>{c.shop}</Action>
            <Action secondary onClick={() => onNavigate("wholesale")}>{c.trade}</Action>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <img src={heroPhoto} alt="" />
          <div className={styles.verticalMark}>HOÀNG LONG · VIỆT NAM</div>
          <div className={styles.photoCaption}><Mountain size={15}/><span>{c.proof}</span></div>
        </div>
      </section>

      <section className={styles.ledger}>
        <div>
          <span className={styles.sectionNo}>01</span>
          <p className={styles.kicker}>{c.proof}</p>
          <h2>{c.proofBody}</h2>
        </div>
        <div className={styles.stats}>
          {(stats.length ? stats : [
            { value: "Shan", label: { en: "Ancient tea material", vi: "Nguyên liệu trà cổ thụ" } },
            { value: "VN", label: { en: "Mountain origin", vi: "Vùng núi Việt Nam" } },
            { value: "Small lot", label: { en: "Selected production", vi: "Sản xuất chọn lọc" } },
          ]).map((item, index) => (
            <div className={styles.stat} key={`${item.value}-${index}`}>
              <strong>{item.value}</strong>
              <span>{item.label?.[lang] || item.label?.en}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.paths}>
        <header><span className={styles.sectionNo}>02</span><p className={styles.kicker}>{c.path}</p></header>
        <div className={styles.pathGrid}>
          <button className={styles.pathCard} onClick={() => onNavigate("retail")}>
            <span className={styles.pathIndex}>A</span><h3>{c.tableTitle}</h3><p>{c.tableBody}</p><span>{c.tableCta}<ChevronRight size={15}/></span>
          </button>
          <button className={`${styles.pathCard} ${styles.pathCardDark}`} onClick={() => onNavigate("wholesale")}>
            <span className={styles.pathIndex}>B</span><h3>{c.tradeTitle}</h3><p>{c.tradeBody}</p><span>{c.tradeCta}<ChevronRight size={15}/></span>
          </button>
        </div>
      </section>

      {teaOfDay && (
        <section className={styles.feature}>
          <div className={styles.featurePhoto}>{teaOfDay.photoUrl ? <img src={teaOfDay.photoUrl} alt="" /> : <Sparkles size={34}/>}</div>
          <div className={styles.featureCopy}><p className={styles.kicker}>{c.today}</p><h2>{teaOfDay.name?.[lang] || teaOfDay.name?.en}</h2>{teaOfDay.notes?.[lang] && <p>{teaOfDay.notes[lang]}</p>}<button onClick={() => onOpenTea(teaOfDay)}>{c.viewTea}<ArrowRight size={15}/></button></div>
        </section>
      )}

      <section className={styles.story}>
        <div className={styles.storyPhoto}><img src={secondaryPhoto} alt="" /></div>
        <div className={styles.storyCopy}>
          <span className={styles.sectionNo}>03</span><p className={styles.kicker}>{c.story}</p><h2>{c.storyBody}</h2>
          {houseStory.producerQuote?.[lang] && <blockquote>“{houseStory.producerQuote[lang]}”</blockquote>}
          {houseStory.producerName && <p className={styles.byline}>{houseStory.producerName}{houseStory.producerRole?.[lang] ? ` · ${houseStory.producerRole[lang]}` : ""}</p>}
          <button onClick={() => onNavigate("wiki")}>{c.readStory}<ArrowRight size={15}/></button>
        </div>
      </section>

      <section className={styles.invites}>
        {samples[0] && <button onClick={() => onOpenTea(samples[0])}><Sparkles size={18}/><span><strong>{c.sample}</strong><small>{c.sampleBody}</small></span><ChevronRight size={17}/></button>}
        <button onClick={() => onNavigate("sessions")}><Calendar size={18}/><span><strong>{c.session}</strong><small>{c.sessionBody}</small></span><ChevronRight size={17}/></button>
      </section>

      {gallery.length > 0 && <section className={styles.gallery}><header><span className={styles.sectionNo}>04</span><p className={styles.kicker}>{c.gallery}</p></header><div>{gallery.slice(0,4).map((image, i) => <button key={image.id || image.url} onClick={() => onOpenImage(image)}><img src={image.url} alt={image.caption?.[lang] || ""}/><span>{String(i + 1).padStart(2,"0")}</span></button>)}</div></section>}

      <footer className={styles.footer}>
        <p className={styles.kicker}>{c.contact}</p><h2>{c.contactBody}</h2>
        <div><a href="tel:+84903333841"><Phone size={16}/>0903 333 841</a><a href="mailto:hotro.trahoanglong@gmail.com"><Send size={16}/>hotro.trahoanglong@gmail.com</a></div>
        <span className={styles.footerSeal}>皇龍</span>
      </footer>
    </div>
  );
}

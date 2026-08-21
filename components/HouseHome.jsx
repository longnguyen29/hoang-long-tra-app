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

function LegacyHouseHome({
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

const INNER_COPY = {
  en: {
    eyebrow: "House of Hoàng Long · Vietnamese tea",
    title: "Start with the drink. Then choose the leaf.",
    lead: "Tea is only useful when it works in the cup you actually want to serve. Tell us the outcome—quiet daily tea, a milk drink with structure, or a bright fruit tea—and we will help narrow the leaf, extraction, and cost.",
    shop: "Browse tea",
    sample: "Request trade samples",
    choose: "What are you making?",
    chooseIntro: "Three different drinks ask three different things of the leaf.",
    straight: "A clear cup",
    straightBody: "Look for aroma, texture, and a finish that stays interesting without milk or fruit.",
    milk: "A milk drink",
    milkBody: "You need enough structure to remain recognizably tea after dilution, sweetness, and ice.",
    fruit: "A fruit tea",
    fruitBody: "Choose lift, clean bitterness, and an aroma that gives fruit room instead of fighting it.",
    seeRetail: "See tea for the table",
    seeTrade: "See café tea bases",
    current: "Available from the house",
    currentIntro: "Real teas from the current catalog—not an imaginary collection.",
    view: "View tea",
    method: "How we make a recommendation",
    methodIntro: "A good recommendation is a small decision process, not a tasting-note contest.",
    steps: [
      ["Brief", "What are you serving, to whom, and at what price?"],
      ["Sample", "We narrow the options so you test a useful set—not every tea we own."],
      ["Test", "Brew in your water and recipe. Record dose, time, yield, and what changes under dilution."],
      ["Choose", "Select for flavor, consistency, and cost per finished cup—then keep the result as a working recipe."],
    ],
    house: "Why Hoàng Long",
    houseTitle: "Vietnamese tea should be easier to understand—and easier to use well.",
    houseBody: "We connect the character of mountain tea with the practical decisions behind a modern tea menu. Origin matters. So do extraction, consistency, and whether a customer asks for the drink again.",
    story: "Read the house story",
    tasting: "Book a tea session",
    tastingBody: "Taste side by side with Long and leave with a clearer choice, not a longer shopping list.",
    contact: "Tell us what you want to make",
  },
  vi: {
    eyebrow: "House of Hoàng Long · Trà Việt Nam",
    title: "Bắt đầu từ món muốn làm. Rồi mới chọn lá trà.",
    lead: "Trà chỉ thật sự hữu ích khi tạo ra đúng ly bạn muốn phục vụ. Hãy nói về kết quả—một chén trà uống hằng ngày, trà sữa có thân vị hay trà trái cây sáng rõ—Hoàng Long sẽ giúp thu hẹp lựa chọn về trà, cách chiết xuất và giá vốn.",
    shop: "Xem bộ sưu tập trà",
    sample: "Yêu cầu mẫu thử cho quán",
    choose: "Bạn đang muốn làm món gì?",
    chooseIntro: "Ba kiểu đồ uống đòi hỏi ba phẩm chất khác nhau từ lá trà.",
    straight: "Một chén trà trong",
    straightBody: "Hãy tìm hương, cấu trúc và hậu vị đủ thú vị khi không có sữa hay trái cây.",
    milk: "Một ly trà sữa",
    milkBody: "Trà cần đủ thân vị để vẫn được nhận ra sau khi thêm sữa, đường và đá.",
    fruit: "Một ly trà trái cây",
    fruitBody: "Chọn độ nâng hương, vị đắng sạch và nền hương nhường chỗ cho trái cây thay vì đối chọi.",
    seeRetail: "Xem trà cho bàn trà",
    seeTrade: "Xem trà nền cho quán",
    current: "Trà hiện có tại Hoàng Long",
    currentIntro: "Các sản phẩm thật trong danh mục hiện tại—không phải một bộ sưu tập tưởng tượng.",
    view: "Xem trà",
    method: "Cách Hoàng Long đưa ra đề xuất",
    methodIntro: "Một đề xuất tốt là quy trình ra quyết định ngắn gọn, không phải cuộc thi mô tả hương vị.",
    steps: [
      ["Đề bài", "Bạn phục vụ món gì, cho ai và ở mức giá nào?"],
      ["Mẫu thử", "Chúng tôi thu hẹp lựa chọn để bạn thử một nhóm có ích—không phải mọi loại trà đang có."],
      ["Kiểm tra", "Pha bằng nguồn nước và công thức của bạn. Ghi lại lượng trà, thời gian, sản lượng và thay đổi khi pha loãng."],
      ["Lựa chọn", "Chọn theo hương vị, độ ổn định và giá vốn mỗi ly—sau đó lưu lại thành công thức làm việc."],
    ],
    house: "Vì sao là Hoàng Long",
    houseTitle: "Trà Việt cần dễ hiểu hơn—và dễ được sử dụng đúng hơn.",
    houseBody: "Hoàng Long kết nối cá tính của trà núi với những quyết định thực tế phía sau một menu trà hiện đại. Nguồn gốc quan trọng. Cách chiết xuất, độ ổn định và việc khách có gọi lại món cũng quan trọng.",
    story: "Đọc câu chuyện nhà trà",
    tasting: "Đặt một buổi uống trà",
    tastingBody: "Thử trà cùng Long và ra về với lựa chọn rõ hơn, không phải danh sách mua sắm dài hơn.",
    contact: "Kể chúng tôi món bạn muốn làm",
  },
};

function InnerHome({ lang = "vi", photos = [], gallery = [], catalog = [], houseStory = {}, onNavigate, onOpenTea }) {
  const c = INNER_COPY[lang] || INNER_COPY.en;
  const image = photos[0] || gallery[0]?.url || "/landing/1.jpg";
  const teas = catalog.filter((tea) => tea.kind !== "goods" && tea.line !== "sample").slice(0, 3);
  const applications = [
    { mark: "清", title: c.straight, body: c.straightBody, action: c.seeRetail, destination: "retail" },
    { mark: "醇", title: c.milk, body: c.milkBody, action: c.seeTrade, destination: "wholesale" },
    { mark: "香", title: c.fruit, body: c.fruitBody, action: c.seeTrade, destination: "wholesale" },
  ];

  return (
    <div className={styles.innerPage}>
      <section className={styles.innerHero}>
        <div className={styles.innerHeroCopy}>
          <p className={styles.innerEyebrow}>{c.eyebrow}</p>
          <h1>{c.title}</h1>
          <p className={styles.innerLead}>{c.lead}</p>
          <div className={styles.innerActions}>
            <button onClick={() => onNavigate("retail")}>{c.shop}<ArrowRight size={15}/></button>
            <button onClick={() => onNavigate("wholesale")}>{c.sample}<ArrowRight size={15}/></button>
          </div>
        </div>
        <figure className={styles.innerHeroImage}>
          <img src={image} alt="" />
          <figcaption><span>皇龍</span><span>Vietnamese mountain tea</span></figcaption>
        </figure>
      </section>

      <section className={styles.applicationSection}>
        <div className={styles.innerSectionHead}><p>{c.choose}</p><h2>{c.chooseIntro}</h2></div>
        <div className={styles.applicationList}>
          {applications.map((item) => (
            <article key={item.mark}>
              <span className={styles.applicationMark}>{item.mark}</span>
              <div><h3>{item.title}</h3><p>{item.body}</p></div>
              <button onClick={() => onNavigate(item.destination)}>{item.action}<ArrowRight size={14}/></button>
            </article>
          ))}
        </div>
      </section>

      {teas.length > 0 && (
        <section className={styles.catalogSection}>
          <div className={styles.innerSectionHead}><p>{c.current}</p><h2>{c.currentIntro}</h2></div>
          <div className={styles.teaRows}>
            {teas.map((tea) => (
              <button key={tea.id} onClick={() => onOpenTea(tea)}>
                <span className={styles.teaThumb}>{tea.photoUrl ? <img src={tea.photoUrl} alt=""/> : <span>茶</span>}</span>
                <span className={styles.teaName}>{tea.name?.[lang] || tea.name?.en}</span>
                <span className={styles.teaNote}>{tea.notes?.[lang] || tea.notes?.en || c.view}</span>
                <ArrowRight size={16}/>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={styles.methodSection}>
        <div className={styles.innerSectionHead}><p>{c.method}</p><h2>{c.methodIntro}</h2></div>
        <ol>
          {c.steps.map(([title, body], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}
        </ol>
      </section>

      <section className={styles.houseSection}>
        <div>
          <p className={styles.innerEyebrow}>{c.house}</p><h2>{c.houseTitle}</h2><p>{c.houseBody}</p>
          {(houseStory.originStats || []).length > 0 && <dl>{houseStory.originStats.slice(0,3).map((stat, i) => <div key={i}><dt>{stat.value}</dt><dd>{stat.label?.[lang] || stat.label?.en}</dd></div>)}</dl>}
          <button onClick={() => onNavigate("wiki")}>{c.story}<ArrowRight size={15}/></button>
        </div>
        {houseStory.producerPhoto && <img src={houseStory.producerPhoto} alt={houseStory.producerName || ""}/>}
      </section>

      <section className={styles.tastingSection}>
        <Calendar size={21}/><div><h2>{c.tasting}</h2><p>{c.tastingBody}</p></div><button onClick={() => onNavigate("sessions")}>{c.contact}<ArrowRight size={15}/></button>
      </section>
    </div>
  );
}

export default InnerHome;

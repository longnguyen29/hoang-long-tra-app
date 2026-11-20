import { CORE_EXPORT_PRODUCTS } from "./export-product-profile.js";

export const INTERNATIONAL_LOCALES = { en: "English", ja: "日本語", zh: "简体中文", ru: "Русский" };
export const INTERNATIONAL_SECTIONS = ["", "company", "catalog", "wholesale", "documents"];
export const localPath = (language, section = "") => language === "vi"
  ? ({ company: "/company", catalog: "/catalog", wholesale: "/wholesale", documents: "/company#documents" }[section] || "/")
  : `/${language}${section ? `/${section}` : ""}`;

export function internationalSection(pathname) {
  if (pathname === "/company" || pathname === "/story") return "company";
  if (pathname.startsWith("/catalog") || pathname.startsWith("/shop")) return "catalog";
  if (pathname.startsWith("/wholesale") || pathname.startsWith("/sample") || pathname === "/cho-quan") return "wholesale";
  return "";
}

const english = {
  nav: ["Home", "Company", "Tea catalogue", "Wholesale", "Documents"],
  language: "Language",
  heading: "Vietnamese tea, from leaf to cup.",
  intro: "Hoàng Long develops and supplies loose-leaf teas for importers, distributors and beverage teams. Our family has made tea since 1995, with processing in Tân Lập, Hà Giang.",
  viewRange: "Explore our teas", discuss: "Discuss supply", story: "From the highlands of northern Vietnam",
  storyText: "We select and process tea with its intended use in mind. Taste the dry leaf and brewed tea, then test the sample in the drink or retail range you plan to develop.",
  proof: [["Family tea-making", "Since 1995"], ["Processing and collection", "Tân Lập, Hà Giang, Vietnam"], ["Commercial office and warehouse", "Sóc Sơn, Hà Nội, Vietnam"]],
  catalogue: "Four export selections",
  catalogIntro: "Compare a mellow black tea, a smoky black tea, a clean green tea and a flower-scented green tea. Each is available for evaluation as a loose-leaf sample.",
  supply: "Wholesale and export supply",
  steps: [
    ["Send a brief", "Share your destination market, application, volume, preferred packing and target timing."],
    ["Evaluate samples", "Agree on the grade and sensory criteria. Review testing and labelling needs for your destination."],
    ["Confirm a quotation", "Confirm the lot, net weight, documents, delivery basis and timing before placing an order."],
  ],
  bulk: "Bulk packing", bulkText: "PP/PE sacks of 20, 30 or 35 kg, depending on leaf form and use.",
  exw: "Collection terms", exwText: "EXW at the Hoàng Long tea factory in Tân Lập, Hà Giang. Terms for each shipment are agreed in the quotation or contract.",
  documents: "Trade documents", docsIntro: "Company background, core tea selection and a buyer’s checklist in one export brief.",
  docTitle: "Company profile & export catalogue", pdf: "Download PDF", print: "Print / save PDF",
  checklist: "Buyer’s checklist",
  checks: ["Destination, sales channel and intended application", "Tea type, target specification and sample reference", "Forecast volume, packing and delivery schedule", "Labelling, testing and shipment documents required for the destination"],
  contact: "Export enquiries", checkout: "Open the retail shop · English",
  existing: "Original English trade documents",
  existingDocs: ["Corporate profile", "Product annex", "Cooperation brief"],
  imageAlt: "Hoàng Long loose-leaf tea",
};

const japanese = {
  nav: ["ホーム", "会社概要", "茶葉カタログ", "業務用・輸出", "資料"],
  language: "言語",
  heading: "ベトナムの茶葉を、一杯のお茶へ。",
  intro: "ホアンロンは、輸入業者、卸売業者、飲料事業者向けに茶葉を開発・供給しています。1995年から家族で茶づくりを続け、ハザン省タンラップで加工しています。",
  viewRange: "茶葉を見る", discuss: "業務用のご相談", story: "ベトナム北部の高地から",
  storyText: "用途に合わせて原料を選び、加工します。乾燥茶葉と抽出したお茶をご確認のうえ、実際の飲料レシピや販売商品でサンプルをお試しください。",
  proof: [["家族での茶づくり", "1995年から"], ["加工・引渡し拠点", "ベトナム・ハザン省タンラップ"], ["営業所・倉庫", "ベトナム・ハノイ市ソクソン"]],
  catalogue: "輸出向けの主力茶葉4種",
  catalogIntro: "まろやかな紅茶、スモーキーな紅茶、すっきりした緑茶、花の香りを移した緑茶。いずれもリーフタイプの試作用サンプルをご相談いただけます。",
  supply: "業務用供給・輸出",
  steps: [
    ["ご要件をお知らせください", "対象市場、用途、予定数量、包装のご希望、納入時期をお知らせください。"],
    ["サンプルをご評価ください", "等級と官能評価の基準を決め、仕向地に必要な検査や表示を確認します。"],
    ["見積もりをご確認ください", "発注前にロット、正味重量、必要書類、引渡し条件、日程を確定します。"],
  ],
  bulk: "業務用包装", bulkText: "茶葉の形状と用途に応じて、PP/PE袋で20 kg、30 kgまたは35 kg。",
  exw: "引渡し条件", exwText: "ハザン省タンラップのホアンロン茶工場にてEXW。出荷ごとの条件は見積書または契約書で合意します。",
  documents: "取引資料", docsIntro: "会社概要、主力茶葉、商談時の確認項目を一冊にまとめた輸出案内です。",
  docTitle: "会社概要・輸出向け茶葉カタログ", pdf: "PDFをダウンロード", print: "印刷・PDF保存",
  checklist: "商談時の確認項目",
  checks: ["仕向地、販売チャネル、用途", "茶葉の種類、目標仕様、サンプル番号", "予定数量、包装、納入時期", "仕向地に必要な表示、検査、出荷書類"],
  contact: "輸出のお問い合わせ", checkout: "オンラインショップへ（英語）",
  imageAlt: "ホアンロンの茶葉",
};

const chinese = {
  nav: ["首页", "公司简介", "茶叶目录", "批发与出口", "资料"],
  language: "语言",
  heading: "从越南茶山，到杯中好茶。",
  intro: "Hoàng Long 为进口商、经销商和饮品企业开发并供应散叶茶。我们家族自1995年开始制茶，在越南河江省新立加工茶叶。",
  viewRange: "查看茶叶", discuss: "洽谈供货", story: "来自越南北部高地",
  storyText: "我们根据用途选择和加工茶叶。欢迎先观察干茶、品评茶汤，再将样品用于您计划开发的饮品或零售产品。",
  proof: [["家族制茶", "始于1995年"], ["加工及交货地点", "越南河江省新立"], ["业务办公室及仓库", "越南河内市朔山"]],
  catalogue: "四款主力出口茶",
  catalogIntro: "可对比柔和红茶、烟熏风味红茶、清爽绿茶和窨花绿茶。四款均可洽询散叶茶样品。",
  supply: "批发与出口供货",
  steps: [
    ["提交采购需求", "请提供目标市场、用途、预计数量、包装要求和交付时间。"],
    ["评估茶样", "确定等级和感官标准，并核对目的地的检测和标签要求。"],
    ["确认报价", "下单前确认批次、净重、所需单证、交货条件和交期。"],
  ],
  bulk: "大宗包装", bulkText: "根据茶叶形态和用途，选用20、30或35公斤PP/PE袋。",
  exw: "交货条件", exwText: "河江省新立 Hoàng Long 茶厂交货（EXW）。每批货的具体条件在报价单或合同中约定。",
  documents: "贸易资料", docsIntro: "出口简介汇总了公司背景、主力茶叶和买家洽谈清单。",
  docTitle: "公司简介与出口茶叶目录", pdf: "下载PDF", print: "打印或保存为PDF",
  checklist: "采购洽谈清单",
  checks: ["目的地、销售渠道和预期用途", "茶叶品种、目标规格和样品编号", "预估数量、包装及交付安排", "目的地要求的标签、检测和出货单证"],
  contact: "出口业务联系", checkout: "前往零售网店（英语）",
  imageAlt: "Hoàng Long 散叶茶",
};

const russian = {
  nav: ["Главная", "О компании", "Каталог чая", "Опт и экспорт", "Документы"],
  language: "Язык",
  heading: "Вьетнамский чай, от листа до чашки.",
  intro: "Hoàng Long выпускает и поставляет листовой чай для импортёров, дистрибьюторов и производителей напитков. Наша семья занимается чаем с 1995 года. Переработка находится в Танлапе, провинция Хазянг.",
  viewRange: "Посмотреть каталог", discuss: "Обсудить поставку", story: "С высокогорий северного Вьетнама",
  storyText: "Мы подбираем и обрабатываем чай с учётом его назначения. Оцените внешний вид сухого листа и вкус настоя, а затем испытайте образец в рецептуре напитка или в ассортименте для розницы.",
  proof: [["Семейное производство чая", "С 1995 года"], ["Переработка и место отгрузки", "Танлап, Хазянг, Вьетнам"], ["Офис и склад", "Шокшон, Ханой, Вьетнам"]],
  catalogue: "Четыре основных сорта для экспорта",
  catalogIntro: "Сравните мягкий и дымный чёрные чаи, свежий зелёный чай и зелёный чай с цветочным ароматом. Образцы каждого чая доступны по запросу.",
  supply: "Оптовые и экспортные поставки",
  steps: [
    ["Опишите задачу", "Укажите рынок сбыта, назначение чая, предполагаемый объём, упаковку и желаемые сроки."],
    ["Оцените образцы", "Согласуйте сорт и критерии оценки вкуса и аромата. Уточните требования к испытаниям и маркировке в стране назначения."],
    ["Согласуйте предложение", "Перед заказом подтвердите партию, массу нетто, документы, условия передачи товара и сроки."],
  ],
  bulk: "Оптовая упаковка", bulkText: "Мешки из ПП/ПЭ по 20, 30 или 35 кг в зависимости от формы листа и назначения чая.",
  exw: "Условия отгрузки", exwText: "EXW с чайной фабрики Hoàng Long в Танлапе, провинция Хазянг. Условия каждой поставки согласуются в коммерческом предложении или договоре.",
  documents: "Документы для покупателей", docsIntro: "Сведения о компании, основные сорта чая и перечень вопросов для подготовки заявки.",
  docTitle: "Профиль компании и экспортный каталог", pdf: "Скачать PDF", print: "Распечатать или сохранить PDF",
  checklist: "Что указать в запросе",
  checks: ["Страна назначения, канал сбыта и применение чая", "Вид чая, целевые характеристики и номер образца", "Планируемый объём, упаковка и график поставок", "Требования к маркировке, испытаниям и отгрузочным документам"],
  contact: "Связаться по вопросам экспорта", checkout: "Розничный магазин · на английском",
  imageAlt: "Листовой чай Hoàng Long",
};

export const internationalCopy = { en: english, ja: japanese, zh: chinese, ru: russian };

const translations = {
  "hong-tra-shan-mat": {
    ja: ["ハニー香のシャン紅茶", "はちみつやカラメルを思わせる香りと、まろやかな口当たり。"],
    zh: ["蜜香 Shan 红茶", "带有蜂蜜和焦糖香气，口感柔和。"],
    ru: ["Чёрный чай Шан с медовыми нотами", "Мягкий вкус с нотами мёда и карамели."],
  },
  "hong-tra-shan-khoi": {
    ja: ["スモーキーなシャン紅茶", "コクのある紅茶に、燻香、黒豆、木を思わせる香り。"],
    zh: ["烟香 Shan 红茶", "茶味醇厚，带有烟熏、黑豆和木质香气。"],
    ru: ["Дымный чёрный чай Шан", "Насыщенный чёрный чай с дымными и древесными нотами и оттенком чёрной фасоли."],
  },
  "luc-tra-shan-moc": {
    ja: ["シャン緑茶 Mộc", "すっきりとした味わいで、口当たりがやわらかく、渋みが穏やかです。"],
    zh: ["原味 Shan 绿茶 Mộc", "滋味清爽柔和，涩感温和。"],
    ru: ["Зелёный чай Шан Mộc", "Свежий, мягкий вкус без резкой терпкости."],
  },
  "luc-tra-ngoc-lan": {
    ja: ["モクレン香の緑茶", "乾燥したモクレンの花で香りを移した緑茶です。"],
    zh: ["玉兰花绿茶", "以干玉兰花窨制的绿茶，带有清雅花香。"],
    ru: ["Зелёный чай с ароматом магнолии", "Зелёный чай, ароматизированный сушёными цветами магнолии."],
  },
};

export function internationalProducts(language) {
  return CORE_EXPORT_PRODUCTS.map(product => ({
    ...product,
    title: language === "en" ? product.name.en : translations[product.id][language][0],
    summary: language === "en" ? product.description.en : translations[product.id][language][1],
  }));
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Globe2, Mountain } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fromVendorRow } from "@/lib/mappers";
import { CATEGORIES } from "@/lib/constants";
import { useLocale } from "@/components/i18n/LocaleProvider";
import styles from "./PublicLongform.module.css";
import PublicSiteHeader from "./PublicSiteHeader";

const COPY = {
  "vi": {
    "back": "Nhà Hoàng Long",
    "switcher": "EN",
    "eyebrow": "Nền tảng gia đình làm trà · từ 1995",
    "title": "Từ kinh nghiệm làm trà đến giá trị thương mại.",
    "intro": "Một sản phẩm trà mang theo đặc tính của vùng đất, cách người làm xử lý nguyên liệu và lựa chọn của thị trường. Hoàng Long phát triển từ kinh nghiệm làm trà của gia đình, với mong muốn đưa những yếu tố ấy vào một mối liên kết bền vững hơn.",
    "chapter": "Giữ bản sắc. Phát triển cách làm.",
    "body": [
      "Kinh nghiệm gia đình từ năm 1995 là điểm khởi đầu của câu chuyện Hoàng Long. Hiểu một loại trà cần nhiều hơn tên vùng: còn có thời điểm thu hái, chất lượng nguyên liệu và cách xử lý lá. Những khác biệt ấy cần được nhìn nhận khi chọn trà cho thưởng thức, pha chế hay phân phối.",
      "Nguồn nguyên liệu từ Hà Giang và Tây Bắc là nền tảng để Nhà phát triển các hướng sản phẩm. Công việc của Hoàng Long là kết nối việc lựa chọn nguyên liệu với chế biến tại Tân Lập, thử mẫu và yêu cầu thực tế của người mua. Nguồn gốc của từng sản phẩm được làm rõ khi chọn mẫu và xây dựng đơn hàng.",
      "Kinh nghiệm làm trà được tiếp nối cùng kỹ thuật chế biến, trong đó có hướng ứng dụng công nghệ hấp. Mục đích là tìm cách xử lý phù hợp với lá trà và sản phẩm mong muốn. Không có một phương pháp duy nhất cho mọi dòng trà; ngoại hình, hương, vị và hiệu quả pha phải được đánh giá cùng nhau.",
      "Khi một loại trà bước vào thương mại, câu chuyện xuất xứ cần đi cùng tiêu chuẩn sản phẩm, quy cách, kế hoạch sản lượng và trách nhiệm thực hiện. Đó là hướng Hoàng Long theo đuổi: giữ lại giá trị của nơi làm ra trà, đồng thời giúp đối tác có cơ sở cụ thể để lựa chọn, thử nghiệm và phát triển thị trường."
    ],
    "people": "Người làm trà & vùng nguyên liệu",
    "archive": "Ghi chép về trà & cách làm",
    "empty": "Những ghi chép của Nhà đang được chuẩn bị.",
    "read": "Đọc ghi chép",
    "close": "Trở lại ghi chép",
    "closing": "Đưa bản sắc nguồn trà vào một hướng phát triển dài hạn.",
    "tea": "Xem hồ sơ doanh nghiệp"
  },
  "en": {
    "back": "House of Hoàng Long",
    "switcher": "VI",
    "eyebrow": "A family tea-making foundation · since 1995",
    "title": "Tea-making experience. Commercial purpose.",
    "intro": "A tea carries the character of its origin, the choices made in processing and the expectations of its market. Hoàng Long draws on the family’s tea-making experience to build a closer connection between those elements.",
    "chapter": "Preserve character. Develop the approach.",
    "body": [
      "The family’s experience in tea since 1995 is the starting point of the Hoàng Long story. Understanding a tea takes more than a place name: season, raw-material quality and leaf handling all matter. These differences inform selection for tea drinking, beverage preparation and distribution.",
      "Raw materials from Hà Giang and Northwest Vietnam form the foundation of our product development. Hoàng Long connects raw-material selection with processing in Tân Lập, sampling and the buyer’s actual requirements. The origin relevant to each product is clarified during sample selection and order preparation.",
      "Tea-making experience develops alongside processing methods, including the application of steam processing. The purpose is to match the method to the leaf and the intended product. No single process suits every tea; appearance, aroma, taste and brewing performance need to be evaluated together.",
      "For a tea to work commercially, its origin story needs to be accompanied by product specifications, packing, volume planning and clear responsibilities. This is Hoàng Long’s direction: preserve the value of the tea’s source while giving partners a practical basis for selection, trials and market development."
    ],
    "people": "People & tea origins",
    "archive": "Notes on tea & practice",
    "empty": "The house record is being prepared.",
    "read": "Read the record",
    "close": "Return to the record",
    "closing": "Bring the character of a tea origin into long-term development.",
    "tea": "Explore the company profile"
  }
};

export default function HouseStory(){
  const {locale:lang,toggleLocale}=useLocale(); const [home,setHome]=useState(null); const [vendors,setVendors]=useState([]); const [articles,setArticles]=useState([]); const [active,setActive]=useState(null);
  const supabase=useMemo(()=>createClient(),[]); const t=COPY[lang]; const local=(v)=>v?.[lang]||v?.en||v?.vi||"";
  useEffect(()=>{let live=true;Promise.all([supabase.from("settings_home").select("*").eq("id",1).maybeSingle(),supabase.rpc("list_public_vendors"),supabase.from("wiki_articles").select("*").neq("category","brandkit")]).then(([h,v,a])=>{if(!live)return;if(!h.error)setHome(h.data);if(!v.error)setVendors((v.data||[]).map(fromVendorRow));if(!a.error)setArticles(a.data||[])});return()=>{live=false}},[supabase]);
  const activeArticle=articles.find(a=>a.id===active); const category=(id)=>CATEGORIES.find(c=>c.id===id)?.label?.[lang]||id;
  if(activeArticle)return <main className={styles.reader}><header><button onClick={()=>setActive(null)}><ArrowLeft size={17}/>{t.close}</button><button onClick={toggleLocale}><Globe2 size={15}/>{t.switcher}</button></header><article><p>{category(activeArticle.category)}</p><h1>{local(activeArticle.title)}</h1><div>{local(activeArticle.body)}</div></article></main>;
  return <main className={styles.page}>
    <PublicSiteHeader/>
    <section className={styles.storyHero}><div><p>{t.eyebrow}</p><h1>{t.title}</h1><p>{t.intro}</p></div><figure><img src={home?.featured_photos?.[0]||"/landing/1.jpg"} alt={lang==="vi"?"Nguồn trà trong thư viện ảnh Hoàng Long":"Tea origin from the Hoàng Long archive"}/><figcaption>Hà Giang · Việt Nam</figcaption></figure></section>

    <section className={styles.chapter}><div><Mountain size={21}/><h2>{t.chapter}</h2></div><div>{t.body.map((p,i)=><p key={i}>{p}</p>)}</div></section>
    {(home?.producer_name||vendors.length>0)&&<section className={styles.people}><header><h2>{t.people}</h2></header>{home?.producer_name&&<article className={styles.producer}><figure><img src={home.producer_photo||"/landing/2.jpg"} alt={home.producer_name}/></figure><div>{local(home.producer_quote)&&<blockquote>“{local(home.producer_quote)}”</blockquote>}<h3>{home.producer_name}</h3><p>{local(home.producer_role)}</p></div></article>}<div className={styles.vendorGrid}>{vendors.map(v=><article key={v.id}>{v.photo&&<img src={v.photo} alt={v.name}/>}<span>{v.region}</span><h3>{v.name}</h3><p>{local(v.story)}</p></article>)}</div></section>}
    <section className={styles.archive}><header><h2>{t.archive}</h2><p>{articles.length?`${articles.length} ${lang==="vi"?"ghi chép đang mở":"records available"}`:t.empty}</p></header><div>{articles.map((a,i)=><button key={a.id} onClick={()=>setActive(a.id)}><span>{String(i+1).padStart(2,"0")}</span><span><small>{category(a.category)}</small><b>{local(a.title)}</b></span><span>{t.read}<ArrowRight size={16}/></span></button>)}</div></section>
    <footer className={styles.longFooter}><p>{t.closing}</p><Link href={`/company?lang=${lang}`}>{t.tea}<ArrowRight size={17}/></Link></footer>
  </main>
}

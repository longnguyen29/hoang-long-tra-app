"use client";

import { useMemo, useState } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import {
  MENU_LAB_CHARACTERS,
  MENU_LAB_TRIALS,
  MENU_LAB_USES,
  recommendMenuLab,
} from "@/lib/menu-lab";
import styles from "./MenuLab.module.css";

const STR = {
  vi: {
    eyebrow: "Menu Lab · từ trà đến công thức",
    title: "Bắt đầu từ món quán muốn bán.",
    intro: "Chọn cấu trúc món và vị cần đạt. Hệ thống sẽ ghép với trà Hoàng Long đang có, đưa ra một tỷ lệ pha đầu tiên và ước tính chi phí trà khô trên mỗi ly.",
    useLegend: "Quán đang muốn làm món gì?",
    characterLegend: "Muốn vị trà đi theo hướng nào?",
    cupLegend: "Cỡ ly dự kiến",
    trialLegend: "Lần thử này cần đi đến đâu?",
    resultLabel: "Nền trà nên thử trước",
    recipeLabel: "Bản pha tham chiếu",
    dose: "Trà khô",
    water: "Nước ủ",
    temperature: "Nhiệt độ",
    time: "Thời gian",
    teaCost: "Trà khô / ly",
    cups: "ly ước tính / kg",
    loadingPrice: "Đang đọc giá…",
    missingPrice: "Chưa có giá/kg",
    costNote: "Chỉ tính trà khô theo giá đang lưu trong danh mục; chưa gồm sữa, trái cây, syrup, đá và hao hụt.",
    honestNote: "Đây là điểm bắt đầu để nếm và hiệu chỉnh tại quán, không phải công thức đã được duyệt.",
    accept: "Chọn bộ thử",
    skip: "Bỏ qua gợi ý",
  },
  en: {
    eyebrow: "Menu Lab · from tea to recipe",
    title: "Start with the drink you want to sell.",
    intro: "Choose the drink structure and the tea character you need. The system matches them to an available Hoàng Long tea, a first brew ratio and the dry-tea cost per cup.",
    useLegend: "What are you trying to make?",
    characterLegend: "What should the tea taste like?",
    cupLegend: "Expected cup size",
    trialLegend: "How far should this test go?",
    resultLabel: "Tea to test first",
    recipeLabel: "Reference recipe",
    dose: "Dry tea",
    water: "Brew water",
    temperature: "Temperature",
    time: "Steep time",
    teaCost: "Dry tea / cup",
    cups: "estimated cups / kg",
    loadingPrice: "Reading price…",
    missingPrice: "No price/kg yet",
    costNote: "Dry tea only, using the current catalogue price. Milk, fruit, syrup, ice and waste are not included.",
    honestNote: "This is a starting point for tasting and calibration at your bar, not an approved finished recipe.",
    accept: "Choose test set",
    skip: "Skip suggestion",
  },
};

const money = (amount) => `${amount.toLocaleString("vi-VN")}đ`;

function duration(seconds, lang) {
  if (seconds >= 3600) return lang === "vi" ? `${Math.round(seconds / 3600)} giờ` : `${Math.round(seconds / 3600)} hr`;
  return lang === "vi" ? `${Math.round(seconds / 60)} phút` : `${Math.round(seconds / 60)} min`;
}

function OptionGroup({ legend, name, options, value, onChange, className = "" }) {
  return (
    <fieldset className={`${styles.group} ${className}`}>
      <legend>{legend}</legend>
      <div>
        {options.map((item) => (
          <label key={item.id} data-selected={value === item.id}>
            <input type="radio" name={name} value={item.id} checked={value === item.id}
              onChange={() => onChange(item.id)} />
            <span aria-hidden="true" />
            <strong>{item.label}</strong>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function MenuLab({ lang = "vi", products = [], catalogStatus = "loading", onAccept, onSkip }) {
  const t = STR[lang] || STR.vi;
  const [useCase, setUseCase] = useState("milk");
  const [character, setCharacter] = useState("strong");
  const [cupMl, setCupMl] = useState(500);
  const [trial, setTrial] = useState("refine");
  const result = useMemo(
    () => recommendMenuLab({ useCase, character, cupMl, trial }, products, lang),
    [character, cupMl, lang, products, trial, useCase],
  );

  const localize = (items) => items.map((item) => ({ ...item, label: item.label[lang] || item.label.vi }));
  const cost = catalogStatus === "loading" ? t.loadingPrice : result.teaCost ? money(result.teaCost) : t.missingPrice;

  return (
    <section className={styles.lab} aria-labelledby="menu-lab-title">
      <header className={styles.heading}>
        <p>{t.eyebrow}</p>
        <h2 id="menu-lab-title">{t.title}</h2>
        <span>{t.intro}</span>
      </header>

      <div className={styles.controls}>
        <OptionGroup legend={t.useLegend} name="menu-use" options={localize(MENU_LAB_USES)} value={useCase} onChange={setUseCase} />
        <OptionGroup legend={t.characterLegend} name="menu-character" options={localize(MENU_LAB_CHARACTERS)} value={character} onChange={setCharacter} />
        <OptionGroup className={styles.compact} legend={t.cupLegend} name="menu-cup"
          options={[350, 500, 700].map((size) => ({ id: size, label: `${size} ml` }))} value={cupMl} onChange={setCupMl} />
        <OptionGroup legend={t.trialLegend} name="menu-trial" options={localize(MENU_LAB_TRIALS)} value={trial} onChange={setTrial} />
      </div>

      <section className={styles.result} aria-live="polite" aria-busy={catalogStatus === "loading"}>
        <div className={styles.resultHeading}>
          <FlaskConical aria-hidden="true" />
          <div><span>{t.resultLabel}</span><h3>{result.teaName}</h3><p>{result.reason}</p></div>
        </div>
        <div className={styles.recipeLine}><span>{t.recipeLabel}</span><strong>{result.recipeName}</strong></div>
        <dl className={styles.metrics}>
          <div><dt>{t.dose}</dt><dd>{result.teaDoseG} g</dd></div>
          <div><dt>{t.water}</dt><dd>{result.waterMl} ml</dd></div>
          <div><dt>{t.temperature}</dt><dd>{result.temperatureC}°C</dd></div>
          <div><dt>{t.time}</dt><dd>{duration(result.brewSeconds, lang)}</dd></div>
          <div data-state={catalogStatus}><dt>{t.teaCost}</dt><dd>{cost}</dd></div>
          <div><dt>{t.cups}</dt><dd>≈ {result.estimatedCupsPerKg}</dd></div>
        </dl>
        <p className={styles.costNote}>{t.costNote}</p>
        <p className={styles.honestNote}>{t.honestNote}</p>
        <div className={styles.actions}>
          <button className={styles.accept} type="button" onClick={() => onAccept(result)}>{t.accept}<ArrowRight aria-hidden="true" /></button>
          <button className={styles.skip} type="button" onClick={onSkip}>{t.skip}</button>
        </div>
      </section>
    </section>
  );
}

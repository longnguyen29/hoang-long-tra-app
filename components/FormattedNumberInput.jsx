"use client";

const normalize = (value, decimal) => {
  const source = String(value ?? "").replaceAll(",", "");
  if (!decimal) return source.replace(/\D/g, "");
  const [whole = "", ...fractions] = source.split(".");
  const integer = whole.replace(/\D/g, "");
  const fraction = fractions.join("").replace(/\D/g, "");
  return source.includes(".") ? `${integer}.${fraction}` : integer;
};

export const formatNumberEntry = (value) => {
  const source = String(value ?? "").replaceAll(",", "");
  if (!source) return "";
  const [whole = "", ...fractionParts] = source.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return source.includes(".") ? `${grouped}.${fractionParts.join("")}` : grouped;
};

export default function FormattedNumberInput({ value, onChange, step, min, max, inputMode, ...props }) {
  const decimal = String(step || "").includes(".");
  return (
    <input
      {...props}
      type="text"
      inputMode={inputMode || (decimal ? "decimal" : "numeric")}
      value={formatNumberEntry(value)}
      data-min={min}
      data-max={max}
      data-step={step}
      aria-valuemin={min}
      aria-valuemax={max}
      onChange={(event) => {
        const next = normalize(event.target.value, decimal);
        onChange?.({ target: { value: next, name: event.target.name }, currentTarget: { value: next, name: event.target.name } });
      }}
    />
  );
}

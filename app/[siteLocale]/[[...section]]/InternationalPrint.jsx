"use client";

export default function InternationalPrint({ label, className }) {
  return <button type="button" className={className} onClick={() => window.print()}>{label}</button>;
}

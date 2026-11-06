export default function AdminLoading() {
  return <main aria-live="polite" aria-busy="true" style={{ padding: "clamp(24px, 4vw, 48px)" }}>
    <p style={{ fontSize: 14, opacity: 0.7 }}>Đang mở mục công việc…</p>
  </main>;
}

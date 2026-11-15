import Link from "next/link";

export default function WorkspaceUnavailablePage() {
  return <main className="hl-admin-state">
    <section>
      <h1>Chưa tải được quyền truy cập.</h1>
      <Link className="hl-button hl-button--primary" href="/admin">Thử lại</Link>
    </section>
  </main>;
}

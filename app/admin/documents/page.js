import Link from "next/link";
import CompanyDocuments from "@/components/staff/CompanyDocuments";
import { createClient } from "@/lib/supabase/server";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";
import { getCompanyDocumentsContext } from "@/lib/company-documents-server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tài liệu công ty | Hoàng Long",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export default async function CompanyDocumentsPage({ searchParams }) {
  const context = await getCompanyDocumentsContext(await createClient(), { partnersEnabled: partnerNetworkEnabled() });
  if (context.access !== "allowed") return <main className="hl-admin-state" data-no-translate>
    <h1>{context.access === "signed_out" ? "Đăng nhập để soạn tài liệu" : context.access === "error" ? "Chưa kiểm tra được quyền truy cập" : "Tài liệu dành cho quản lý"}</h1>
    <p>{context.access === "error" ? "Hãy tải lại trang. Không có dữ liệu đối tác được hiển thị khi chưa xác nhận quyền." : "Dùng tài khoản quản lý / admin Hoàng Long đã xác nhận email."}</p>
    <Link href={context.access === "error" ? "/admin/documents" : "/admin/login"}>{context.access === "error" ? "Thử lại" : "Đăng nhập"}</Link>
  </main>;
  const query = await searchParams;
  const initialPartner = typeof query?.partner === "string" && /^[0-9a-f-]{36}$/i.test(query.partner) ? query.partner : "";
  return <CompanyDocuments partners={context.partners} initialPartner={initialPartner}
    partnersUnavailable={context.partnersUnavailable} partnersTruncated={context.partnersTruncated} />;
}

import Link from "next/link";
import CompanyDocuments from "@/components/staff/CompanyDocuments";
import { createClient } from "@/lib/supabase/server";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";
import { getCompanyDocumentsContext } from "@/lib/company-documents-server";

import { TEA_ORDER_DOCUMENTS, prefillTeaOrderDocument } from "@/lib/tea-document-order";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tài liệu công ty | Hoàng Long",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export default async function CompanyDocumentsPage({ searchParams }) {
  const supabase = await createClient();
  const context = await getCompanyDocumentsContext(supabase, { partnersEnabled: partnerNetworkEnabled() });
  if (context.access !== "allowed") return <main className="hl-admin-state" data-no-translate>
    <h1>{context.access === "signed_out" ? "Đăng nhập để soạn tài liệu" : context.access === "error" ? "Chưa kiểm tra được quyền truy cập" : "Tài liệu dành cho quản lý"}</h1>
    <p>{context.access === "error" ? "Hãy tải lại trang. Không có dữ liệu đối tác được hiển thị khi chưa xác nhận quyền." : "Dùng tài khoản quản lý / admin Hoàng Long đã xác nhận email."}</p>
    <Link href={context.access === "error" ? "/admin/documents" : "/admin/login"}>{context.access === "error" ? "Thử lại" : "Đăng nhập"}</Link>
  </main>;
  // Read-only manager RLS query; document preparation must never synchronize orders.
  if (context.partners.length) {
    const {data,error} = await supabase.from("partner_network_classic_agreements").select("partner_id,version,effective_at,first_rate,repeat_rate,monthly_bonus_multiplier").lte("effective_at",new Date().toISOString()).order("effective_at",{ascending:false}).order("version",{ascending:false});
    if (error) { context.partnersUnavailable = true; context.partners = []; }
    else context.partners = context.partners.map(partner => ({...partner,classic_agreement:data?.find(row => row.partner_id === partner.id) || null}));
  }
  const query = await searchParams;
  const initialPartner = typeof query?.partner === "string" && /^[0-9a-f-]{36}$/i.test(query.partner) ? query.partner : "";
  const initialTemplate = TEA_ORDER_DOCUMENTS.includes(query?.template) ? query.template : "partner_agreement";
  const orderId = typeof query?.order === "string" && /^[a-z0-9._-]{1,160}$/i.test(query.order) ? query.order : "";
  let orderFields = {};
  if (initialTemplate !== "partner_agreement" && orderId) {
    const columns = initialTemplate === "tea_order_confirmation"
      ? "id,customer_name,address,lines,estimated_total,payment_method"
      : "id,lines";
    const { data } = await supabase.from("orders").select(columns).eq("id", orderId).maybeSingle();
    orderFields = prefillTeaOrderDocument(initialTemplate, data);
  }
  return <CompanyDocuments key={JSON.stringify([initialTemplate, orderId, initialPartner])}
    initialTemplate={initialTemplate} orderFields={orderFields} orderUnavailable={Boolean(orderId && initialTemplate !== "partner_agreement" && !orderFields.tea_order_ref)}
    partners={context.partners} initialPartner={initialPartner}
    partnersUnavailable={context.partnersUnavailable} partnersTruncated={context.partnersTruncated} />;
}

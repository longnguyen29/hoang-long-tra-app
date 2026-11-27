import Link from "next/link";
import DocumentApprovals from "@/components/staff/DocumentApprovals";
import CompanyDocuments from "@/components/staff/CompanyDocuments";
import B2BDocumentSession, { B2BSellingEntities } from "@/components/staff/B2BDocumentSession";
import { createClient } from "@/lib/supabase/server";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";
import { getCompanyDocumentsContext } from "@/lib/company-documents-server";

import { TEA_ORDER_DOCUMENTS, prefillTeaOrderDocument } from "@/lib/tea-document-order";
import { b2bData, readB2BContext, validKind, validRecordId, validSeller } from "@/lib/b2b-workflow-server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Tài liệu công ty | Hoàng Long",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export default async function CompanyDocumentsPage({ searchParams }) {
  const query = await searchParams;
  const supabase = await createClient();
  const context = await getCompanyDocumentsContext(supabase, { partnersEnabled: !query?.b2b && partnerNetworkEnabled() });
  if (context.access !== "allowed") return <main className="hl-admin-state" data-no-translate>
    <h1>{context.access === "signed_out" ? "Đăng nhập để soạn tài liệu" : context.access === "error" ? "Chưa kiểm tra được quyền truy cập" : "Tài liệu dành cho quản lý"}</h1>
    <p>{context.access === "error" ? "Hãy tải lại trang. Không có dữ liệu đối tác được hiển thị khi chưa xác nhận quyền." : "Dùng tài khoản quản lý / admin Hoàng Long đã xác nhận email."}</p>
    <Link href={context.access === "error" ? "/admin/documents" : "/admin/login"}>{context.access === "error" ? "Thử lại" : "Đăng nhập"}</Link>
  </main>;
  if (query?.sign === "1") return <DocumentApprovals
    orderId={validRecordId(query.order)?query.order:""}
    sellerId={validSeller(query.seller)?query.seller:""}/>;
  if (query?.b2b) {
    try {
      const { data: authorized, error } = await supabase.rpc("b2b_current_document_manager");
      if (error || !authorized) throw new Error("b2b_access_unavailable");
      if (query.b2b === "entities") {
        const sellers = await b2bData(supabase.from("b2b_selling_entities").select("id,label,details").order("label"));
        return <B2BSellingEntities sellers={sellers} />;
      }
      const orderId = validRecordId(query.order) ? query.order : null;
      const customerId = !orderId && validRecordId(query.customer) ? query.customer : null;
      if (validKind(query.b2b) && (orderId || (query.b2b === "framework" && customerId))) {
        const b2b = await readB2BContext(supabase, { orderId, customerId });
        if (b2b && (query.b2b === "framework" ? b2b.customer?.is_b2b || b2b.frameworks?.length : b2b.workflow)) {
          const sellerId = validSeller(query.seller) ? query.seller : null;
          return <B2BDocumentSession key={JSON.stringify([orderId, customerId, query.b2b, sellerId])} context={b2b} kind={query.b2b} requestedSeller={sellerId} />;
        }
      }
    } catch {
      return <main className="hl-admin-state" data-no-translate><h1>Chưa mở được tài liệu B2B</h1>
        <p>Kiểm tra quyền Tài liệu công ty hoặc thử tải lại trang.</p><Link href="/admin/documents">Về tài liệu công ty</Link></main>;
    }
    return <main className="hl-admin-state" data-no-translate><h1>Không tìm thấy hồ sơ B2B</h1>
      <Link href="/admin/pipeline">Về khách hàng</Link></main>;
  }
  // Read-only manager RLS query; document preparation must never synchronize orders.
  if (context.partners.length) {
    const {data,error} = await supabase.from("partner_network_classic_agreements").select("partner_id,version,effective_at,first_rate,repeat_rate,monthly_bonus_multiplier").lte("effective_at",new Date().toISOString()).order("effective_at",{ascending:false}).order("version",{ascending:false});
    if (error) { context.partnersUnavailable = true; context.partners = []; }
    else context.partners = context.partners.map(partner => ({...partner,classic_agreement:data?.find(row => row.partner_id === partner.id) || null}));
  }
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

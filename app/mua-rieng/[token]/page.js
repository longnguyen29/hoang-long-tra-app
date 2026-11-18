import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { validPrivateId } from "@/lib/private-order";
import PrivateCheckout from "./PrivateCheckout";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Đặt trà riêng | Nhà Hoàng Long",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function PrivateOrderPage({ params }) {
  const { token } = await params;
  if (!validPrivateId(token)) notFound();
  const { data, error } = await createAdminClient().from("private_order_pages")
    .select("customer_name,items,revision").eq("token", token).eq("active", true).maybeSingle();
  if (error) throw new Error("Could not load private order page");
  if (!data) notFound();
  return <PrivateCheckout token={token} name={data.customer_name} revision={data.revision}
    items={data.items.map(({ id, name, weight, unit, price }) => ({ id, name, weight, unit, price }))}/>;
}

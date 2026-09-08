"use client";
import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";
export default function PolicyLinks() {
 const { locale } = useLocale();
 const vi = locale === "vi";
 return <nav aria-label={vi ? "Chính sách mua hàng" : "Purchase policies"} style={{display:"flex",flexWrap:"wrap",gap:"8px 20px",fontSize:14,lineHeight:1.6,marginTop:12}}>
  <Link style={{display:"inline-flex",alignItems:"center",minHeight:44,maxWidth:"100%",whiteSpace:"normal"}} href="/terms">{vi ? "Điều khoản mua hàng" : "Purchase terms (Vietnamese)"}</Link>
  <Link style={{display:"inline-flex",alignItems:"center",minHeight:44,maxWidth:"100%",whiteSpace:"normal"}} href="/shipping">{vi ? "Thanh toán & giao nhận" : "Payment & delivery (Vietnamese)"}</Link>
  <Link style={{display:"inline-flex",alignItems:"center",minHeight:44,maxWidth:"100%",whiteSpace:"normal"}} href="/returns">{vi ? "Đổi trả & hoàn tiền" : "Returns & refunds (Vietnamese)"}</Link>
 </nav>;
}

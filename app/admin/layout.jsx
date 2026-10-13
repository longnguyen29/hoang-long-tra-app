import StaffShell from "@/components/staff/StaffShell";
import { partnerNetworkEnabled } from "@/lib/partner-network-server";
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }) {
  return <StaffShell partnerNetworkEnabled={partnerNetworkEnabled()}>{children}</StaffShell>;
}

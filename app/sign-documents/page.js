import DocumentApprovals from "@/components/staff/DocumentApprovals";

export const metadata = {
  title: "Hồ sơ chờ ký | Hoàng Long",
  robots: { index: false, follow: false },
  referrer: "same-origin",
};

export default function AssignedDocumentApprovals() {
  return <DocumentApprovals signOnly/>;
}

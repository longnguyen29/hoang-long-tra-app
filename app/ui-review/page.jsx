import StaffShell from "@/components/staff/StaffShell";
import { notFound } from "next/navigation";
import StaffReview from "@/components/staff/StaffReview";
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <StaffShell><StaffReview/></StaffShell>;
}

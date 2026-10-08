import { notFound } from "next/navigation";
import StaffShell from "@/components/staff/StaffShell";
import KnowledgeReview from "@/components/staff/KnowledgeReview";

export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <StaffShell><KnowledgeReview/></StaffShell>;
}

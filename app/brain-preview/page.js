import { notFound } from "next/navigation";
import BrainConsole from "@/components/BrainConsole";
import { brainDemoData } from "@/lib/demo/brain";

// Local review surface only. This private server variable is not exposed to the browser and
// is intentionally absent from Vercel. The real /brain route always keeps staff auth.
export const dynamic = "force-dynamic";

export default function BrainPreviewPage() {
  if (process.env.BRAIN_LOCAL_PREVIEW !== "true") notFound();
  return <BrainConsole initialData={brainDemoData} staffEmail="local-preview@hoanglong" loadWarning=""/>;
}

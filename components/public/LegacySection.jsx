"use client";

import TeaConsole from "@/components/TeaConsole";
import IdleScreen from "@/components/IdleScreen";

export default function LegacySection({ section }) {
  return <><TeaConsole isAdmin={false} initialSection={section}/><IdleScreen/></>;
}

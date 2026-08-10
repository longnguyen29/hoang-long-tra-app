import TeaConsole from "@/components/TeaConsole";
import IdleScreen from "@/components/IdleScreen";

export default function HomePage() {
  return (
    <>
      <TeaConsole isAdmin={false} />
      {/* Public site only — deliberately not mounted on /admin, where it would interrupt
          staff reviewing orders every thirty seconds. */}
      <IdleScreen />
    </>
  );
}

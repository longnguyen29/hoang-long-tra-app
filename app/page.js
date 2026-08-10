import TeaConsole from "@/components/TeaConsole";
import IdleScreen from "@/components/IdleScreen";

export default function HomePage() {
  return (
    <>
      <TeaConsole isAdmin={false} />
      {/* Inert unless the device has been put into kiosk mode with ?kiosk=1 */}
      <IdleScreen />
    </>
  );
}

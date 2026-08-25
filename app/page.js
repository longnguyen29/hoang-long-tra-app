import HouseHome from "@/components/public/HouseHome";
import IdleScreen from "@/components/IdleScreen";

export default function HomePage() {
  return (
    <>
      <HouseHome />
      {/* Public site only — deliberately not mounted on /admin, where it would interrupt
          staff reviewing orders every thirty seconds. */}
      <IdleScreen />
    </>
  );
}

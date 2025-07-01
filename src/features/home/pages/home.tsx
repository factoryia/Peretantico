import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { FiltersSection } from "../components/filters-section";
import { RequestsTable } from "../components/requests-table";

export function Home() {
  return (
    <div className="pt-[65px] overflow-y-auto h-full">
      <SidebarHeader title="Gestión de solicitudes" />
      <div className="space-y-6 p-5">
        <FiltersSection />
        <RequestsTable />
      </div>
    </div>
  );
}

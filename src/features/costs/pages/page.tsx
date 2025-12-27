import { SidebarHeader } from "@/components/navigation/sidebar-header";
import CostManagementPage from "../components/cost-page";

function CostPage() {
  return (
    <div className="h-full flex flex-col">
      <SidebarHeader title="Costos" />
      <div className="flex-1 overflow-y-auto p-4 md:px-6">
        <CostManagementPage />
      </div>
    </div>
  );
}

export default CostPage;

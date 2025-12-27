import { SidebarHeader } from "@/components/navigation/sidebar-header";
import CustomerManagementPage from "../components/customer-page";

function Client() {
  return (
    <div className="h-full flex flex-col">
      <SidebarHeader title="Clientes" />
      <div className="flex-1 overflow-y-auto p-4 md:px-6">
        <CustomerManagementPage />
      </div>
    </div>
  );
}

export default Client;

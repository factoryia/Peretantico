import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { useState } from "react";
import { ConfigSidebar } from "../components/config-sidebar";
import { CategoriesTab } from "../components/categories-tab";
import { SubservicesTab } from "../components/services/subservices-tab";
import { ServicesTab } from "../components/services-tab";

export function Configuration() {
  const [activeSection, setActiveSection] = useState("categorias");

  const renderContent = () => {
    switch (activeSection) {
      case "categorias":
        return <CategoriesTab />;
      case "servicios":
        return <ServicesTab />;
      case "subservicios":
        return <SubservicesTab />;
      default:
        return <CategoriesTab />;
    }
  };

  return (
    <div className="h-full pt-[65px]">
      <SidebarHeader title="Configuración" />
      <div className="flex flex-1 overflow-hidden h-full">
        <ConfigSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <div className="flex-1 overflow-y-auto p-4 md:px-6">{renderContent()}</div>
      </div>
    </div>
  );
}

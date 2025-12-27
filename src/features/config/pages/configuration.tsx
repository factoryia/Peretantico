import { useState } from "react";
import { SidebarHeader } from "@/components/navigation/sidebar-header";
import { ConfigSidebar } from "@/features/config/components/config-sidebar";
import { CategoriesTab } from "@/features/config/components/categories-tab";
import { SubservicesTab } from "@/features/config/components/services/subservices-tab";
import { ServicesTab } from "@/features/config/components/services-tab";
import { SpecialDatesTab } from "../components/dates/especial-dates-tab";
import { ConfigMobileTabs } from "../components/config-mobile-tabs";

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
      case "fechas":
        return <SpecialDatesTab />;
      default:
        return <CategoriesTab />;
    }
  };

  return (
    <div className="h-dvh">
      <SidebarHeader title="Configuración" />
      {/* Desktop view */}
      <div className="hidden lg:flex flex-1 overflow-hidden h-full">
        <ConfigSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <div className="flex-1 overflow-y-auto p-4 md:px-6">
          {renderContent()}
        </div>
      </div>

      {/* Mobile view */}
      <div className="block lg:hidden h-full overflow-y-auto p-4 md:px-6">
        <ConfigMobileTabs />
      </div>
    </div>
  );
}

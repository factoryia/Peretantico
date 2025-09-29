import { SidebarHeader } from "@/components/navigation/sidebar-header";


function Costs() {
  return (
    <div className="h-full pt-[65px] flex flex-col">
      <SidebarHeader title="Clientes" />
      <div className="flex-1 overflow-y-auto p-4 md:px-6">
        <h1>Costos</h1>
        <p>Hola</p>
      </div>
    </div>
  );
}

export default Costs;
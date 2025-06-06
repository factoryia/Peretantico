import { FiltersSection } from "../components/filters-section";
import { RequestsTable } from "../components/requests-table";

export function Home() {
  return (
    <div className="space-y-6">
      <FiltersSection />
      <RequestsTable />
    </div>
  )
}

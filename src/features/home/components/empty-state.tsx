import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Plus } from "lucide-react"

interface EmptyStateProps {
  title?: string
  description?: string
  showRefreshButton?: boolean
  showCreateButton?: boolean
  onRefresh?: () => void
  onCreateNew?: () => void
}

export function EmptyState({
  title = "No se encontraron resultados",
  description = "No hay solicitudes que coincidan con los filtros aplicados",
  showCreateButton = true,
  onCreateNew
}: EmptyStateProps) {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <CardTitle className="text-xl text-gray-600">{title}</CardTitle>
        <CardDescription className="text-gray-500">{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
        
          {showCreateButton && onCreateNew && (
            <Button
              onClick={onCreateNew}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Crear Solicitud
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}



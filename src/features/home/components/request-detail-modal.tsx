import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Star, 
  User, 
  Truck, 
  Package, 
  FileText,
  X
} from "lucide-react";
import type { Request } from "../types/request";

// Interfaces para los tipos de entidades
interface ProfileInfo {
  name: string;
  email: string;
  phone: string;
  documentNumber: string;
  address: string;
}

interface DistributorInfo {
  name: string;
  email: string;
  phone: string;
  documentNumber: string;
  vehicle: string;
  status: string;
}

interface TaxonomyInfo {
  name: string;
  description: string;
}

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: Request | null;
  included?: Array<{
    id: string;
    type: string;
    attributes: {
      name?: string;
      title?: string;
      [key: string]: any;
    };
  }>;
}

export function RequestDetailModal({
  isOpen,
  onClose,
  request,
  included,
}: RequestDetailModalProps) {



  if (!request) return null;

  // Función helper para extraer email de atributos
  const extractEmail = (attributes: any) => {
    if (!attributes) return "Sin email";
    
    // Debug: mostrar todos los atributos disponibles
    console.log('=== EXTRACTING EMAIL ===');
    console.log('Atributos disponibles para email:', Object.keys(attributes));
    console.log('Valores de atributos:', attributes);
    
    // Buscar en campos específicos primero
    const emailFields = [
      'field_email',
      'email', 
      'mail',
      'correo',
      'field_mail',
      'field_correo',
      'field_correo_electronico',
      'correo_electronico',
      'field_correo_electronico_cliente',
      'field_email_cliente',
      'field_mail_cliente',
      'field_correo_cliente',
      'field_email_solicitante',
      'field_mail_solicitante',
      'field_correo_solicitante'
    ];
    
    console.log('Buscando en campos específicos:', emailFields);
    
    for (const field of emailFields) {
      console.log(`Verificando campo: ${field} = ${attributes[field]}`);
      if (attributes[field] && typeof attributes[field] === 'string' && attributes[field].trim()) {
        console.log(`✅ Email encontrado en campo: ${field} = ${attributes[field]}`);
        return attributes[field].trim();
      }
    }
    
    // Si no se encuentra, buscar en todos los atributos que contengan 'email'
    const allAttributes = Object.keys(attributes);
    const emailLikeFields = allAttributes.filter(attr => 
      attr.toLowerCase().includes('email') || 
      attr.toLowerCase().includes('mail') ||
      attr.toLowerCase().includes('correo') ||
      attr.toLowerCase().includes('cliente') ||
      attr.toLowerCase().includes('solicitante')
    );
    
    console.log('Campos similares a email encontrados:', emailLikeFields);
    
    for (const field of emailLikeFields) {
      console.log(`Verificando campo similar: ${field} = ${attributes[field]}`);
      if (attributes[field] && typeof attributes[field] === 'string' && attributes[field].trim()) {
        console.log(`✅ Email encontrado en campo similar: ${field} = ${attributes[field]}`);
        return attributes[field].trim();
      }
    }
    
    console.log('❌ No se encontró email en ningún campo');
    console.log('=== END EXTRACTING EMAIL ===');
    return "Sin email";
  };

  // Función helper para extraer teléfono de atributos
  const extractPhone = (attributes: any) => {
    if (!attributes) return "Sin teléfono";
    
    // Debug: mostrar todos los atributos disponibles
    console.log('=== EXTRACTING PHONE ===');
    console.log('Atributos disponibles para teléfono:', Object.keys(attributes));
    console.log('Valores de atributos:', attributes);
    
    // Buscar en campos específicos primero
    const phoneFields = [
      'field_phone',
      'phone',
      'telephone',
      'telefono',
      'field_telephone',
      'field_telefono',
      'mobile',
      'celular',
      'field_mobile',
      'field_celular',
      'field_celular_contacto',
      'celular_contacto',
      'field_telefono_cliente',
      'field_phone_cliente',
      'field_mobile_cliente',
      'field_celular_cliente',
      'field_telefono_solicitante',
      'field_phone_solicitante',
      'field_mobile_solicitante',
      'field_celular_solicitante'
    ];
    
    console.log('Buscando en campos específicos:', phoneFields);
    
    for (const field of phoneFields) {
      console.log(`Verificando campo: ${field} = ${attributes[field]}`);
      if (attributes[field] && typeof attributes[field] === 'string' && attributes[field].trim()) {
        console.log(`✅ Teléfono encontrado en campo: ${field} = ${attributes[field]}`);
        return attributes[field].trim();
      }
    }
    
    // Si no se encuentra, buscar en todos los atributos que contengan 'phone' o 'telefono'
    const allAttributes = Object.keys(attributes);
    const phoneLikeFields = allAttributes.filter(attr => 
      attr.toLowerCase().includes('phone') || 
      attr.toLowerCase().includes('telephone') ||
      attr.toLowerCase().includes('telefono') ||
      attr.toLowerCase().includes('mobile') ||
      attr.toLowerCase().includes('celular') ||
      attr.toLowerCase().includes('cliente') ||
      attr.toLowerCase().includes('solicitante')
    );
    
    console.log('Campos similares a teléfono encontrados:', phoneLikeFields);
    
    for (const field of phoneLikeFields) {
      console.log(`Verificando campo similar: ${field} = ${attributes[field]}`);
      if (attributes[field] && typeof attributes[field] === 'string' && attributes[field].trim()) {
        console.log(`✅ Teléfono encontrado en campo similar: ${field} = ${attributes[field]}`);
        return attributes[field].trim();
      }
    }
    
    console.log('❌ No se encontró teléfono en ningún campo');
    console.log('=== END EXTRACTING PHONE ===');
    return "Sin teléfono";
  };

  // Función helper para obtener información completa de entidades relacionadas
  const getIncludedEntityInfo = (entityId: string, entityType: string): ProfileInfo | DistributorInfo | TaxonomyInfo | null => {
    if (!included || !entityId) {
      console.log(`No hay included data o entityId para ${entityType}:`, { included, entityId });
      return null;
    }
    
    const entity = included.find(
      (item) => item.id === entityId && item.type === entityType
    );
    
    if (!entity) {
      console.log(`No se encontró entidad ${entityType} con ID ${entityId}`);
      console.log('Entidades disponibles:', included.map(item => ({ id: item.id, type: item.type })));
      return null;
    }
    
    console.log(`Entidad encontrada ${entityType}:`, entity);
    console.log(`Atributos de ${entityType}:`, entity.attributes);
    
    // Retornar información completa según el tipo de entidad
    if (entityType === "node--profile") {
      const profileInfo: ProfileInfo = {
        name: entity.attributes?.field_full_name || entity.attributes?.title || entity.attributes?.name || "Sin nombre",
        email: extractEmail(entity.attributes),
        phone: extractPhone(entity.attributes),
        documentNumber: entity.attributes?.field_document_number || entity.attributes?.document_number || entity.attributes?.dni || "Sin documento",
        address: entity.attributes?.field_address || entity.attributes?.address || entity.attributes?.direccion || "Sin dirección"
      };
      console.log('Profile info extraída:', profileInfo);
      return profileInfo;
    } else if (entityType === "node--distributor") {
      const distributorInfo: DistributorInfo = {
        name: entity.attributes?.title || entity.attributes?.name || entity.attributes?.field_name || "Sin nombre",
        email: extractEmail(entity.attributes),
        phone: extractPhone(entity.attributes),
        documentNumber: entity.attributes?.field_document_number || entity.attributes?.document_number || entity.attributes?.dni || "Sin documento",
        vehicle: entity.attributes?.field_vehicle || entity.attributes?.vehicle || entity.attributes?.vehiculo || "Sin vehículo",
        status: entity.attributes?.status ? "Activo" : "Inactivo"
      };
      console.log('Distributor info extraída:', distributorInfo);
      return distributorInfo;
    } else if (entityType.startsWith("taxonomy_term--")) {
      const taxonomyInfo: TaxonomyInfo = {
        name: entity.attributes?.name || entity.attributes?.title || entity.attributes?.field_name || "Sin nombre",
        description: entity.attributes?.description || entity.attributes?.field_description || entity.attributes?.descripcion || "Sin descripción"
      };
      return taxonomyInfo;
    }
    
    return null;
  };

  // Obtener información de entidades relacionadas con verificación de seguridad
  const applicantId = request.relationships?.field_applicant?.data?.id;
  const distributorId = request.relationships?.field_distributor_data?.data?.id;
  const subserviceId = request.relationships?.field_subservice?.data?.id;
  const applicationStatusId = request.relationships?.field_application_statuses?.data?.id;
  const serviceStatusId = request.relationships?.field_service_status?.data?.id;

  const applicantInfo = getIncludedEntityInfo(applicantId || "", "node--profile");
  const distributorInfo = getIncludedEntityInfo(distributorId || "", "node--distributor");
  const subserviceInfo = getIncludedEntityInfo(subserviceId || "", "taxonomy_term--category");
  const applicationStatusInfo = getIncludedEntityInfo(applicationStatusId || "", "taxonomy_term--application_statuses");
  const serviceStatusInfo = getIncludedEntityInfo(serviceStatusId || "", "taxonomy_term--application_statuses");

  // Debug: mostrar información de entidades encontradas
  console.log('=== DEBUG INFO ===');
  console.log('Applicant ID:', applicantId);
  console.log('Distributor ID:', distributorId);
  console.log('Applicant Info:', applicantInfo);
  console.log('Distributor Info:', distributorInfo);
  console.log('Included data:', included);
  
  // Mostrar todos los atributos disponibles para debugging
  if (included) {
    included.forEach((item, index) => {
      console.log(`Entidad ${index}:`, {
        id: item.id,
        type: item.type,
        attributes: item.attributes,
        attributeKeys: Object.keys(item.attributes || {})
      });
    });
  }
  console.log('==================');

  // Type guards para verificar el tipo de entidad
  const isProfileInfo = (info: any): info is ProfileInfo => {
    return info && 'address' in info;
  };

  const isDistributorInfo = (info: any): info is DistributorInfo => {
    return info && 'vehicle' in info;
  };



  const formatDate = (dateString: string) => {
    if (!dateString) return "No disponible";
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "Fecha inválida";
    }
  };

  const formatCurrency = (amount: any) => {
    if (!amount || typeof amount !== 'number') return "Sin especificar";
    try {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
      }).format(amount);
    } catch (error) {
      return "Sin especificar";
    }
  };

  // Verificar que request tenga los datos necesarios
  if (!request || !request.attributes || !request.relationships) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-red-600">
                Error al cargar la solicitud
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="px-6 py-4">
            <p className="text-red-600">No se pudo cargar la información de la solicitud.</p>
            <p className="text-sm text-gray-600 mt-2">
              Los datos de la solicitud no están disponibles o son inválidos.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  Detalle de Solicitud
                </DialogTitle>
                <DialogDescription>
                  Información detallada de la solicitud seleccionada
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Información Principal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-600 border-b-2 border-blue-200 pb-2">
              <FileText className="h-5 w-5" />
              Información Principal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Número de Solicitud
                </Label>
                                  <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                    {String(request.attributes.field_application_number || "No disponible")}
                  </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Título</Label>
                                  <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                    {String(request.attributes.title || "No disponible")}
                  </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Fecha de Entrada</Label>
                <p className="text-base bg-gray-50 p-2 rounded border">
                  {formatDate(request.attributes.field_entry_date || "")}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Estado</Label>
                <div className="mt-1">
                  <Badge className="bg-blue-100 text-blue-800 text-sm">
                    {String(applicationStatusInfo?.name || "Sin estado")}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Datos del Solicitante */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-green-600 border-b-2 border-green-200 pb-2">
              <User className="h-5 w-5" />
              Datos del Solicitante
            </h3>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Nombre</Label>
                  <p className="text-base font-medium">{String(applicantInfo?.name || "Sin asignar")}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Email</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {String(isProfileInfo(applicantInfo) ? applicantInfo.email : "Sin email")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Teléfono</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {String(isProfileInfo(applicantInfo) ? applicantInfo.phone : "Sin teléfono")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Documento</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {String(isProfileInfo(applicantInfo) ? applicantInfo.documentNumber : "Sin documento")}
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-gray-600">Dirección</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {String(isProfileInfo(applicantInfo) ? applicantInfo.address : "Sin dirección")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle del Servicio */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-600 border-b-2 border-purple-200 pb-2">
              <Package className="h-5 w-5" />
              Detalle del Servicio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Subservicio</Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {String(subserviceInfo?.name || "Sin especificar")}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Estado del Servicio</Label>
                <div className="mt-1">
                  <Badge className="bg-purple-100 text-purple-800 text-sm">
                    {String(serviceStatusInfo?.name || "Sin estado")}
                  </Badge>
                </div>
              </div>

            </div>
          </div>

          {/* Repartidor Asignado */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-orange-600 border-b-2 border-orange-200 pb-2">
              <Truck className="h-5 w-5" />
              Repartidor Asignado
            </h3>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Nombre</Label>
                  <p className="text-base font-medium">{String(distributorInfo?.name || "Sin asignar")}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Email</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {String(isDistributorInfo(distributorInfo) ? distributorInfo.email : "Sin email")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Teléfono</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {String(isDistributorInfo(distributorInfo) ? distributorInfo.phone : "Sin teléfono")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Documento</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {String(isDistributorInfo(distributorInfo) ? distributorInfo.documentNumber : "Sin documento")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Vehículo</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {String(isDistributorInfo(distributorInfo) ? distributorInfo.vehicle : "Sin vehículo")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600">Estado</Label>
                  <p className="text-base bg-white p-2 rounded border">
                    {String(isDistributorInfo(distributorInfo) ? distributorInfo.status : "Sin estado")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Métricas y Costos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-yellow-600 border-b-2 border-yellow-200 pb-2">
              <DollarSign className="h-5 w-5" />
              Métricas y Costos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <Star className="h-5 w-5 text-yellow-500" />
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-600">Calificación</Label>
                  <p className="text-base font-medium">
                    {request.attributes.field_application_score ? `${String(request.attributes.field_application_score)}/5` : "Sin calificar"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Clock className="h-5 w-5 text-blue-500" />
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-600">Horas Estimadas</Label>
                  <p className="text-base font-medium">
                    {request.attributes.field_estimated_application_hour ? `${String(request.attributes.field_estimated_application_hour)}h` : "Sin especificar"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Costos de Logística</Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {formatCurrency(request.attributes.field_logistics_costs || 0)}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Valor del Servicio</Label>
                <p className="text-base font-medium bg-gray-50 p-2 rounded border">
                  {formatCurrency(request.attributes.field_service_value || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Fechas del Sistema */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-600 border-b-2 border-gray-200 pb-2">
              <Calendar className="h-5 w-5" />
              Fechas del Sistema
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Creado</Label>
                <p className="text-base bg-gray-50 p-2 rounded border">
                  {formatDate(request.attributes.created || "")}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Última Modificación</Label>
                <p className="text-base bg-gray-50 p-2 rounded border">
                  {formatDate(request.attributes.changed || "")}
                </p>
              </div>
            </div>
          </div>

          {/* Información del Sistema */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-indigo-600 border-b-2 border-indigo-200 pb-2">Información del Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">
                  Estado del Sistema
                </Label>
                <p className="text-base bg-gray-50 p-2 rounded border">
                  {request.attributes.status ? "Activo" : "Inactivo"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} className="hover:bg-gray-100">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { jsPDF } from "jspdf";

type PdfRequest = {
  applicationNumber?: string;
  title?: string;
  entryDate?: number | string;
  requestStatus?: string;
  observations?: string;
  serviceValue?: number;
  prioritizedValue?: number;
  logisticsCosts?: number;
  isPrioritized?: boolean;
  paymentMethod?: string | null;
  applicant?: {
    fullName?: string;
    documentType?: string;
    documentNumber?: string;
    phoneNumber?: string;
    address?: string;
    email?: string;
  } | null;
  service?: { name?: string } | null;
  distributor?: { title?: string } | null;
  data?: Array<{
    value?: unknown;
    field?: { name?: string; type?: string } | null;
  }> | null;
  addressSnapshot?: { raw?: string } | null;
};

function formatDate(value?: number | string) {
  if (!value) return "—";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFieldValue(value: unknown, type?: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (type === "File") return "Archivo adjunto";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function writeLines(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 5) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function downloadRequestPdf(request: PdfRequest, fileName?: string) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Pere Tántico — Solicitud de servicio", margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  y = writeLines(
    doc,
    `Radicado: ${request.applicationNumber ?? "—"}`,
    margin,
    y,
    contentWidth
  );
  y = writeLines(doc, `Servicio: ${request.service?.name ?? request.title ?? "—"}`, margin, y, contentWidth);
  y = writeLines(doc, `Estado: ${request.requestStatus ?? "—"}`, margin, y, contentWidth);
  y = writeLines(doc, `Fecha de entrada: ${formatDate(request.entryDate)}`, margin, y, contentWidth);
  y += 3;

  doc.setFont("helvetica", "bold");
  doc.text("Solicitante", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  y = writeLines(doc, `Nombre: ${request.applicant?.fullName ?? "—"}`, margin, y, contentWidth);
  y = writeLines(
    doc,
    `Documento: ${request.applicant?.documentType ?? ""} ${request.applicant?.documentNumber ?? "—"}`.trim(),
    margin,
    y,
    contentWidth
  );
  y = writeLines(doc, `Teléfono: ${request.applicant?.phoneNumber ?? "—"}`, margin, y, contentWidth);
  y = writeLines(doc, `Correo: ${request.applicant?.email ?? "—"}`, margin, y, contentWidth);
  const address =
    request.addressSnapshot?.raw?.trim() || request.applicant?.address?.trim() || "—";
  y = writeLines(doc, `Dirección: ${address}`, margin, y, contentWidth);
  y += 3;

  doc.setFont("helvetica", "bold");
  doc.text("Valores", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  y = writeLines(doc, `Valor servicio: $${Number(request.serviceValue ?? 0).toLocaleString("es-CO")}`, margin, y, contentWidth);
  if (request.isPrioritized) {
    y = writeLines(
      doc,
      `Valor prioridad: $${Number(request.prioritizedValue ?? 0).toLocaleString("es-CO")}`,
      margin,
      y,
      contentWidth
    );
  }
  y = writeLines(
    doc,
    `Costo logístico: $${Number(request.logisticsCosts ?? 0).toLocaleString("es-CO")}`,
    margin,
    y,
    contentWidth
  );
  y = writeLines(doc, `Método de pago: ${request.paymentMethod ?? "—"}`, margin, y, contentWidth);
  y += 3;

  if (request.distributor?.title) {
    doc.setFont("helvetica", "bold");
    doc.text("Repartidor asignado", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    y = writeLines(doc, request.distributor.title, margin, y, contentWidth);
    y += 3;
  }

  const serviceData = (request.data ?? []).filter((row) => row.field?.name);
  if (serviceData.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Datos del servicio", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    for (const row of serviceData) {
      const label = row.field?.name ?? "Campo";
      const value = formatFieldValue(row.value, row.field?.type);
      y = writeLines(doc, `${label}: ${value}`, margin, y, contentWidth);
      if (y > 250) {
        doc.addPage();
        y = 18;
      }
    }
    y += 2;
  }

  if (request.observations?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    y = writeLines(doc, request.observations.trim(), margin, y, contentWidth);
  }

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generado ${new Date().toLocaleString("es-CO")} — Pere Tántico`,
    margin,
    doc.internal.pageSize.getHeight() - 10
  );

  const safeName = (request.applicationNumber ?? "solicitud").replace(/[^\w-]+/g, "_");
  doc.save(fileName ?? `Solicitud_${safeName}.pdf`);
}

export function downloadRequestPdfFromCompleteRequest(request: {
  field_application_number?: string;
  title?: string;
  field_entry_date?: string;
  requestStatus?: string;
  field_observations?: string;
  field_service_value?: number;
  field_prioritized_value?: number;
  field_logistics_costs?: number;
  isPrioritized?: boolean;
  paymentMethod?: string | null;
  applicant?: {
    name?: string;
    documentType?: { name?: string };
    documentNumber?: string;
    phoneNumber?: string;
    address?: string;
  };
  subservice?: { name?: string };
  distributor?: { name?: string };
  data?: Array<{ value?: unknown; field?: { name?: string; type?: string } | null }>;
  addressSnapshot?: { raw?: string };
}) {
  downloadRequestPdf({
    applicationNumber: request.field_application_number,
    title: request.title,
    entryDate: request.field_entry_date,
    requestStatus: request.requestStatus,
    observations: request.field_observations,
    serviceValue: request.field_service_value,
    prioritizedValue: request.field_prioritized_value,
    logisticsCosts: request.field_logistics_costs,
    isPrioritized: request.isPrioritized,
    paymentMethod: request.paymentMethod,
    applicant: request.applicant
      ? {
          fullName: request.applicant.name,
          documentType: request.applicant.documentType?.name,
          documentNumber: request.applicant.documentNumber,
          phoneNumber: request.applicant.phoneNumber,
          address: request.applicant.address,
        }
      : null,
    service: { name: request.subservice?.name ?? request.title },
    distributor: request.distributor ? { title: request.distributor.name } : null,
    data: request.data,
    addressSnapshot: request.addressSnapshot,
  });
}

import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";

function normalizeApplicationNumber(raw: string): string {
  const t = (raw ?? "").trim();
  if (!t) return "";

  const m = t.match(/req\s*[-–—]?\s*(\d{4,})/i);
  if (m?.[1]) return `REQ-${m[1]}`;

  const digits = t.replace(/[^\d]/g, "");
  if (digits.length >= 4) return `REQ-${digits}`;

  return t.toUpperCase();
}

function normalizePhoneDigits(raw: string): string {
  return (raw ?? "").replace(/[^\d]/g, "");
}

function phoneMatches(aRaw: string, bRaw: string): boolean {
  const a = normalizePhoneDigits(aRaw);
  const b = normalizePhoneDigits(bRaw);
  if (!a || !b) return false;
  if (a === b) return true;

  const a10 = a.length >= 10 ? a.slice(-10) : a;
  const b10 = b.length >= 10 ? b.slice(-10) : b;
  if (a10 === b10) return true;

  if (a.length >= 8 && b.endsWith(a)) return true;
  if (b.length >= 8 && a.endsWith(b)) return true;

  return false;
}

export const getRequestStatus = createTool({
  description:
    "Obtiene el estado actual de una solicitud por número REQ-XXXXXX y si ya tiene repartidor asignado",
  args: jsonSchema<{
    applicationNumber: string;
    contactId?: string;
    phoneNumber?: string;
  }>({
    type: "object",
    properties: {
      applicationNumber: { type: "string" },
      contactId: { type: "string" },
      phoneNumber: { type: "string" },
    },
    required: ["applicationNumber"],
    additionalProperties: false,
  }),
  handler: async (ctx, args) => {
    const applicationNumber = normalizeApplicationNumber(args.applicationNumber);
    if (!applicationNumber) {
      return { found: false, reason: "missing_application_number" };
    }

    const req = (await ctx.runQuery(anyApi.requests.getByApplicationNumber, {
      applicationNumber,
    })) as
      | {
          applicationNumber: string;
          requestStatus?: string;
          entryDate?: number;
          applicant?: { phoneNumber?: string; fullName?: string } | null;
          service?: { name?: string } | null;
          distributor?: { title?: string; phoneNumber?: string } | null;
          observations?: string | null;
          paymentStatus?: string | null;
        }
      | null;

    if (!req) return { found: false, reason: "not_found" };

    const fromPhone =
      (args.phoneNumber ?? "").trim() ||
      (args.contactId ?? "").replace(/^whatsapp:/, "").trim();
    const applicantPhone = req.applicant?.phoneNumber ?? "";

    if (fromPhone && applicantPhone && !phoneMatches(applicantPhone, fromPhone)) {
      return { found: false, reason: "not_found" };
    }

    let statusLabel = "Sin estado";
    switch (req.requestStatus) {
      case "EnProceso":
        statusLabel = "En proceso";
        break;
      case "Finalizada":
        statusLabel = "Finalizada";
        break;
      case "Atendida":
        statusLabel = "Atendida";
        break;
      case "Incompleta":
        statusLabel = "Incompleta";
        break;
    }

    return {
      found: true,
      applicationNumber: req.applicationNumber,
      serviceName: req.service?.name ?? null,
      requestStatus: req.requestStatus ?? null,
      requestStatusLabel: statusLabel,
      distributorName: req.distributor?.title ?? null,
      distributorPhoneNumber: req.distributor?.phoneNumber ?? null,
      paymentStatus: req.paymentStatus ?? null,
      entryDate: typeof req.entryDate === "number" ? req.entryDate : null,
      observations: req.observations ?? null,
    };
  },
});


import { describe, expect, it } from "vitest";
import { buildCompletionThreadTitles, createRequest } from "../convex/system/ai/tools/createRequest";

async function invokeCreateRequest(ctx: unknown, args: Record<string, unknown>) {
  const tool = createRequest as unknown as {
    execute: (args: unknown, options: unknown) => Promise<unknown>;
  };

  return tool.execute.call(
    { ...(createRequest as object), ctx },
    args,
    { toolCallId: "test-call", messages: [] }
  );
}

describe("createRequest tool", () => {
  it("builds thread titles so closed thread keeps REQ and next thread is clean", () => {
    const titles = buildCompletionThreadTitles({
      contactId: "whatsapp:+573001234567",
      applicationNumber: "REQ-123456",
    });

    expect(titles.closedThreadTitle).toBe("WhatsApp whatsapp:+573001234567 (REQ-123456)");
    expect(titles.nextActiveThreadTitle).toBe("WhatsApp whatsapp:+573001234567");
  });

  it("blocks marriage request creation when required marriage certificate is missing", async () => {
    const marriageServiceId = "service_marriage";
    const fieldMarriageType = "field_marriage_type";
    const fieldRegistry = "field_marriage_registry";
    const fieldCase = "field_marriage_case";
    const fieldAuthorization = "field_signed_authorization";
    const fieldIdCopy = "field_applicant_id_copy";
    const fieldMarriageCertificate = "field_marriage_certificate";
    const fieldObservations = "field_observations";

    const ctx = {
      runQuery: async () => ({
        price: 35000,
        fields: [
          { _id: fieldMarriageType, name: "Tipo de matrimonio", type: "Select", required: false, status: true },
          { _id: fieldRegistry, name: "Registro en Registraduría/Notaría", type: "Select", required: false, status: true },
          { _id: fieldCase, name: "Motivo de la solicitud", type: "Select", required: false, status: true },
          { _id: fieldAuthorization, name: "Autorización firmada", type: "File", required: false, status: true },
          { _id: fieldIdCopy, name: "Copia cédula del solicitante", type: "File", required: false, status: true },
          { _id: fieldMarriageCertificate, name: "Certificado de matrimonio", type: "File", required: true, status: true },
          { _id: fieldObservations, name: "Observaciones", type: "Text", required: false, status: true },
        ],
      }),
      runMutation: async () => {
        throw new Error("should not create request when required field is missing");
      },
      storage: {
        store: async () => "storage_x",
        getUrl: async () => "https://storage.local/storage_x",
      },
    };

    const result = (await invokeCreateRequest(ctx, {
      applicantId: "profile_1",
      serviceId: marriageServiceId,
      data: [
        { fieldId: fieldMarriageType, value: "civil" },
        { fieldId: fieldRegistry, value: "notaria" },
        { fieldId: fieldCase, value: "caso1" },
        { fieldId: fieldAuthorization, value: "storage_authorization" },
        { fieldId: fieldIdCopy, value: "storage_id_copy" },
        { fieldId: fieldObservations, value: "ninguna" },
      ],
    })) as { ok: boolean; message?: string; missingFields?: string[] };

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Faltan campos obligatorios");
    expect(result.missingFields).toContain("Certificado de matrimonio");
  });
});

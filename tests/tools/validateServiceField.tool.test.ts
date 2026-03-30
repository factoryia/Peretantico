import { afterEach, describe, expect, it, vi } from "vitest";
import { validateServiceField } from "../../convex/system/ai/tools/validateServiceField";

type MockField = {
  _id: string;
  name: string;
  type: string;
  required?: boolean;
  options?: unknown;
};

function buildCtxWithField(field: MockField) {
  return {
    runQuery: vi.fn().mockResolvedValue({ fields: [field] }),
  };
}

async function invokeValidate(
  ctx: unknown,
  args: {
    serviceId: string;
    fieldId: string;
    value: string;
    mediaUrl?: string;
    fileName?: string;
    mediaFilename?: string;
  }
) {
  const tool = validateServiceField as unknown as {
    execute: (args: unknown, options: unknown) => Promise<unknown>;
  };

  return tool.execute.call(
    { ...(validateServiceField as object), ctx },
    args,
    { toolCallId: "test-call", messages: [] }
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("validateServiceField tool", () => {
  it("accepts exact Select option value", async () => {
    const ctx = buildCtxWithField({
      _id: "field_tipo_cliente",
      name: "Tipo de cliente",
      type: "Select",
      required: true,
      options: [
        { label: "Persona Natural", value: "persona_natural" },
        { label: "Empresa", value: "empresa" },
      ],
    });

    const result = await invokeValidate(ctx, {
      serviceId: "service_alquila",
      fieldId: "field_tipo_cliente",
      value: "persona_natural",
    });

    expect(result).toEqual({ ok: true, normalizedValue: "persona_natural" });
  });

  it("rejects ambiguous or non-listed Select values with strict options", async () => {
    const ctx = buildCtxWithField({
      _id: "field_tipo_cliente",
      name: "Tipo de cliente",
      type: "Select",
      required: true,
      options: ["Persona Natural", "Empresa"],
    });

    const result = (await invokeValidate(ctx, {
      serviceId: "service_alquila",
      fieldId: "field_tipo_cliente",
      value: "personal",
    })) as { ok: boolean; message?: string };

    expect(result.ok).toBe(false);
    expect(result.message).toContain("elija una opción válida");
    expect(result.message).toContain("Persona Natural");
    expect(result.message).toContain("Empresa");
  });

  it("normalizes boolean answers and rejects invalid ones", async () => {
    const ctx = buildCtxWithField({
      _id: "field_radicado",
      name: "¿Requiere radicado?",
      type: "Boolean",
      required: true,
    });

    const okResult = await invokeValidate(ctx, {
      serviceId: "service_cert_agua",
      fieldId: "field_radicado",
      value: "Sí",
    });
    expect(okResult).toEqual({ ok: true, normalizedValue: true });

    const invalidResult = (await invokeValidate(ctx, {
      serviceId: "service_cert_agua",
      fieldId: "field_radicado",
      value: "de pronto",
    })) as { ok: boolean; message?: string };

    expect(invalidResult.ok).toBe(false);
    expect(invalidResult.message).toContain("responda Sí o No");
  });

  it("returns expired-link message for 403 file download", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers(),
    } as unknown as Response);

    const ctx = {
      runQuery: vi.fn().mockResolvedValue({
        fields: [{ _id: "field_file", name: "Soporte PDF", type: "File", required: true }],
      }),
      storage: {
        store: vi.fn(),
        getUrl: vi.fn(),
      },
    };

    const result = (await invokeValidate(ctx, {
      serviceId: "service_docs",
      fieldId: "field_file",
      value: "",
      mediaUrl: "https://api.ycloud.com/v2/whatsapp/media/download/abc?sig=expired",
      mediaFilename: "soporte.pdf",
    })) as { ok: boolean; message?: string };

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("enlace del archivo venció");
  });

  it("retries once on transient errors and stores file when second attempt succeeds", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: false, status: 500, headers: new Headers() } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/pdf" }),
        arrayBuffer: async () => new TextEncoder().encode("pdf").buffer,
      } as unknown as Response);

    const ctx = {
      runQuery: vi.fn().mockResolvedValue({
        fields: [{ _id: "field_file", name: "Soporte PDF", type: "File", required: true }],
      }),
      storage: {
        store: vi.fn().mockResolvedValue("storage_123"),
        getUrl: vi.fn().mockResolvedValue("https://storage.local/storage_123"),
      },
    };

    const result = (await invokeValidate(ctx, {
      serviceId: "service_docs",
      fieldId: "field_file",
      value: "",
      mediaUrl: "https://api.ycloud.com/v2/whatsapp/media/download/abc",
      mediaFilename: "soporte.pdf",
    })) as { ok: boolean; normalizedValue?: string; file?: { fileName?: string } };

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    expect(result.normalizedValue).toBe("storage_123");
    expect(result.file?.fileName).toBe("soporte.pdf");
  });

  it("returns not-found message for 404 media download", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers(),
    } as unknown as Response);

    const ctx = {
      runQuery: vi.fn().mockResolvedValue({
        fields: [{ _id: "field_file", name: "Soporte PDF", type: "File", required: true }],
      }),
      storage: {
        store: vi.fn(),
        getUrl: vi.fn(),
      },
    };

    const result = (await invokeValidate(ctx, {
      serviceId: "service_docs",
      fieldId: "field_file",
      value: "",
      mediaUrl: "https://api.ycloud.com/v2/whatsapp/media/download/404id?sig=x",
      mediaFilename: "soporte.pdf",
    })) as { ok: boolean; message?: string };

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("No encontré ese archivo en el proveedor");
  });

  it("returns provider-unavailable message when 429 persists after retry", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers() } as unknown as Response)
      .mockResolvedValueOnce({ ok: false, status: 429, headers: new Headers() } as unknown as Response);

    const ctx = {
      runQuery: vi.fn().mockResolvedValue({
        fields: [{ _id: "field_file", name: "Soporte PDF", type: "File", required: true }],
      }),
      storage: {
        store: vi.fn(),
        getUrl: vi.fn(),
      },
    };

    const result = (await invokeValidate(ctx, {
      serviceId: "service_docs",
      fieldId: "field_file",
      value: "",
      mediaUrl: "https://api.ycloud.com/v2/whatsapp/media/download/429id?sig=x",
      mediaFilename: "soporte.pdf",
    })) as { ok: boolean; message?: string };

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("temporalmente no disponible");
  });
});

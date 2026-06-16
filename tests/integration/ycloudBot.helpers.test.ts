import { describe, expect, it } from "vitest";
import { resolveRequestCompletionMessage } from "../../convex/system/ai/requestCompletion";
import {
  buildInboundContextPrompt,
  deriveInboundFlowDecision,
  extractCreateRequestCompletion,
  getUnsupportedIntentReply,
  isResetThreadTitle,
  normalizeForMatch,
  resolveAgentEmptyReply,
} from "../../convex/ycloudBot.helpers";
import { createScenarioRecorder } from "../harness/scenarioLogger";

describe("ycloud bot topic guard", () => {
  it("blocks strongly off-topic matrix", () => {
    const recorder = createScenarioRecorder("off-topic-guard-matrix");
    const cases = [
      "Convierte 200 dólares a pesos colombianos",
      "Ayúdame con mi tarea de matemáticas: 7*8",
      "Redacta un email formal para mi jefe",
      "¿Cómo estará el clima mañana en Bogotá?",
      "Escribe un script en TypeScript para una API",
    ];

    for (const input of cases) {
      const result = deriveInboundFlowDecision({
        rawText: input,
        hasMedia: false,
        lastOutboundContent: "¿Qué servicio necesitas hoy?",
        hasSessionServiceId: false,
        sessionFieldIdsCount: 0,
        applicantNeedsProfile: false,
      });

      recorder.push({ input, expected: { shouldBlock: true }, actual: { shouldBlock: result.shouldBlock }, pass: result.shouldBlock });
      expect(result.shouldBlock).toBe(true);
    }

    recorder.flush();
  });

  it("accepts on-topic matrix", () => {
    const recorder = createScenarioRecorder("on-topic-acceptance-matrix");
    const cases = [
      "servicios",
      "Quiero revisar el estado de REQ-219810",
      "Mi nombre es Ana Gómez",
      "CC 123456789",
      "+57 3001234567",
      "ana@example.com",
      "Calle 123 #45-67",
      "sí",
    ];

    for (const input of cases) {
      const result = deriveInboundFlowDecision({
        rawText: input,
        hasMedia: false,
        lastOutboundContent: "Vamos con el campo: nombre completo. ¿Cuál es tu nombre?",
        hasSessionServiceId: false,
        sessionFieldIdsCount: 0,
        applicantNeedsProfile: true,
      });

      recorder.push({ input, expected: { shouldBlock: false }, actual: { shouldBlock: result.shouldBlock }, pass: !result.shouldBlock });
      expect(result.shouldBlock).toBe(false);
    }

    recorder.flush();
  });

  it("allows short field replies but still blocks strongly off-topic messages during active flow", () => {
    const recorder = createScenarioRecorder("active-flow-bypass-safety");
    const allowed = deriveInboundFlowDecision({
      rawText: "Juan Pérez",
      hasMedia: false,
      lastOutboundContent: "Vamos con el campo: nombre completo. ¿Cuál es tu nombre?",
      hasSessionServiceId: true,
      sessionFieldIdsCount: 2,
      currentFieldIndex: 0,
      applicantNeedsProfile: false,
    });
    recorder.push({
      input: "Juan Pérez",
      expected: { shouldBlock: false },
      actual: { shouldBlock: allowed.shouldBlock },
      pass: !allowed.shouldBlock,
    });
    expect(allowed.shouldBlock).toBe(false);

    const blocked = deriveInboundFlowDecision({
      rawText: "Explícame programación en Python",
      hasMedia: false,
      lastOutboundContent: "Vamos con el campo: nombre completo. ¿Cuál es tu nombre?",
      hasSessionServiceId: true,
      sessionFieldIdsCount: 2,
      currentFieldIndex: 0,
      applicantNeedsProfile: false,
    });
    recorder.push({
      input: "Explícame programación en Python",
      expected: { shouldBlock: true, reply: getUnsupportedIntentReply() },
      actual: { shouldBlock: blocked.shouldBlock, reply: getUnsupportedIntentReply() },
      pass: blocked.shouldBlock,
    });
    expect(blocked.shouldBlock).toBe(true);

    recorder.flush();
  });

  it("does not block progress/context questions during an active service flow", () => {
    const recorder = createScenarioRecorder("active-flow-progress-question");
    const result = deriveInboundFlowDecision({
      rawText: "en que campo voy ?",
      hasMedia: false,
      lastOutboundContent: "Vamos con el campo: tipo de cliente. ¿Cuál opción seleccionas?",
      hasSessionServiceId: true,
      sessionFieldIdsCount: 6,
      currentFieldIndex: 2,
      applicantNeedsProfile: false,
    });

    recorder.push({
      input: "en que campo voy ?",
      expected: { shouldBlock: false },
      actual: { shouldBlock: result.shouldBlock },
      pass: !result.shouldBlock,
    });

    expect(result.shouldBlock).toBe(false);
    recorder.flush();
  });

  it("does not block service-name shorthand after service list (e.g. 'Matrimonio')", () => {
    const recorder = createScenarioRecorder("service-shorthand-after-list");
    const services = [
      { name: "Alquila Pere Tantico", status: true },
      { name: "Partida de Matrimonio", status: true },
      { name: "Partida de Defunción", status: true },
    ];

    const result = deriveInboundFlowDecision({
      rawText: "Matrimonio",
      hasMedia: false,
      lastOutboundContent:
        "Aquí tienes la lista de servicios disponibles:\n\n1) Alquila Pere Tantico\n2) Partida de Defunción\n3) Partida de Matrimonio\n\nResponde con el número o el nombre del servicio.",
      services,
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    recorder.push({
      input: "Matrimonio",
      expected: { shouldBlock: false },
      actual: { shouldBlock: result.shouldBlock },
      pass: !result.shouldBlock,
    });

    expect(result.shouldBlock).toBe(false);
    recorder.flush();
  });
});

describe("ycloud bot context", () => {
  it("builds context prompt with profile and session details", () => {
    const recorder = createScenarioRecorder("context-prompt-details");
    const prompt = buildInboundContextPrompt({
      contactId: "whatsapp:+573001234567",
      effectiveText: "Servicio de domicilio",
      resolvedProfileId: "profile_123",
      resolvedProfileName: "Ana Gómez",
      mediaType: "document",
      mediaUrl: "https://example.com/file.pdf",
      mediaFilename: "file.pdf",
      sessionState: "COLLECTING_FIELDS",
      serviceId: "service_1",
      currentFieldIndex: 2,
    });

    recorder.push({
      input: "buildInboundContextPrompt",
      expected: {
        containsProfileId: true,
        containsServiceId: true,
        endsWithEffectiveText: true,
      },
      actual: {
        containsProfileId: prompt.includes("profileId=profile_123"),
        containsServiceId: prompt.includes("serviceId=service_1"),
        endsWithEffectiveText: prompt.endsWith("Servicio de domicilio"),
      },
      pass:
        prompt.includes("profileId=profile_123") &&
        prompt.includes("serviceId=service_1") &&
        prompt.endsWith("Servicio de domicilio"),
    });

    expect(prompt).toContain("[ctx] contactId=whatsapp:+573001234567 phone=+573001234567");
    expect(prompt).toContain("profileId=profile_123");
    expect(prompt).toContain("profileName=Ana Gómez");
    expect(prompt).toContain("serviceId=service_1");
    expect(prompt.endsWith("Servicio de domicilio")).toBe(true);

    recorder.flush();
  });
});

describe("request completion closure", () => {
  it("uses single completion message when new thread exists and closure succeeds", () => {
    const recorder = createScenarioRecorder("closure-success-single-message");
    const message = resolveRequestCompletionMessage({
      rawCompletion: {
        ok: true,
        applicationNumber: "REQ-1001",
        completion: {
          closeConversation: true,
          message: "Tu solicitud quedó registrada con el número REQ-1001.\n\nHe cerrado esta conversación.",
          newThreadId: "thread_new",
          closureApplied: true,
        },
      },
      closureFailed: false,
    });

    recorder.push({
      input: "resolveRequestCompletionMessage success",
      expected: "Tu solicitud quedó registrada con el número REQ-1001.\n\nHe cerrado esta conversación.",
      actual: message,
      pass: message === "Tu solicitud quedó registrada con el número REQ-1001.\n\nHe cerrado esta conversación.",
    });
    expect(message).toBe("Tu solicitud quedó registrada con el número REQ-1001.\n\nHe cerrado esta conversación.");
    recorder.flush();
  });

  it("falls back to safe completion message when closure fails", () => {
    const recorder = createScenarioRecorder("closure-fallback-safe-message");
    const message = resolveRequestCompletionMessage({
      rawCompletion: {
        ok: true,
        applicationNumber: "REQ-1002",
        completion: {
          closeConversation: true,
          message: "mensaje original",
          newThreadId: "thread_new",
          closureApplied: true,
        },
      },
      closureFailed: true,
    });

    recorder.push({
      input: "resolveRequestCompletionMessage fallback",
      expected: {
        containsApplicationNumber: true,
        containsFallbackInstruction: true,
      },
      actual: {
        containsApplicationNumber: message.includes("REQ-1002"),
        containsFallbackInstruction: message.includes("escríbeme de nuevo por este chat"),
      },
      pass: message.includes("REQ-1002") && message.includes("escríbeme de nuevo por este chat"),
    });
    expect(message).toContain("Hemos recibido la información y los documentos de tu solicitud.");
    expect(message).toContain("Tu solicitud ha entrado en proceso de revisión.");
    expect(message).toContain("Si necesitas otro servicio o consultar un estado, escríbeme de nuevo por este chat.");
    recorder.flush();
  });
});

describe("deterministic whatsapp flow", () => {
  it("maps numeric service selection and keeps guard decisions stable across profile and service field steps", () => {
    const recorder = createScenarioRecorder("profile-service-fields-deterministic-flow");
    const phone = "whatsapp:+573001234567";
    const services = [
      { name: "Acompañamiento médico", status: true },
      { name: "Domicilio de medicamentos", status: true },
      { name: "Pago de servicios públicos", status: true },
    ];

    const steps = [
      {
        name: "resolved-profile-context",
        rawText: phone.replace("whatsapp:", ""),
        lastOutboundContent: "¿Cuál es tu número de contacto?",
        expectedEffective: phone.replace("whatsapp:", ""),
      },
      {
        name: "select-service-by-number",
        rawText: "2",
        lastOutboundContent: "Aquí tienes la lista de servicios disponibles:\n\n1) Acompañamiento médico\n2) Domicilio de medicamentos\n3) Pago de servicios públicos\n\nResponde con el número o el nombre del servicio.",
        expectedEffective: "Domicilio de medicamentos",
      },
      {
        name: "field-answer-name",
        rawText: "Ana Gómez",
        lastOutboundContent: "Vamos con el campo: nombre completo. ¿Cuál es tu nombre?",
        expectedEffective: "Ana Gómez",
      },
      {
        name: "field-answer-email",
        rawText: "ana@example.com",
        lastOutboundContent: "Vamos con el campo: correo electrónico. ¿Cuál es tu correo?",
        expectedEffective: "ana@example.com",
      },
      {
        name: "field-answer-address",
        rawText: "Calle 80 # 10-15",
        lastOutboundContent: "Vamos con el campo: dirección de entrega. ¿Cuál es la dirección completa?",
        expectedEffective: "Calle 80 # 10-15",
      },
    ];

    for (const step of steps) {
      const result = deriveInboundFlowDecision({
        rawText: step.rawText,
        hasMedia: false,
        lastOutboundContent: step.lastOutboundContent,
        services,
        hasSessionServiceId: true,
        sessionFieldIdsCount: 3,
        currentFieldIndex: 1,
        applicantNeedsProfile: false,
      });

      const actual = {
        effectiveText: result.effectiveText,
        normalizedEffective: result.normalizedEffective,
        shouldBlock: result.shouldBlock,
      };
      const expected = {
        effectiveText: step.expectedEffective,
        normalizedEffective: normalizeForMatch(step.expectedEffective),
        shouldBlock: false,
      };

      recorder.push({ input: `${step.name}: ${step.rawText}`, expected, actual, pass: JSON.stringify(actual) === JSON.stringify(expected) });
      expect(actual).toEqual(expected);
    }

    recorder.flush();
  });
});

describe("assistant fallback reply", () => {
  it("returns a recovery message when 5 validateServiceField calls consume all steps", () => {
    const recorder = createScenarioRecorder("assistant-fallback-after-validate-loop");
    const reply = resolveAgentEmptyReply({
      assistantText: "",
      toolResults: Array.from({ length: 5 }, () => ({
        type: "tool-result",
        toolName: "validateServiceField",
        input: {
          fieldId: "ks7c9z203pqpbz3gmnxtex2t55827eqk",
          serviceId: "kx73r7n642b36rnpvr9etknat58261v5",
          value: "persona_natural",
        },
      })),
      lastOutboundContent: [
        "Para continuar con la solicitud de Alquila Pere Tantico:",
        "- Persona Natural",
        "- Empresa",
      ].join("\n"),
    });

    recorder.push({
      input: "empty assistant text + 5 validateServiceField calls",
      expected: {
        hasReply: true,
        strictOptions: true,
      },
      actual: {
        hasReply: reply.length > 0,
        strictOptions:
          reply.includes("SOLO una opción exacta") &&
          reply.includes("Persona Natural") &&
          reply.includes("Empresa"),
      },
      pass:
        reply.length > 0 &&
        reply.includes("SOLO una opción exacta") &&
        reply.includes("Persona Natural") &&
        reply.includes("Empresa"),
    });

    expect(reply.length).toBeGreaterThan(0);
    expect(reply).toContain("SOLO una opción exacta");
    expect(reply).toContain("Persona Natural");
    expect(reply).toContain("Empresa");
    recorder.flush();
  });

  it("keeps the original assistant response when text exists", () => {
    const expected = "Perfecto, continuemos con la solicitud.";
    const reply = resolveAgentEmptyReply({
      assistantText: expected,
      toolResults: Array.from({ length: 5 }, () => ({ type: "tool-result", toolName: "validateServiceField" })),
    });

    expect(reply).toBe(expected);
  });
});

describe("thread title helpers", () => {
  it("detects reset thread suffix", () => {
    expect(isResetThreadTitle("WhatsApp whatsapp:+573001234567 (reset)")).toBe(true);
    expect(isResetThreadTitle("WhatsApp whatsapp:+573001234567")).toBe(false);
  });
});

describe("createRequest completion extraction", () => {
  it("extracts completion when tool payload arrives in result", () => {
    const completion = extractCreateRequestCompletion([
      {
        type: "tool-result",
        toolName: "createRequest",
        result: {
          ok: true,
          applicationNumber: "REQ-358436",
          completion: {
            closeConversation: true,
            closureApplied: true,
            message: "ok",
            newThreadId: "thread_new",
          },
        },
      },
    ]);

    expect(completion?.ok).toBe(true);
    expect(completion?.applicationNumber).toBe("REQ-358436");
    expect(completion?.completion?.closeConversation).toBe(true);
    expect(completion?.completion?.newThreadId).toBe("thread_new");
  });

  it("extracts completion when tool payload arrives boxed in output json", () => {
    const completion = extractCreateRequestCompletion([
      {
        type: "tool-result",
        toolName: "createRequest",
        output: {
          type: "json",
          value: {
            ok: true,
            applicationNumber: "REQ-999",
            completion: {
              closeConversation: true,
              closureApplied: true,
              message: "ok",
              newThreadId: "thread_boxed",
            },
          },
        },
      },
    ]);

    expect(completion?.ok).toBe(true);
    expect(completion?.applicationNumber).toBe("REQ-999");
    expect(completion?.completion?.newThreadId).toBe("thread_boxed");
  });
});

describe("priority flow helpers", () => {
  it("parses normal and priority answers", async () => {
    const { parsePriorityAnswer } = await import("../../convex/ycloudBot.helpers");

    expect(parsePriorityAnswer("prioritario")).toBe(true);
    expect(parsePriorityAnswer("2")).toBe(true);
    expect(parsePriorityAnswer("si")).toBe(true);
    expect(parsePriorityAnswer("normal")).toBe(false);
    expect(parsePriorityAnswer("1")).toBe(false);
    expect(parsePriorityAnswer("no")).toBe(false);
    expect(parsePriorityAnswer("medicamentos")).toBe(null);
  });

  it("resolves service selection from numbered list", async () => {
    const { resolveServiceFromInboundText } = await import("../../convex/ycloudBot.helpers");
    const services = [
      { _id: "svc_1", name: "Partida de Matrimonio", status: true, price: 35000 },
      { _id: "svc_2", name: "Solicitud de Medicamentos", status: true, price: 40000, hasPriority: true },
    ];

    const picked = resolveServiceFromInboundText({
      effectiveText: "2",
      normalizedLastOutbound: "lista de servicios disponibles responde con el numero o el nombre del servicio",
      services,
      hasSessionServiceId: false,
    });

    expect(picked?._id).toBe("svc_2");
  });
});

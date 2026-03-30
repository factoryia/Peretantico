import { describe, expect, it } from "vitest";
import {
  deriveInboundFlowDecision,
  getUnsupportedIntentReply,
  resolveAgentEmptyReply,
} from "../convex/ycloudBot.helpers";
import { createScenarioRecorder } from "./utils/scenarioLogger";

describe("chat behavior TDD regressions", () => {
  it("reproduces and protects: progress question must stay on-topic", () => {
    const recorder = createScenarioRecorder("tdd-progress-question-on-topic");
    const result = deriveInboundFlowDecision({
      rawText: "en que campo voy ?",
      hasMedia: false,
      lastOutboundContent: "Vamos con el campo: tipo de cliente. ¿Cuál opción seleccionas?",
      hasSessionServiceId: true,
      sessionFieldIdsCount: 6,
      currentFieldIndex: 2,
      applicantNeedsProfile: false,
      services: [{ name: "Alquila Pere Tantico", status: true }],
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

  it("reproduces and protects: shorthand service selection must not be blocked", () => {
    const recorder = createScenarioRecorder("tdd-service-shorthand-not-blocked");
    const result = deriveInboundFlowDecision({
      rawText: "Matrimonio",
      hasMedia: false,
      lastOutboundContent:
        "Aquí tienes la lista de servicios disponibles:\n\n1) Alquila Pere Tantico\n2) Partida de Defunción\n3) Partida de Matrimonio\n\nResponde con el número o el nombre del servicio.",
      services: [
        { name: "Alquila Pere Tantico", status: true },
        { name: "Partida de Defunción", status: true },
        { name: "Partida de Matrimonio", status: true },
      ],
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

  it("reproduces and protects: numeric selection works for alternate service-list wording", () => {
    const recorder = createScenarioRecorder("tdd-numeric-selection-alternate-service-list-wording");
    const services = [
      { name: "Alquila Pere Tantico", status: true },
      { name: "Cert. Entrega Agua", status: true },
      { name: "Certificado de Propiedad", status: true },
      { name: "Certificado Libertad y Tradición", status: true },
      { name: "Certificado Representación Legal", status: true },
      { name: "Copia de Escrituras", status: true },
      { name: "Envío de Correspondencia", status: true },
      { name: "Partida de Defunción", status: true },
      { name: "Partida de Matrimonio", status: true },
      { name: "Plano de Predio", status: true },
      { name: "Poder Notarial", status: true },
      { name: "Registro Civil", status: true },
      { name: "Solicitud de Medicamentos", status: true },
      { name: "Solicitud Desenglobe", status: true },
    ];

    const result = deriveInboundFlowDecision({
      rawText: "11",
      hasMedia: false,
      lastOutboundContent:
        "Hoy es un buen día para ayudarte. Aquí te muestro la lista de servicios que ofrecemos:\n\n1) ...\n\nResponde con el número o el nombre del servicio que necesitas.",
      services,
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    recorder.push({
      input: "11",
      expected: { shouldBlock: false, mappedToService: true },
      actual: { shouldBlock: result.shouldBlock, mappedToService: result.effectiveText !== "11" },
      pass: !result.shouldBlock && result.effectiveText !== "11",
    });

    expect(result.shouldBlock).toBe(false);
    expect(result.effectiveText).not.toBe("11");
    recorder.flush();
  });

  it("reproduces and protects: repeated validate loop must return strict recovery", () => {
    const recorder = createScenarioRecorder("tdd-validate-loop-strict-recovery");
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
      lastOutboundContent: ["**Tipo de cliente**", "- Persona Natural", "- Empresa"].join("\n"),
    });

    recorder.push({
      input: "empty text after repeated validateServiceField",
      expected: { strictOptions: true },
      actual: {
        strictOptions:
          reply.includes("SOLO una opción exacta") && reply.includes("Persona Natural") && reply.includes("Empresa"),
      },
      pass: reply.includes("SOLO una opción exacta") && reply.includes("Persona Natural") && reply.includes("Empresa"),
    });

    expect(reply).toContain("SOLO una opción exacta");
    expect(reply).toContain("Persona Natural");
    expect(reply).toContain("Empresa");
    recorder.flush();
  });

  it("reproduces and protects: numeric field answer after 'Por favor, indica' prompt must not be blocked", () => {
    const recorder = createScenarioRecorder("tdd-numeric-answer-after-indica-prompt");
    const result = deriveInboundFlowDecision({
      rawText: "123231",
      hasMedia: false,
      lastOutboundContent: [
        "Para la solicitud de \"Copia de Escrituras\", necesitamos completar algunos campos.",
        "",
        "Comencemos con el primero:",
        "",
        "*Ciudad de la escritura*",
        "Por favor, indica la ciudad donde se formalizó la escritura.",
      ].join("\n"),
      services: [{ name: "Copia de Escrituras", status: true }],
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    recorder.push({
      input: "123231",
      expected: { shouldBlock: false },
      actual: { shouldBlock: result.shouldBlock },
      pass: !result.shouldBlock,
    });

    expect(result.shouldBlock).toBe(false);
    recorder.flush();
  });

  it("keeps strict off-topic guard reply unchanged", () => {
    const decision = deriveInboundFlowDecision({
      rawText: "ayúdame con una tarea de matemáticas",
      hasMedia: false,
      lastOutboundContent: "¿Qué servicio necesitas hoy?",
      services: [{ name: "Partida de Matrimonio", status: true }],
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    expect(decision.shouldBlock).toBe(true);
    expect(getUnsupportedIntentReply()).toBe(
      [
        "En este chat solo puedo ayudarte a crear solicitudes de servicios de Pere Tantico Tequendo o consultar el estado de una solicitud (REQ-XXXXXX).",
        "",
        'Si quieres ver la lista, escribe "servicios".',
        "",
        "¿Qué servicio necesitas hoy?",
      ].join("\n")
    );
  });
});

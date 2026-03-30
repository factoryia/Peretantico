/**
 * Test Fixtures and Factories for Conversational Tests
 * 
 * Reusable fixtures for common scenarios in agent testing.
 */

import type { ServiceFixture, MessageFixture, SessionStateInput } from "./harness";
import { createService, createInboundMessage, createOutboundMessage, buildSessionState } from "./harness";

/**
 * Standard services for testing - MUST match SERVICE_LIST_PROMPT order
 */
export const standardServices: ServiceFixture[] = [
  createService("Alquila Pere Tantico").build(),
  createService("Partida de Defunción").build(),
  createService("Partida de Matrimonio").build(),
  createService("Certificado de Propiedad").build(),
  createService("Copia de Escrituras").build(),
  createService("Solicitud de Medicamentos").build(),
];

/**
 * Service list prompt (typical outbound from bot) - MUST match standardServices order
 */
export const SERVICE_LIST_PROMPT = `Aquí tienes la lista de servicios disponibles:

1) Alquila Pere Tantico
2) Partida de Defunción
3) Partida de Matrimonio
4) Certificado de Propiedad
5) Copia de Escrituras
6) Solicitud de Medicamentos

Responde con el número o el nombre del servicio.`;

/**
 * Service selection prompt variant
 */
export const SERVICE_LIST_PROMPT_ALT = `Hoy es un buen día para ayudarte. Aquí te muestro la lista de servicios que ofrecemos:

1) ...

Responde con el número o el nombre del servicio que necesitas.`;

/**
 * Field input prompt (typical during active flow)
 */
export const FIELD_INPUT_PROMPT = `Vamos con el campo: tipo de cliente. ¿Cuál opción seleccionas?

- Persona Natural
- Empresa`;

/**
 * Field input prompt with specific field name
 */
export function createFieldPrompt(fieldName: string, options: string[] = []): string {
  const optionsLine = options.length > 0 ? `\n${options.map(o => `- ${o}`).join("\n")}` : "";
  return `Comencemos con el primero:\n\n*${fieldName}*\nPor favor, indica${optionsLine ? " una opción" : " tu respuesta"}.${optionsLine}`;
}

/**
 * Progress question prompt
 */
export const PROGRESS_QUESTION_PROMPT = `Vamos con el campo: tipo de cliente. ¿Cuál opción seleccionas?

- Persona Natural
- Empresa`;

/**
 * Initial greeting
 */
export const GREETING_PROMPT = "¿Qué servicio necesitas hoy?";

/**
 * Session states for testing
 */
export const SESSION_INIT = buildSessionState({ state: "INIT" });
export const SESSION_SERVICE_SELECTED = buildSessionState({ 
  state: "FIELD_ENTRY", 
  serviceId: "service_123",
  fieldIds: ["field1", "field2", "field3"],
  currentFieldIndex: 0,
});
export const SESSION_MID_FLOW = buildSessionState({ 
  state: "FIELD_ENTRY", 
  serviceId: "service_123",
  fieldIds: ["field1", "field2", "field3", "field4", "field5", "field6"],
  currentFieldIndex: 2,
});
export const SESSION_NEAR_COMPLETION = buildSessionState({ 
  state: "FIELD_ENTRY", 
  serviceId: "service_123",
  fieldIds: ["field1", "field2"],
  currentFieldIndex: 1,
});

/**
 * Message sequences for common scenarios
 */
export function createServiceListScenario() {
  return [
    createInboundMessage("hola"),
    createOutboundMessage(GREETING_PROMPT),
    createInboundMessage("qué servicios tiene"),
    createOutboundMessage(SERVICE_LIST_PROMPT),
  ];
}

export function createMidFlowScenario() {
  return [
    createInboundMessage("hola"),
    createOutboundMessage(GREETING_PROMPT),
    createInboundMessage("Partida de Matrimonio"),
    createOutboundMessage("Perfecto. Partida de Matrimonio seleccionado."),
    createOutboundMessage(createFieldPrompt("Ciudad", ["Bogotá", "Medellín", "Cali"])),
    createInboundMessage("Bogotá"),
  ];
}

/**
 * Off-topic test cases
 * NOTE: "redáctame" (with accent) is a known gap - the pattern in ycloudBot.helpers
 * uses "redacta|redactar" (without accent). This is a finding to address later.
 */
export interface OffTopicCase {
  description: string;
  rawText: string;
  lastOutboundContent: string;
  shouldBlockDuringActiveFlow: boolean;
  shouldBlockDuringInit: boolean;
}

export const OFF_TOPIC_CASES: OffTopicCase[] = [
  {
    description: "math homework help",
    rawText: "ayúdame con una ecuación de segundo grado",
    lastOutboundContent: GREETING_PROMPT,
    shouldBlockDuringActiveFlow: true,
    shouldBlockDuringInit: true,
  },
  {
    description: "programming question",
    rawText: "cómo hago un fetch en javascript",
    lastOutboundContent: GREETING_PROMPT,
    shouldBlockDuringActiveFlow: true,
    shouldBlockDuringInit: true,
  },
  {
    description: "joke request",
    rawText: "cuéntame un chiste",
    lastOutboundContent: GREETING_PROMPT,
    shouldBlockDuringActiveFlow: true,
    shouldBlockDuringInit: true,
  },
  {
    description: "weather query",
    rawText: "qué clima va a hacer mañana",
    lastOutboundContent: GREETING_PROMPT,
    shouldBlockDuringActiveFlow: true,
    shouldBlockDuringInit: true,
  },
  {
    description: "currency conversion",
    rawText: "cuánto vale el dólar hoy",
    lastOutboundContent: GREETING_PROMPT,
    shouldBlockDuringActiveFlow: true,
    shouldBlockDuringInit: true,
  },
  {
    description: "essay writing (with correct pattern)",
    rawText: "redacta un correo formal",
    lastOutboundContent: GREETING_PROMPT,
    shouldBlockDuringActiveFlow: true,
    shouldBlockDuringInit: true,
  },
  {
    description: "academic help",
    rawText: "me puedes ayudar con mi tarea de física",
    lastOutboundContent: GREETING_PROMPT,
    shouldBlockDuringActiveFlow: true,
    shouldBlockDuringInit: true,
  },
];

/**
 * On-topic during flow cases (should NOT be blocked)
 */
export interface OnTopicDuringFlowCase {
  description: string;
  rawText: string;
  lastOutboundContent: string;
}

export const ON_TOPIC_DURING_FLOW_CASES: OnTopicDuringFlowCase[] = [
  {
    description: "progress question",
    rawText: "en qué campo voy?",
    lastOutboundContent: PROGRESS_QUESTION_PROMPT,
  },
  {
    description: "progress question alt",
    rawText: "en que paso estamos",
    lastOutboundContent: PROGRESS_QUESTION_PROMPT,
  },
  {
    description: "short answer to field",
    rawText: "Bogotá",
    lastOutboundContent: createFieldPrompt("Ciudad", ["Bogotá", "Medellín", "Cali"]),
  },
  {
    description: "numeric answer",
    rawText: "12345678",
    lastOutboundContent: createFieldPrompt("Número de documento"),
  },
  {
    description: "confirmation yes",
    rawText: "si",
    lastOutboundContent: "¿Está correcto?",
  },
  {
    description: "confirmation no",
    rawText: "no",
    lastOutboundContent: "¿Confirmas los datos?",
  },
  {
    description: "email answer",
    rawText: "test@example.com",
    lastOutboundContent: createFieldPrompt("Correo electrónico"),
  },
];

/**
 * Service selection test cases
 */
export interface ServiceSelectionCase {
  description: string;
  rawText: string;
  expectedServiceName: string;
}

export const SERVICE_SELECTION_CASES: ServiceSelectionCase[] = [
  {
    description: "select by exact name",
    rawText: "Partida de Matrimonio",
    expectedServiceName: "Partida de Matrimonio",
  },
  {
    description: "select by partial name",
    rawText: "Matrimonio",
    expectedServiceName: "Partida de Matrimonio",
  },
  {
    description: "select by number",
    rawText: "3",
    expectedServiceName: "Partida de Matrimonio",
  },
  {
    description: "select by number 1",
    rawText: "1",
    expectedServiceName: "Alquila Pere Tantico",
  },
  {
    description: "select by shorthand",
    rawText: "escrituras",
    expectedServiceName: "Copia de Escrituras",
  },
];

/**
 * Reset command test cases
 */
export interface ResetCommandCase {
  description: string;
  rawText: string;
  expectedReset: boolean;
}

export const RESET_COMMAND_CASES: ResetCommandCase[] = [
  { description: "reset command", rawText: "reset", expectedReset: true },
  { description: "reset with slash", rawText: "/reset", expectedReset: true },
  { description: "reiniciar command", rawText: "reiniciar", expectedReset: true },
  { description: "reiniciar with slash", rawText: "/reiniciar", expectedReset: true },
  { description: "borrar command", rawText: "borrar", expectedReset: true },
  { description: "borrar memoria", rawText: "borrar memoria", expectedReset: true },
  { description: "resetear command", rawText: "resetear", expectedReset: true },
  { description: "normal text should not reset", rawText: "hola", expectedReset: false },
  { description: "service name should not reset", rawText: "Partida de Matrimonio", expectedReset: false },
];

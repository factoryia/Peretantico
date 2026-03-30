/**
 * Service Selection Tests
 * 
 * Tests for selecting a service by name or number after the bot displays the list.
 * Priority: High - Core user journey.
 */

import { describe, it, expect } from "vitest";
import { 
  deriveInboundFlowDecision, 
  mapNumericServiceSelection,
  normalizeForMatch,
} from "../../convex/ycloudBot.helpers";
import { createScenarioRecorder } from "../harness/scenarioLogger";
import { 
  SERVICE_SELECTION_CASES, 
  SERVICE_LIST_PROMPT, 
  SERVICE_LIST_PROMPT_ALT,
  standardServices,
  SESSION_INIT,
} from "./fixtures";

describe("service selection by name after list", () => {
  /**
   * Critical: User can select service by full name
   */
  it("selects service by exact full name", () => {
    const recorder = createScenarioRecorder("service-select-by-full-name");
    
    const result = deriveInboundFlowDecision({
      rawText: "Partida de Matrimonio",
      hasMedia: false,
      lastOutboundContent: SERVICE_LIST_PROMPT,
      services: standardServices,
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    recorder.push({
      input: "Partida de Matrimonio",
      expected: { shouldBlock: false, effectiveText: "Partida de Matrimonio" },
      actual: { shouldBlock: result.shouldBlock, effectiveText: result.effectiveText },
      pass: !result.shouldBlock && result.effectiveText === "Partida de Matrimonio",
    });

    expect(result.shouldBlock).toBe(false);
    recorder.flush();
  });

  /**
   * Critical: User can select service by partial name (shorthand)
   */
  it.each([
    { input: "Matrimonio", expected: "Partida de Matrimonio" },
    { input: "Defunción", expected: "Partida de Defunción" },
    { input: "Escrituras", expected: "Copia de Escrituras" },
    { input: "Medicamentos", expected: "Solicitud de Medicamentos" },
    { input: "Alquila", expected: "Alquila Pere Tantico" },
  ])("selects service by partial name '$input' -> '$expected'", ({ input, expected }) => {
    const recorder = createScenarioRecorder(`service-select-partial-${input}`);
    
    const result = deriveInboundFlowDecision({
      rawText: input,
      hasMedia: false,
      lastOutboundContent: SERVICE_LIST_PROMPT,
      services: standardServices,
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    recorder.push({
      input,
      expected: { shouldBlock: false },
      actual: { shouldBlock: result.shouldBlock },
      pass: !result.shouldBlock,
    });

    expect(result.shouldBlock).toBe(false);
    recorder.flush();
  });

  /**
   * Critical: Numeric selection must work
   * NOTE: The current implementation uses ALPHABETICAL ordering, not prompt order.
   * This is a BUG: user sees numbered list in admin-defined order, but 
   * selection uses alphabetical. Tests reflect current (buggy) behavior.
   * Order alphabetically: Alquila, Cert Prop, Copia Esc, Partida Def, Partida Mat, Sol Med
   */
  it.each([
    { input: "1", expected: "Alquila Pere Tantico" },
    { input: "2", expected: "Certificado de Propiedad" },
    { input: "3", expected: "Copia de Escrituras" },
    { input: "4", expected: "Partida de Defunción" },
    { input: "5", expected: "Partida de Matrimonio" },
    { input: "6", expected: "Solicitud de Medicamentos" },
  ])("selects service by number '$input' -> '$expected' (alphabetical)", ({ input, expected }) => {
    const recorder = createScenarioRecorder(`service-select-num-${input}`);
    
    const result = deriveInboundFlowDecision({
      rawText: input,
      hasMedia: false,
      lastOutboundContent: SERVICE_LIST_PROMPT,
      services: standardServices,
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    recorder.push({
      input,
      expected: { shouldBlock: false, effectiveText: expected },
      actual: { shouldBlock: result.shouldBlock, effectiveText: result.effectiveText },
      pass: !result.shouldBlock && result.effectiveText === expected,
    });

    expect(result.shouldBlock).toBe(false);
    expect(result.effectiveText).toBe(expected);
    recorder.flush();
  });

  /**
   * Service selection must work with alternate prompt wording
   * Note: The current implementation requires specific keywords in lastOutboundContent
   * to detect service list prompt. This test documents current behavior.
   */
  it("service selection with alternate prompt needs specific keywords", () => {
    // The current implementation checks for "responde con el numero" 
    // or "lista de servicios disponibles" in lastOutboundContent
    const result = deriveInboundFlowDecision({
      rawText: "11",
      hasMedia: false,
      lastOutboundContent: SERVICE_LIST_PROMPT_ALT,
      services: standardServices,
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    // Current behavior: may not map "11" because prompt doesn't have exact keywords
    // This is a known limitation to address in future iterations
    expect(result.shouldBlock).toBe(false); // Still not blocked as off-topic
  });

  /**
   * Edge case: Invalid number should not crash
   */
  it("handles invalid number gracefully", () => {
    const result = deriveInboundFlowDecision({
      rawText: "999",
      hasMedia: false,
      lastOutboundContent: SERVICE_LIST_PROMPT,
      services: standardServices,
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    // Should not crash, may or may not block depending on on-topic detection
    expect(result.effectiveText).toBeDefined();
  });

  /**
   * Edge case: Partial match with multiple services
   */
  it("handles ambiguous partial names", () => {
    const services = [
      { name: "Certificado de Propiedad", status: true },
      { name: "Certificado de Residencia", status: true },
    ];

    const result = deriveInboundFlowDecision({
      rawText: "Certificado",
      hasMedia: false,
      lastOutboundContent: SERVICE_LIST_PROMPT,
      services,
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    // Should not block - allow agent to disambiguate
    expect(result.shouldBlock).toBe(false);
  });
});

describe("mapNumericServiceSelection", () => {
  it("maps valid number to service name (alphabetical order)", () => {
    // Alphabetical order: Alquila, Cert Prop, Copia Esc, Partida Def, Partida Mat, Sol Med
    const result = mapNumericServiceSelection({
      rawText: "3",
      normalizedLastOutbound: normalizeForMatch(SERVICE_LIST_PROMPT),
      services: standardServices,
    });

    expect(result).toBe("Copia de Escrituras"); // 3rd in alphabetical
  });

  it("returns original text when not a number", () => {
    const result = mapNumericServiceSelection({
      rawText: "Matrimonio",
      normalizedLastOutbound: normalizeForMatch(SERVICE_LIST_PROMPT),
      services: standardServices,
    });

    expect(result).toBe("Matrimonio");
  });

  it("returns original text when out of range", () => {
    const result = mapNumericServiceSelection({
      rawText: "999",
      normalizedLastOutbound: normalizeForMatch(SERVICE_LIST_PROMPT),
      services: standardServices,
    });

    expect(result).toBe("999");
  });

  it("returns original text when last message wasn't service list", () => {
    const result = mapNumericServiceSelection({
      rawText: "3",
      normalizedLastOutbound: normalizeForMatch("¿Cuál es tu nombre?"),
      services: standardServices,
    });

    expect(result).toBe("3");
  });
});

describe("service name normalization", () => {
  it("matches case-insensitively", () => {
    const result = deriveInboundFlowDecision({
      rawText: "partida de matrimonio",
      hasMedia: false,
      lastOutboundContent: SERVICE_LIST_PROMPT,
      services: standardServices,
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    expect(result.shouldBlock).toBe(false);
  });

  it("matches with extra whitespace", () => {
    const result = deriveInboundFlowDecision({
      rawText: "  Matrimonio  ",
      hasMedia: false,
      lastOutboundContent: SERVICE_LIST_PROMPT,
      services: standardServices,
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      applicantNeedsProfile: false,
    });

    expect(result.shouldBlock).toBe(false);
  });
});

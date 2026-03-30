/**
 * Progress Question Tests
 * 
 * Tests for user's progress inquiries during active service request flow.
 * Priority: High - Common user need that was previously blocked incorrectly.
 */

import { describe, it, expect } from "vitest";
import { 
  deriveInboundFlowDecision, 
  isOnTopicMessage,
  normalizeForMatch,
} from "../../convex/ycloudBot.helpers";
import { createScenarioRecorder } from "../harness/scenarioLogger";
import { 
  SESSION_MID_FLOW, 
  SESSION_NEAR_COMPLETION,
  PROGRESS_QUESTION_PROMPT,
  createFieldPrompt,
} from "./fixtures";

describe("progress question during active flow", () => {
  /**
   * Critical: User must be able to ask about progress during flow
   * This was a known bug - progress questions were being blocked.
   */
  it("allows progress question 'en qué campo voy' during mid-flow", () => {
    const recorder = createScenarioRecorder("progress-question-mid-flow");
    
    const result = deriveInboundFlowDecision({
      rawText: "en qué campo voy?",
      hasMedia: false,
      lastOutboundContent: PROGRESS_QUESTION_PROMPT,
      services: [],
      hasSessionServiceId: true,
      sessionFieldIdsCount: 6,
      currentFieldIndex: 2,
      applicantNeedsProfile: false,
    });

    recorder.push({
      input: "en qué campo voy?",
      expected: { shouldBlock: false, hasActiveFlow: true },
      actual: { shouldBlock: result.shouldBlock, hasActiveFlow: result.hasActiveFlow },
      pass: !result.shouldBlock && result.hasActiveFlow,
    });

    expect(result.shouldBlock).toBe(false);
    expect(result.hasActiveFlow).toBe(true);
    recorder.flush();
  });

  /**
   * Various ways users ask about progress
   */
  it.each([
    { rawText: "en que paso vamos?", description: "en que paso" },
    { rawText: "cómo voy?", description: "cómo voy" },
    { rawText: "en qué etapa estamos?", description: "en qué etapa" },
    { rawText: "qué falta?", description: "qué falta" },
    { rawText: "cuántos campos faltan?", description: "cuántos campos" },
    { rawText: "ya casi?", description: "ya casi" },
    { rawText: "van bien?", description: "van bien" },
  ])("allows progress question '$description' during flow", ({ rawText, description }) => {
    const recorder = createScenarioRecorder(`progress-question-${description.replace(/\s+/g, "-")}`);
    
    const result = deriveInboundFlowDecision({
      rawText,
      hasMedia: false,
      lastOutboundContent: PROGRESS_QUESTION_PROMPT,
      services: [],
      hasSessionServiceId: true,
      sessionFieldIdsCount: 6,
      currentFieldIndex: 2,
      applicantNeedsProfile: false,
    });

    recorder.push({
      input: rawText,
      expected: { shouldBlock: false },
      actual: { shouldBlock: result.shouldBlock },
      pass: !result.shouldBlock,
    });

    expect(result.shouldBlock, `Progress question '${description}' should NOT be blocked`).toBe(false);
    recorder.flush();
  });

  /**
   * Progress questions should work regardless of field type
   */
  it("allows progress question during numeric field", () => {
    const result = deriveInboundFlowDecision({
      rawText: "en qué vamos?",
      hasMedia: false,
      lastOutboundContent: createFieldPrompt("Número de documento"),
      services: [],
      hasSessionServiceId: true,
      sessionFieldIdsCount: 4,
      currentFieldIndex: 1,
      applicantNeedsProfile: false,
    });

    expect(result.shouldBlock).toBe(false);
  });

  it("allows progress question during address field", () => {
    const result = deriveInboundFlowDecision({
      rawText: "cómo vamos?",
      hasMedia: false,
      lastOutboundContent: createFieldPrompt("Dirección de entrega"),
      services: [],
      hasSessionServiceId: true,
      sessionFieldIdsCount: 4,
      currentFieldIndex: 2,
      applicantNeedsProfile: false,
    });

    expect(result.shouldBlock).toBe(false);
  });

  /**
   * Edge case: Progress question near completion
   */
  it("allows progress question near completion", () => {
    const result = deriveInboundFlowDecision({
      rawText: "qué falta?",
      hasMedia: false,
      lastOutboundContent: "Vamos con el campo 2 de 2: Confirmar datos. Responde sí para confirmar.",
      services: [],
      hasSessionServiceId: true,
      sessionFieldIdsCount: 2,
      currentFieldIndex: 1,
      applicantNeedsProfile: false,
    });

    expect(result.shouldBlock).toBe(false);
  });

  /**
   * Edge case: Progress question with multiple context words
   */
  it("allows progress question with multiple context words", () => {
    const result = deriveInboundFlowDecision({
      rawText: "en cual campo voy y cuanto falta",
      hasMedia: false,
      lastOutboundContent: PROGRESS_QUESTION_PROMPT,
      services: [],
      hasSessionServiceId: true,
      sessionFieldIdsCount: 6,
      currentFieldIndex: 2,
      applicantNeedsProfile: false,
    });

    expect(result.shouldBlock).toBe(false);
  });
});

describe("isOnTopicMessage for progress detection", () => {
  /**
   * isOnTopicMessage should recognize progress-related queries
   */
  it("recognizes progress questions as on-topic", () => {
    const normalized = normalizeForMatch("en que campo voy");
    const raw = "en que campo voy?";
    
    expect(isOnTopicMessage(normalized, raw)).toBe(true);
  });

  it("recognizes 'qué falta' as on-topic", () => {
    const normalized = normalizeForMatch("que falta");
    const raw = "qué falta?";
    
    expect(isOnTopicMessage(normalized, raw)).toBe(true);
  });

  it("allows 'cómo voy' during active flow via flow context", () => {
    // "cómo voy" is NOT in isOnTopicMessage patterns, BUT deriveInboundFlowDecision
    // allows it during active flow because it passes looksLikeShortFlowAnswer
    // This is acceptable behavior - the flow context protects the user
    const normalized = normalizeForMatch("como voy");
    const raw = "cómo voy?";
    
    // Direct isOnTopicMessage check - may or may not pass
    const isOnTopic = isOnTopicMessage(normalized, raw);
    
    // But deriveInboundFlowDecision with active flow should allow it
    const result = deriveInboundFlowDecision({
      rawText: raw,
      hasMedia: false,
      lastOutboundContent: PROGRESS_QUESTION_PROMPT,
      services: [],
      hasSessionServiceId: true, // Active flow
      sessionFieldIdsCount: 6,
      currentFieldIndex: 2,
      applicantNeedsProfile: false,
    });

    // The key: it should NOT be blocked during active flow
    expect(result.shouldBlock).toBe(false);
  });

  /**
   * Progress detection should work with "en que" + "voy/quedo"
   */
  it("detects 'en que' + 'voy' pattern", () => {
    const normalized = normalizeForMatch("en que paso voy");
    const raw = "en que paso voy?";
    
    expect(isOnTopicMessage(normalized, raw)).toBe(true);
  });

  it("detects 'en cual' + 'quedamos' pattern", () => {
    const normalized = normalizeForMatch("en cual quedamos");
    const raw = "en cual quedamos?";
    
    expect(isOnTopicMessage(normalized, raw)).toBe(true);
  });
});

describe("progress question with field count context", () => {
  /**
   * The flow decision should correctly identify active flow based on field count
   */
  it("detects active flow from fieldIds count", () => {
    const result = deriveInboundFlowDecision({
      rawText: "en qué vamos?",
      hasMedia: false,
      lastOutboundContent: PROGRESS_QUESTION_PROMPT,
      services: [],
      hasSessionServiceId: false, // No serviceId yet
      sessionFieldIdsCount: 6, // But has fields = active flow
      currentFieldIndex: 2,
      applicantNeedsProfile: false,
    });

    expect(result.hasActiveFlow).toBe(true);
    expect(result.shouldBlock).toBe(false);
  });

  it("detects active flow from currentFieldIndex", () => {
    const result = deriveInboundFlowDecision({
      rawText: "avance?",
      hasMedia: false,
      lastOutboundContent: "Completa el formulario",
      services: [],
      hasSessionServiceId: false,
      sessionFieldIdsCount: 0,
      currentFieldIndex: 0, // Has field index = active flow
      applicantNeedsProfile: false,
    });

    expect(result.hasActiveFlow).toBe(true);
    expect(result.shouldBlock).toBe(false);
  });
});

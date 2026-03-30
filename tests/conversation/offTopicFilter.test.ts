/**
 * Off-Topic Filter Tests
 * 
 * Tests for the off-topic detection during active conversation flows.
 * Priority: High - Critical guard against irrelevant messages.
 */

import { describe, it, expect } from "vitest";
import { 
  deriveInboundFlowDecision, 
  isStronglyOffTopic, 
  isOnTopicMessage,
  normalizeForMatch,
  getUnsupportedIntentReply,
} from "../../convex/ycloudBot.helpers";
import { createScenarioRecorder } from "../harness/scenarioLogger";
import { OFF_TOPIC_CASES, ON_TOPIC_DURING_FLOW_CASES, SESSION_INIT, SESSION_MID_FLOW } from "./fixtures";

describe("off-topic filter during active flow", () => {
  /**
   * Critical: Off-topic messages during active flow MUST be blocked
   * to prevent noise from confusing the agent.
   */
  it.each(OFF_TOPIC_CASES)(
    "blocks off-topic '$description' during active flow",
    ({ description, rawText, lastOutboundContent }) => {
      const recorder = createScenarioRecorder(`offtopic-during-flow-${description.replace(/\s+/g, "-")}`);
      
      const result = deriveInboundFlowDecision({
        rawText,
        hasMedia: false,
        lastOutboundContent,
        services: [],
        hasSessionServiceId: true, // Active flow
        sessionFieldIdsCount: 6,
        currentFieldIndex: 2,
        applicantNeedsProfile: false,
      });

      recorder.push({
        input: rawText,
        expected: { shouldBlock: true },
        actual: { shouldBlock: result.shouldBlock },
        pass: result.shouldBlock === true,
      });

      expect(result.shouldBlock, `Off-topic '${description}' should be blocked during flow`).toBe(true);
      recorder.flush();
    }
  );

  /**
   * Critical: Off-topic messages during INIT should also be blocked
   * unless explicitly asking for services.
   */
  it.each(OFF_TOPIC_CASES)(
    "blocks off-topic '$description' during INIT state",
    ({ description, rawText, lastOutboundContent }) => {
      const recorder = createScenarioRecorder(`offtopic-during-init-${description.replace(/\s+/g, "-")}`);
      
      const result = deriveInboundFlowDecision({
        rawText,
        hasMedia: false,
        lastOutboundContent, // Usually greeting
        services: [],
        hasSessionServiceId: false,
        sessionFieldIdsCount: 0,
        applicantNeedsProfile: false,
      });

      recorder.push({
        input: rawText,
        expected: { shouldBlock: true },
        actual: { shouldBlock: result.shouldBlock },
        pass: result.shouldBlock === true,
      });

      expect(result.shouldBlock, `Off-topic '${description}' should be blocked during INIT`).toBe(true);
      recorder.flush();
    }
  );

  /**
   * Critical: On-topic messages during active flow must NOT be blocked
   * This is the regression we're protecting against.
   */
  it.each(ON_TOPIC_DURING_FLOW_CASES)(
    "allows on-topic '$description' during active flow",
    ({ description, rawText, lastOutboundContent }) => {
      const recorder = createScenarioRecorder(`ontopic-during-flow-${description.replace(/\s+/g, "-")}`);
      
      const result = deriveInboundFlowDecision({
        rawText,
        hasMedia: false,
        lastOutboundContent,
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
        pass: result.shouldBlock === false,
      });

      expect(result.shouldBlock, `On-topic '${description}' should NOT be blocked during flow`).toBe(false);
      recorder.flush();
    }
  );

  /**
   * Edge case: Progress questions are explicitly on-topic
   */
  it("allows progress question 'en qué campo voy' during flow", () => {
    const recorder = createScenarioRecorder("progress-question-on-topic");
    
    const result = deriveInboundFlowDecision({
      rawText: "en qué campo voy?",
      hasMedia: false,
      lastOutboundContent: "Vamos con el campo: tipo de cliente. ¿Cuál opción seleccionas?",
      services: [{ name: "Alquila Pere Tantico", status: true }],
      hasSessionServiceId: true,
      sessionFieldIdsCount: 6,
      currentFieldIndex: 2,
      applicantNeedsProfile: false,
    });

    recorder.push({
      input: "en qué campo voy?",
      expected: { shouldBlock: false },
      actual: { shouldBlock: result.shouldBlock },
      pass: result.shouldBlock === false,
    });

    expect(result.shouldBlock).toBe(false);
    expect(result.hasActiveFlow).toBe(true);
    recorder.flush();
  });

  /**
   * Edge case: Messages with context hint should be allowed
   */
  it("allows messages that reference flow context", () => {
    const result = deriveInboundFlowDecision({
      rawText: "voy bien?",
      hasMedia: false,
      lastOutboundContent: "Vamos con el campo 3 de 6: Correo electrónico. Por favor ingresa tu correo.",
      services: [],
      hasSessionServiceId: true,
      sessionFieldIdsCount: 6,
      currentFieldIndex: 2,
      applicantNeedsProfile: false,
    });

    // Should allow due to context keywords
    expect(result.shouldBlock).toBe(false);
  });
});

describe("isStronglyOffTopic pattern matching", () => {
  it("detects math-related queries", () => {
    const normalized = normalizeForMatch("ayúdame con una ecuación");
    expect(isStronglyOffTopic(normalized, "ayúdame con una ecuación")).toBe(true);
  });

  it("detects programming queries", () => {
    const normalized = normalizeForMatch("cómo hago un fetch en javascript");
    expect(isStronglyOffTopic(normalized, "cómo hago un fetch en javascript")).toBe(true);
  });

  it("detects joke requests", () => {
    const normalized = normalizeForMatch("cuéntame un chiste");
    expect(isStronglyOffTopic(normalized, "cuéntame un chiste")).toBe(true);
  });

  it("detects weather queries", () => {
    const normalized = normalizeForMatch("qué clima va a hacer mañana");
    expect(isStronglyOffTopic(normalized, "qué clima va a hacer mañana")).toBe(true);
  });

  it("detects currency conversion", () => {
    const normalized = normalizeForMatch("cuánto vale el dólar hoy");
    expect(isStronglyOffTopic(normalized, "cuánto vale el dólar hoy")).toBe(true);
  });

  it("does not flag service-related queries", () => {
    const normalized = normalizeForMatch("quiero solicitar un servicio");
    expect(isStronglyOffTopic(normalized, "quiero solicitar un servicio")).toBe(false);
  });
});

describe("getUnsupportedIntentReply", () => {
  it("returns consistent guard reply", () => {
    const reply = getUnsupportedIntentReply();
    
    expect(reply).toContain("solo puedo ayudarte");
    expect(reply).toContain("servicios de Pere Tantico");
    expect(reply).toContain("REQ-");
  });
});

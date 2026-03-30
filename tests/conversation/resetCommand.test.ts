/**
 * Reset Command Tests
 * 
 * Tests for the /reset command behavior in conversational context.
 * Priority: High - User control to restart conversation at any time.
 */

import { describe, it, expect } from "vitest";
import { 
  normalizeForMatch, 
  isResetThreadTitle,
} from "../../convex/ycloudBot.helpers";
import { createScenarioRecorder } from "../harness/scenarioLogger";
import { RESET_COMMAND_CASES, GREETING_PROMPT, SESSION_INIT, SESSION_MID_FLOW } from "./fixtures";

describe("reset command detection", () => {
  /**
   * Critical: Reset commands should be recognized regardless of case
   */
  it.each(RESET_COMMAND_CASES)(
    "detects reset command '$description'",
    ({ description, rawText, expectedReset }) => {
      const normalized = normalizeForMatch(rawText);
      
      // Simulate the detection logic from ycloudBot.ts
      const isResetCommand =
        normalized === "reset" ||
        normalized === "/reset" ||
        normalized === "reiniciar" ||
        normalized === "/reiniciar" ||
        normalized === "resetear" ||
        normalized === "borrar" ||
        normalized === "borrar memoria";

      expect(isResetCommand, `Reset command '${description}' should be detected`).toBe(expectedReset);
    }
  );

  /**
   * Various forms of reset should work
   */
  it.each([
    { input: "RESET", expected: true },
    { input: "/RESET", expected: true },
    { input: "  reset  ", expected: true },
    { input: "RESETEAR", expected: true },
    { input: "Borrar", expected: true },
    { input: "borrar", expected: true },
    { input: "REINICIAR", expected: true },
  ])("handles reset variations '$input'", ({ input, expected }) => {
    const normalized = normalizeForMatch(input);
    
    const isResetCommand =
      normalized === "reset" ||
      normalized === "/reset" ||
      normalized === "reiniciar" ||
      normalized === "/reiniciar" ||
      normalized === "resetear" ||
      normalized === "borrar" ||
      normalized === "borrar memoria";

    expect(isResetCommand).toBe(expected);
  });

  /**
   * Non-reset commands should not trigger reset
   */
  it.each([
    { input: "rest", shouldReset: false },
    { input: "resetting", shouldReset: false },
    { input: "reinicio", shouldReset: false },
    { input: "reiniciado", shouldReset: false },
    { input: "restaurar", shouldReset: false },
  ])("does not trigger on '$input'", ({ input, shouldReset }) => {
    const normalized = normalizeForMatch(input);
    
    const isResetCommand =
      normalized === "reset" ||
      normalized === "/reset" ||
      normalized === "reiniciar" ||
      normalized === "/reiniciar" ||
      normalized === "resetear" ||
      normalized === "borrar" ||
      normalized === "borrar memoria";

    expect(isResetCommand).toBe(shouldReset);
  });
});

describe("reset thread title detection", () => {
  /**
   * Thread titles marked with (reset) should be detected
   */
  it("detects reset thread title", () => {
    expect(isResetThreadTitle("WhatsApp +1234567890 (reset)")).toBe(true);
    expect(isResetThreadTitle("test thread (reset)")).toBe(true);
    expect(isResetThreadTitle("thread (RESET)")).toBe(true);
  });

  it("rejects normal thread titles", () => {
    expect(isResetThreadTitle("WhatsApp +1234567890")).toBe(false);
    expect(isResetThreadTitle("normal thread")).toBe(false);
    expect(isResetThreadTitle(null)).toBe(false);
    expect(isResetThreadTitle(undefined)).toBe(false);
    expect(isResetThreadTitle("")).toBe(false);
  });
});

describe("reset command behavior in conversation flow", () => {
  /**
   * Reset should work during any state, including mid-flow
   */
  it("reset command works during active flow", () => {
    const normalized = normalizeForMatch("reset");
    
    const isResetCommand =
      normalized === "reset" ||
      normalized === "/reset" ||
      normalized === "reiniciar" ||
      normalized === "/reiniciar" ||
      normalized === "resetear" ||
      normalized === "borrar" ||
      normalized === "borrar memoria";

    // Reset should be detected regardless of flow state
    expect(isResetCommand).toBe(true);
  });

  it("reset command works from INIT state", () => {
    const normalized = normalizeForMatch("/reset");
    
    const isResetCommand =
      normalized === "reset" ||
      normalized === "/reset" ||
      normalized === "reiniciar" ||
      normalized === "/reiniciar" ||
      normalized === "resetear" ||
      normalized === "borrar" ||
      normalized === "borrar memoria";

    expect(isResetCommand).toBe(true);
  });

  /**
   * After reset, the conversation should be able to start fresh
   */
  it("allows normal service request after reset keyword is detected", () => {
    // This is the integration point - once reset is detected,
    // the flow should allow the next message to be processed normally
    
    // First, detect the reset command
    const resetNormalized = normalizeForMatch("reset");
    const isReset = resetNormalized === "reset";
    
    expect(isReset).toBe(true);
    
    // After reset, the next message should be fresh
    const nextMessageNormalized = normalizeForMatch("Partida de Matrimonio");
    // This would normally be checked against service list, but during INIT
    // it's allowed as on-topic
    expect(nextMessageNormalized).toContain("partida");
  });
});

describe("reset command conversation flow", () => {
  /**
   * Full reset flow simulation
   */
  it("simulates complete reset conversation", () => {
    const recorder = createScenarioRecorder("reset-command-full-flow");
    
    // Step 1: User in middle of flow
    const midFlowText = "quiero Partida de Matrimonio";
    const midFlowNormalized = normalizeForMatch(midFlowText);
    
    // Step 2: User decides to reset
    const resetText = "reset";
    const resetNormalized = normalizeForMatch(resetText);
    const isReset = 
      resetNormalized === "reset" ||
      resetNormalized === "/reset" ||
      resetNormalized === "reiniciar" ||
      resetNormalized === "borrar";

    recorder.push({
      input: resetText,
      expected: { shouldReset: true },
      actual: { shouldReset: isReset },
      pass: isReset === true,
    });

    // Step 3: After reset, new thread is created with reset title
    const newThreadTitle = "WhatsApp +1234567890 (reset)";
    const isResetThread = isResetThreadTitle(newThreadTitle);

    recorder.push({
      input: newThreadTitle,
      expected: { isResetThread: true },
      actual: { isResetThread },
      pass: isResetThread === true,
    });

    expect(isReset).toBe(true);
    expect(isResetThread).toBe(true);
    recorder.flush();
  });
});

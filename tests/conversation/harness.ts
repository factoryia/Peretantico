/**
 * Conversational Test Harness
 * 
 * Reusable building blocks for TDD conversational agent tests.
 * Provides declarative scenario construction without full LLM mocking.
 */

import { vi } from "vitest";
import {
  deriveInboundFlowDecision,
  buildInboundContextPrompt,
  normalizeForMatch,
  isStronglyOffTopic,
  isOnTopicMessage,
  shouldBlockMessage,
  getUnsupportedIntentReply,
  mapNumericServiceSelection,
  isResetThreadTitle,
} from "../../convex/ycloudBot.helpers";

export {
  deriveInboundFlowDecision,
  buildInboundContextPrompt,
  normalizeForMatch,
  isStronglyOffTopic,
  isOnTopicMessage,
  shouldBlockMessage,
  getUnsupportedIntentReply,
  mapNumericServiceSelection,
  isResetThreadTitle,
};

/**
 * Session state builder for creating test scenarios
 */
export interface SessionStateInput {
  state?: string;
  serviceId?: string | null;
  fieldIds?: string[] | null;
  currentFieldIndex?: number | null;
  profileId?: string | null;
  threadId?: string | null;
}

export function buildSessionState(input: SessionStateInput = {}): SessionStateInput {
  return {
    state: input.state ?? "INIT",
    serviceId: input.serviceId ?? null,
    fieldIds: input.fieldIds ?? null,
    currentFieldIndex: input.currentFieldIndex ?? null,
    profileId: input.profileId ?? null,
    threadId: input.threadId ?? null,
  };
}

/**
 * Service fixture builder
 */
export interface ServiceFixture {
  name: string;
  status: boolean;
  price?: number;
}

export interface ServiceBuilder {
  name: string;
  status: boolean;
  price?: number;
  withPrice(price: number): ServiceBuilder;
  build(): ServiceFixture;
}

export function createService(name: string): ServiceBuilder {
  return {
    name,
    status: true,
    withPrice(price: number) {
      this.price = price;
      return this;
    },
    build(): ServiceFixture {
      return {
        name: this.name,
        status: this.status,
        price: this.price,
      };
    },
  };
}

/**
 * Conversation message builder
 */
export interface MessageFixture {
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  mediaType?: string;
  createdAt?: number;
}

export function createInboundMessage(content: string): MessageFixture {
  return { direction: "INBOUND", content };
}

export function createOutboundMessage(content: string): MessageFixture {
  return { direction: "OUTBOUND", content };
}

/**
 * Scenario builder for conversational tests
 */
export interface ScenarioInput {
  contactId: string;
  customerName?: string;
  session: SessionStateInput;
  messages: MessageFixture[];
  services: ServiceFixture[];
  rawText: string;
  mediaUrl?: string;
  mediaType?: string;
}

export interface ScenarioContext {
  contactId: string;
  customerName?: string;
  session: ReturnType<typeof buildSessionState>;
  messages: MessageFixture[];
  services: ServiceFixture[];
  rawText: string;
  mediaUrl?: string;
  mediaType?: string;
  lastOutboundContent: string;
  hasSessionServiceId: boolean;
  sessionFieldIdsCount: number;
  hasActiveFlow: boolean;
  applicantNeedsProfile: boolean;
}

export function buildScenario(input: ScenarioInput): ScenarioContext {
  const session = buildSessionState(input.session);
  
  // Find last outbound message for flow detection
  const reversed = [...input.messages].reverse();
  const lastOutbound = reversed.find(m => m.direction === "OUTBOUND");
  const lastOutboundContent = lastOutbound?.content ?? "";

  const hasSessionServiceId = Boolean(session.serviceId);
  const sessionFieldIdsCount = Array.isArray(session.fieldIds) ? session.fieldIds.length : 0;
  const hasActiveFlow = hasSessionServiceId || sessionFieldIdsCount > 0 || typeof session.currentFieldIndex === "number";
  const applicantNeedsProfile = false; // Default for most tests

  return {
    contactId: input.contactId,
    customerName: input.customerName,
    session,
    messages: input.messages,
    services: input.services,
    rawText: input.rawText,
    mediaUrl: input.mediaUrl,
    mediaType: input.mediaType,
    lastOutboundContent,
    hasSessionServiceId,
    sessionFieldIdsCount,
    hasActiveFlow,
    applicantNeedsProfile,
  };
}

/**
 * Run flow decision for a scenario
 */
export function runFlowDecision(ctx: ScenarioContext) {
  return deriveInboundFlowDecision({
    rawText: ctx.rawText,
    hasMedia: Boolean(ctx.mediaUrl || ctx.mediaType),
    lastOutboundContent: ctx.lastOutboundContent,
    services: ctx.services,
    hasSessionServiceId: ctx.hasSessionServiceId,
    sessionFieldIdsCount: ctx.sessionFieldIdsCount,
    currentFieldIndex: typeof ctx.session.currentFieldIndex === "number" 
      ? ctx.session.currentFieldIndex 
      : undefined,
    applicantNeedsProfile: ctx.applicantNeedsProfile,
  });
}

/**
 * Build context prompt for agent
 */
export function buildContextPrompt(ctx: ScenarioContext) {
  return buildInboundContextPrompt({
    contactId: ctx.contactId,
    effectiveText: runFlowDecision(ctx).effectiveText,
    resolvedProfileId: ctx.session.profileId,
    resolvedProfileName: ctx.customerName,
    mediaType: ctx.mediaType ?? null,
    mediaUrl: ctx.mediaUrl ?? null,
    sessionState: ctx.session.state ?? null,
    serviceId: ctx.session.serviceId,
    currentFieldIndex: ctx.session.currentFieldIndex,
  });
}

/**
 * Mock Convex context for integration tests
 */
export interface MockConvexContext {
  runQuery: ReturnType<typeof vi.fn>;
  runMutation: ReturnType<typeof vi.fn>;
  runAction: ReturnType<typeof vi.fn>;
}

export function createMockConvexContext(): MockConvexContext {
  return {
    runQuery: vi.fn().mockResolvedValue(null),
    runMutation: vi.fn().mockResolvedValue({}),
    runAction: vi.fn().mockResolvedValue({}),
  };
}

import { expect } from "vitest";

/**
 * Assertion helpers for conversational tests
 */
export function assertNotBlocked(result: ReturnType<typeof deriveInboundFlowDecision>, scenario: string) {
  expect(result.shouldBlock, `[${scenario}] should not be blocked`).toBe(false);
}

export function assertBlocked(result: ReturnType<typeof deriveInboundFlowDecision>, scenario: string) {
  expect(result.shouldBlock, `[${scenario}] should be blocked`).toBe(true);
}

export function assertFlowActive(result: ReturnType<typeof deriveInboundFlowDecision>, scenario: string) {
  expect(result.hasActiveFlow, `[${scenario}] flow should be active`).toBe(true);
}

export function assertFlowInactive(result: ReturnType<typeof deriveInboundFlowDecision>, scenario: string) {
  expect(result.hasActiveFlow, `[${scenario}] flow should be inactive`).toBe(false);
}

import { definePlaygroundAPI } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { tanticoAgent } from "./system/ai/agents/tanticoAgent";

export const {
  isApiKeyValid,
  listAgents,
  listUsers,
  listThreads,
  listMessages,
  createThread,
  generateText,
  fetchPromptContext,
} = definePlaygroundAPI(components.agent, {
  agents: [tanticoAgent],
});

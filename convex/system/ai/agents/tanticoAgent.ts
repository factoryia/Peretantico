import { google } from "@ai-sdk/google";
import { Agent } from "@convex-dev/agent";
import type { AgentComponent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";
import { TANTICO_AGENT_PROMPT } from "../constants";
import type { LanguageModel } from "ai";

const agentComponent = (components as unknown as { agent: AgentComponent }).agent;

export const tanticoAgent = new Agent(agentComponent, {
  name: "Tantico",
  languageModel: google("gemini-2.5-flash-lite") as unknown as LanguageModel,
  instructions: TANTICO_AGENT_PROMPT,
});

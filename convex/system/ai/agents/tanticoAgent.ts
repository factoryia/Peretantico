import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";
import { TANTICO_AGENT_PROMPT } from "../constants";

const agentComponent = components.agent;

export const tanticoAgent = new Agent(agentComponent, {
  name: "Tantico",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: TANTICO_AGENT_PROMPT,
});

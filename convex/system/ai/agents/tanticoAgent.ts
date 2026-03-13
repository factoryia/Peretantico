import { openai } from "@ai-sdk/openai";
import { Agent } from "@convex-dev/agent";
import { components } from "../../../_generated/api";
import { TANTICO_AGENT_PROMPT } from "../constants";
import { searchProfileByNumber } from "../tools/searchProfileByNumber";
import { getSpecialDateToday } from "../tools/getSpecialDateToday";
import { listServices } from "../tools/listServices";
import { getServiceFields } from "../tools/getServiceFields";
import { validateServiceField } from "../tools/validateServiceField";
import { createApplicantProfile } from "../tools/createApplicantProfile";
import { createRequest } from "../tools/createRequest";
import { getRequestStatus } from "../tools/getRequestStatus";

const agentComponent = components.agent;

export const tanticoAgent = new Agent(agentComponent, {
  name: "Tantico",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: TANTICO_AGENT_PROMPT,
  maxSteps: 5,
  tools: {
    searchProfileByNumber,
    getSpecialDateToday,
    listServices,
    getServiceFields,
    validateServiceField,
    createApplicantProfile,
    createRequest,
    getRequestStatus,
  },
});

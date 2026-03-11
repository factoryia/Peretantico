/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as coverageAreas from "../coverageAreas.js";
import type * as dashboard from "../dashboard.js";
import type * as debug from "../debug.js";
import type * as distributors from "../distributors.js";
import type * as emails from "../emails.js";
import type * as files from "../files.js";
import type * as findAccount from "../findAccount.js";
import type * as fixAdmin from "../fixAdmin.js";
import type * as http from "../http.js";
import type * as payments from "../payments.js";
import type * as profiles from "../profiles.js";
import type * as requests from "../requests.js";
import type * as seed from "../seed.js";
import type * as services from "../services.js";
import type * as specialDates from "../specialDates.js";
import type * as system_ai_agents_tanticoAgent from "../system/ai/agents/tanticoAgent.js";
import type * as system_ai_constants from "../system/ai/constants.js";
import type * as system_ai_tools_createRequest from "../system/ai/tools/createRequest.js";
import type * as system_ai_tools_getServiceFields from "../system/ai/tools/getServiceFields.js";
import type * as system_ai_tools_getSpecialDateToday from "../system/ai/tools/getSpecialDateToday.js";
import type * as system_ai_tools_listServices from "../system/ai/tools/listServices.js";
import type * as system_ai_tools_searchProfileByNumber from "../system/ai/tools/searchProfileByNumber.js";
import type * as system_ai_tools_validateServiceField from "../system/ai/tools/validateServiceField.js";
import type * as system_gemini from "../system/gemini.js";
import type * as system_tanticoPrompt from "../system/tanticoPrompt.js";
import type * as transportationTypes from "../transportationTypes.js";
import type * as users from "../users.js";
import type * as whatsappBotState from "../whatsappBotState.js";
import type * as ycloudBot from "../ycloudBot.js";
import type * as ycloudState from "../ycloudState.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  coverageAreas: typeof coverageAreas;
  dashboard: typeof dashboard;
  debug: typeof debug;
  distributors: typeof distributors;
  emails: typeof emails;
  files: typeof files;
  findAccount: typeof findAccount;
  fixAdmin: typeof fixAdmin;
  http: typeof http;
  payments: typeof payments;
  profiles: typeof profiles;
  requests: typeof requests;
  seed: typeof seed;
  services: typeof services;
  specialDates: typeof specialDates;
  "system/ai/agents/tanticoAgent": typeof system_ai_agents_tanticoAgent;
  "system/ai/constants": typeof system_ai_constants;
  "system/ai/tools/createRequest": typeof system_ai_tools_createRequest;
  "system/ai/tools/getServiceFields": typeof system_ai_tools_getServiceFields;
  "system/ai/tools/getSpecialDateToday": typeof system_ai_tools_getSpecialDateToday;
  "system/ai/tools/listServices": typeof system_ai_tools_listServices;
  "system/ai/tools/searchProfileByNumber": typeof system_ai_tools_searchProfileByNumber;
  "system/ai/tools/validateServiceField": typeof system_ai_tools_validateServiceField;
  "system/gemini": typeof system_gemini;
  "system/tanticoPrompt": typeof system_tanticoPrompt;
  transportationTypes: typeof transportationTypes;
  users: typeof users;
  whatsappBotState: typeof whatsappBotState;
  ycloudBot: typeof ycloudBot;
  ycloudState: typeof ycloudState;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

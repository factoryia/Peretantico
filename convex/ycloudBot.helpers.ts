import { UNSUPPORTED_INTENT_REPLY } from "./system/ai/unsupportedIntent";

export type BotServiceSummary = {
  name?: string;
  status?: boolean;
  price?: number;
  hasPriority?: boolean;
  priorityPrice?: number;
};

export function formatCurrency(value?: number): string | undefined {
  return typeof value === "number" ? `$${value.toLocaleString("es-CO")}` : undefined;
}

export function formatServiceListItem(service: BotServiceSummary, index: number): string {
  const name = String(service.name ?? "").trim();
  const basePrice = formatCurrency(service.price);
  const priorityPrice = service.hasPriority ? formatCurrency(service.priorityPrice) : undefined;

  const priceParts = [basePrice ? `normal ${basePrice}` : undefined, priorityPrice ? `prioritario ${priorityPrice}` : undefined].filter(
    Boolean
  );

  return `${index}) ${name}${priceParts.length ? ` - ${priceParts.join(" | ")}` : ""}`;
}

export function buildServicesListReply(services: BotServiceSummary[]): string {
  const lines = [
    "Aquí tienes la lista de servicios disponibles:",
    "",
    ...sortServicesForDisplay(services)
      .map((service, idx) => formatServiceListItem(service, idx + 1))
      .filter((line) => !/^\d+\)\s*$/.test(line)),
    "",
    "Responde con el número o el nombre del servicio.",
  ];

  return lines.join("\n");
}

export function buildPriorityQuestion(service: BotServiceSummary): string {
  const serviceName = String(service.name ?? "el servicio").trim();
  const basePrice = formatCurrency(service.price);
  const priorityPrice = formatCurrency(service.priorityPrice);
  const details = [
    basePrice ? `valor normal ${basePrice}` : undefined,
    priorityPrice ? `valor prioritario ${priorityPrice}` : undefined,
  ].filter(Boolean);

  return [
    `Has seleccionado el servicio de ${serviceName}.`,
    "",
    details.length
      ? `Este servicio puede solicitarse en modalidad normal o prioritario (${details.join(" y ")}).`
      : "Este servicio puede solicitarse en modalidad normal o prioritario.",
    basePrice ? `1️⃣ Normal (${basePrice})` : "1️⃣ Normal",
    priorityPrice ? `2️⃣ Prioritario (${priorityPrice})` : "2️⃣ Prioritario",
    "",
    "¿Cuál prefieres? Responde 1, 2, normal, prioritario, sí o no.",
  ].join("\n");
}

export function getSessionFlow(data: unknown): {
  isPrioritized?: boolean;
  priorityConfirmed?: boolean;
  stage?: string | null;
} {
  if (!data || typeof data !== "object") return {};
  const flow = (data as Record<string, unknown>).flow;
  if (!flow || typeof flow !== "object") return {};
  return flow as {
    isPrioritized?: boolean;
    priorityConfirmed?: boolean;
    stage?: string | null;
  };
}

export function lastOutboundLooksLikePriorityQuestion(normalizedOutbound: string): boolean {
  if (normalizedOutbound.includes("deseas radicarlo como prioridad")) return true;
  if (normalizedOutbound.includes("modalidad normal o prioritario")) return true;
  if (normalizedOutbound.includes("cual prefieres") && normalizedOutbound.includes("prioritario")) return true;
  return false;
}

export function parsePriorityAnswer(normalized: string): boolean | null {
  const answer = normalized.trim();
  if (!answer) return null;
  if (/^(si|sí|prioritario|prioridad|2|2️⃣)$/.test(answer)) return true;
  if (/^(no|normal|1|1️⃣)$/.test(answer)) return false;
  if (/\bprioritari/.test(answer) && !/\bnormal\b/.test(answer)) return true;
  if (/\bnormal\b/.test(answer) && !/\bprioritari/.test(answer)) return false;
  return null;
}

export function resolveServiceFromInboundText(args: {
  effectiveText: string;
  normalizedLastOutbound: string;
  services: Array<BotServiceSummary & { _id?: string }>;
  hasSessionServiceId: boolean;
}): (BotServiceSummary & { _id?: string }) | null {
  if (args.hasSessionServiceId) return null;

  const sorted = sortServicesForDisplay(args.services);
  const numericChoice = args.effectiveText.trim().match(/^\d{1,3}$/)?.[0] ?? "";
  if (numericChoice && lastOutboundLooksLikeServiceListPrompt(args.normalizedLastOutbound)) {
    return sorted[Number(numericChoice) - 1] ?? null;
  }

  const normalized = normalizeForMatch(args.effectiveText);
  if (normalized.length < 4) return null;

  for (const service of sorted) {
    const serviceName = normalizeForMatch(String(service.name ?? ""));
    if (!serviceName) continue;
    if (serviceName.includes(normalized) || normalized.includes(serviceName)) {
      return service;
    }
  }

  return null;
}

function referencesKnownService(normalized: string, services: BotServiceSummary[]): boolean {
  const cleaned = normalized.trim();
  if (cleaned.length < 4) return false;

  for (const service of services) {
    const serviceName = normalizeForMatch(String(service.name ?? ""));
    if (!serviceName) continue;
    if (serviceName.includes(cleaned) || cleaned.includes(serviceName)) {
      return true;
    }
  }

  return false;
}

export function normalizeForMatch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isStronglyOffTopic(normalized: string, raw: string): boolean {
  const t = raw.trim();
  if (/^\s*\d+\s*[+*/]\s*\d+\s*$/.test(t)) return true;
  if (/^\s*\d+\s*-\s*\d+\s*$/.test(t)) return true;

  const patterns: RegExp[] = [
    /\b(algebra|algebraico|ecuacion|ecuaciones|derivada|derivadas|integral|integrales|trigonometria|logaritmo|logaritmos|matematic|calculo|polinomio|factoriza|simplifica|fraccion|fracciones|raiz|raices)\b/,
    /\b(programacion|programar|codigo|code|python|javascript|typescript|react|node|sql|html|css|api|algoritmo|bug|debug)\b/,
    /\b(chiste|cuentame un chiste|cuento|poema|cancion|letra|horoscopo|pelicula|serie|partido|resultado del partido)\b/,
    /\b(clima|tiempo|temperatura|pronostico|llovera|va a llover|soleado|nublado)\b/,
    /\b(dolar|dolares|euro|euros|peso mexicano|peso argentino|moneda|divisa|tasa de cambio|tipo de cambio|convertir moneda|conversion de moneda|cuanto vale)\b/,
    /\b(redacta|redactar|escribe|escribime|escribeme|corrige|mejora|reescribe|editar|redaccion)\b.*\b(correo|email|mail|carta|mensaje)\b/,
    /\b(capital de|quien es|quien fue|que significa|definicion de|explicame|explica|datos de|informacion sobre|historia de)\b/,
    /\b(tarea|tareas|trabajo del colegio|trabajo de la universidad|ensayo|resumen|investigacion|examen|quiz|parcial|respuesta correcta|ayuda academica|tutoria|clase de)\b/,
  ];

  return patterns.some((r) => r.test(normalized));
}

export function isOnTopicMessage(normalized: string, raw: string): boolean {
  if (!normalized) return false;

  if (/\breq\s*\d{3,}\b/.test(normalized)) return true;

  if (
    /\b(servicio|servicios|solicitud|solicitudes|pedido|pedidos|estado|seguimiento|consultar|consulta|precio|costo|valor|pago|pagar|prioridad|prioritario|radicacion|autorizacion|cita|citas|medicamento|medicamentos|domicilio|entrega)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  if (/\b(campo|paso|punto|avance|continuar|retomar|falta|faltan)\b/.test(normalized)) {
    return true;
  }

  if (/\b(en que|en cual|donde|por donde)\b.*\b(voy|quede|quedamos|vamos)\b/.test(normalized)) {
    return true;
  }

  if (/\b(documento|cedula|cc|ti|pasaporte|nombre|apellido|direccion|correo|email|telefono|celular|whatsapp|archivo|adjunto|soporte)\b/.test(normalized)) {
    return true;
  }

  if (
    normalized === "si" ||
    normalized === "sí" ||
    normalized === "no" ||
    normalized === "ok" ||
    normalized === "listo" ||
    normalized === "correcto" ||
    normalized === "confirmo" ||
    normalized === "de acuerdo"
  ) {
    return true;
  }

  if (/^\s*(hola|buenas|buenos dias|buenas tardes|buenas noches|buen dia)\b/.test(normalized)) return true;
  if (/\S+@\S+\.\S+/.test(raw)) return true;
  if (/\b(calle|carrera|cra|cll|avenida|av|apto|apartamento|barrio|km|transversal|diagonal|mz|manzana|casa|lote|conjunto|etapa|torre|bloque|interior|nr|nro|numero|piso|oficina|consultorio|vereda|corregimiento|centro)\b/.test(normalized)) return true;

  return false;
}

function wordCount(normalized: string): number {
  if (!normalized) return 0;
  return normalized.split(/\s+/g).filter(Boolean).length;
}

export function looksLikeShortFlowAnswer(normalized: string, raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (/^(si|sí|no|ok|listo|confirmo|correcto|de acuerdo)$/i.test(t)) return true;
  if (/^\d{1,3}$/.test(t)) return true;
  if (/\S+@\S+\.\S+/.test(t)) return true;
  if (t.replace(/\D/g, "").length >= 6) return true;
  if (/\b(calle|carrera|cra|cll|avenida|av|apto|apartamento|barrio|km|transversal|diagonal)\b/i.test(t)) return true;
  const wc = wordCount(normalized);
  if (wc >= 1 && wc <= 8 && t.length <= 80) return true;
  return false;
}

export function lastOutboundLooksLikeWeAreAskingForInput(args: { normalizedOutbound: string; rawOutbound: string }): boolean {
  const normalizedOutbound = args.normalizedOutbound;
  if (!normalizedOutbound && !args.rawOutbound) return false;
  if (normalizedOutbound.includes("que servicio necesitas")) return true;
  if (normalizedOutbound.includes("cual de estos servicios necesitas")) return true;
  if (normalizedOutbound.includes("lista de servicios disponibles")) return true;
  if (normalizedOutbound.includes("comenzaremos con el campo")) return true;
  if (normalizedOutbound.includes("vamos con el campo")) return true;
  if (normalizedOutbound.includes("comencemos con el primero")) return true;
  if (normalizedOutbound.includes("responde con el numero o el nombre del servicio")) return true;
  if (lastOutboundLooksLikePriorityQuestion(normalizedOutbound)) return true;
  if (normalizedOutbound.includes("por favor indicame")) return true;
  if (normalizedOutbound.includes("por favor indiqueme")) return true;
  if (normalizedOutbound.includes("por favor indica")) return true;
  if (normalizedOutbound.includes("por favor ingresa")) return true;
  if (normalizedOutbound.includes("por favor escribe")) return true;
  if (normalizedOutbound.includes("por favor proporciona")) return true;
  if (normalizedOutbound.includes("cual de las siguientes opciones prefieres")) return true;
  if (normalizedOutbound.includes("esta correcto")) return true;
  if (normalizedOutbound.includes("confirma si")) return true;
  if (normalizedOutbound.includes("empecemos")) return true;
  if (args.rawOutbound.includes("?")) return true;
  return false;
}

function lastOutboundLooksLikeServiceListPrompt(normalizedOutbound: string): boolean {
  if (normalizedOutbound.includes("lista de servicios disponibles")) return true;
  if (normalizedOutbound.includes("lista de servicios que ofrecemos")) return true;
  if (normalizedOutbound.includes("responde con el numero o el nombre del servicio")) return true;
  return false;
}

export function isAllowedFlowReply(args: {
  normalized: string;
  rawText: string;
  normalizedLastOutbound: string;
  rawLastOutbound: string;
}): boolean {
  if (!looksLikeShortFlowAnswer(args.normalized, args.rawText)) return false;
  if (
    !lastOutboundLooksLikeWeAreAskingForInput({
      normalizedOutbound: args.normalizedLastOutbound,
      rawOutbound: args.rawLastOutbound,
    })
  ) {
    return false;
  }

  const text = args.rawText.trim();
  if (/^(si|sí|no|ok|listo|confirmo|correcto|de acuerdo)$/i.test(text)) return true;
  if (/^\d{1,3}$/.test(text)) return true;
  if (/\S+@\S+\.\S+/.test(text)) return true;
  if (text.replace(/\D/g, "").length >= 6) return true;
  if (/\b(calle|carrera|cra|cll|avenida|av|apto|apartamento|barrio|km|transversal|diagonal)\b/i.test(text)) return true;

  const normalizedOutbound = args.normalizedLastOutbound;
  if (/\b(nombre|apellido)\b/.test(normalizedOutbound) && wordCount(args.normalized) <= 8) return true;
  if (/\b(documento|cedula|cc|ti|pasaporte)\b/.test(normalizedOutbound) && /[a-z0-9-]{5,}/i.test(text)) return true;
  if (/\b(correo|email)\b/.test(normalizedOutbound) && /\S+@\S+\.\S+/.test(text)) return true;
  if (/\b(direccion|dirección|direccion de entrega|direccion completa)\b/.test(normalizedOutbound)) return true;
  if (/\b(telefono|teléfono|celular|whatsapp)\b/.test(normalizedOutbound) && text.replace(/\D/g, "").length >= 6) {
    return true;
  }

  return /\b(campo|opcion|opciones|servicio)\b/.test(normalizedOutbound) && wordCount(args.normalized) <= 6;
}

export function shouldBlockMessage(args: {
  rawText: string;
  normalized: string;
  hasMedia: boolean;
  hasActiveFlow: boolean;
  applicantNeedsProfile: boolean;
  normalizedLastOutbound: string;
  rawLastOutbound: string;
  services: BotServiceSummary[];
}): boolean {
  const text = args.rawText.trim();
  if (!text && !args.hasMedia) return false;
  if (args.hasMedia) return false;

  // CRITICAL: When there's an active flow, ONLY block truly off-topic content
  // (math, programming, jokes, weather, etc.). Let the AI handle everything else
  // via its system prompt (MODO A / MODO B). The pre-filter should NOT block
  // legitimate field values like addresses, names, or any other user input.
  if (args.hasActiveFlow || args.applicantNeedsProfile) {
    return isStronglyOffTopic(args.normalized, args.rawText);
  }

  if (referencesKnownService(args.normalized, args.services)) return false;

  return !isOnTopicMessage(args.normalized, args.rawText);
}

function sortServicesForDisplay(services: BotServiceSummary[]): BotServiceSummary[] {
  return [...services]
    .filter((service) => service.status !== false)
    .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "es"));
}

export function mapNumericServiceSelection(args: {
  rawText: string;
  normalizedLastOutbound: string;
  services: BotServiceSummary[];
}): string {
  const numericChoice = args.rawText.trim().match(/^\d{1,3}$/)?.[0] ?? "";
  const lastWasServiceList = lastOutboundLooksLikeServiceListPrompt(args.normalizedLastOutbound);
  if (!numericChoice || !lastWasServiceList) return args.rawText;

  const services = sortServicesForDisplay(args.services);
  const picked = services[Number(numericChoice) - 1];
  const pickedName = picked?.name ? String(picked.name).trim() : "";
  return pickedName || args.rawText;
}

export function stripInjectedAiSuffix(rawText: string): string {
  const cutMarkers = [/responda\s+ia\s*[:-]/i, /responde\s+ia\s*[:-]/i, /respuesta\s+ia\s*[:-]/i];
  for (const marker of cutMarkers) {
    const index = rawText.search(marker);
    if (index > 0) {
      const left = rawText.slice(0, index).trim();
      if (left) return left;
    }
  }

  return rawText;
}

export function deriveInboundFlowDecision(args: {
  rawText: string;
  hasMedia: boolean;
  lastOutboundContent: string;
  services?: BotServiceSummary[];
  hasSessionServiceId: boolean;
  sessionFieldIdsCount: number;
  currentFieldIndex?: number;
  applicantNeedsProfile: boolean;
}): {
  normalizedCommand: string;
  normalizedLastOutbound: string;
  effectiveText: string;
  normalizedEffective: string;
  inferredActiveFlow: boolean;
  hasActiveFlow: boolean;
  shouldBlock: boolean;
} {
  const normalizedCommand = normalizeForMatch(args.rawText);
  const normalizedLastOutbound = normalizeForMatch(args.lastOutboundContent);
  const inferredActiveFlow =
    lastOutboundLooksLikeWeAreAskingForInput({
      normalizedOutbound: normalizedLastOutbound,
      rawOutbound: args.lastOutboundContent,
    }) && looksLikeShortFlowAnswer(normalizedCommand, args.rawText);

  let effectiveText = mapNumericServiceSelection({
    rawText: args.rawText,
    normalizedLastOutbound,
    services: args.services ?? [],
  });

  if (inferredActiveFlow) {
    effectiveText = stripInjectedAiSuffix(effectiveText);
  }

  const normalizedEffective = normalizeForMatch(effectiveText);
  const hasActiveFlow =
    args.hasSessionServiceId || args.sessionFieldIdsCount > 0 || typeof args.currentFieldIndex === "number" || inferredActiveFlow;

  const shouldBlock = shouldBlockMessage({
    rawText: args.rawText,
    normalized: normalizedEffective || normalizedCommand,
    hasMedia: args.hasMedia,
    hasActiveFlow,
    applicantNeedsProfile: args.applicantNeedsProfile,
    normalizedLastOutbound,
    rawLastOutbound: args.lastOutboundContent,
    services: args.services ?? [],
  });

  return {
    normalizedCommand,
    normalizedLastOutbound,
    effectiveText,
    normalizedEffective,
    inferredActiveFlow,
    hasActiveFlow,
    shouldBlock,
  };
}

export function buildInboundContextPrompt(args: {
  contactId: string;
  effectiveText: string;
  resolvedProfileId?: string | null;
  resolvedProfileName?: string | null;
  mediaType?: string | null;
  mediaStorageId?: string | null;
  mediaStorageIds?: string[] | null;
  sessionState?: string | null;
  serviceId?: string | null;
  currentFieldIndex?: number | null;
  isPrioritized?: boolean | null;
}): string {
  const contextParts = [
    `contactId=${args.contactId}`,
    `phone=${args.contactId.replace(/^whatsapp:/, "")}`,
    args.resolvedProfileId ? `profileId=${args.resolvedProfileId}` : undefined,
    args.resolvedProfileName ? `profileName=${args.resolvedProfileName}` : undefined,
    args.mediaType ? `mediaType=${args.mediaType}` : undefined,
    args.mediaStorageId ? `mediaStorageId=${args.mediaStorageId}` : undefined,
    args.mediaStorageIds && args.mediaStorageIds.length > 0
      ? `mediaStorageIds=[${args.mediaStorageIds.join(",")}]`
      : undefined,
    args.sessionState ? `sessionState=${args.sessionState}` : undefined,
    args.serviceId ? `serviceId=${args.serviceId}` : undefined,
    typeof args.currentFieldIndex === "number" ? `fieldIndex=${args.currentFieldIndex}` : undefined,
    typeof args.isPrioritized === "boolean" ? `isPrioritized=${args.isPrioritized}` : undefined,
  ].filter(Boolean);

  return [`[ctx] ${contextParts.join(" ")}`, args.effectiveText].join("\n");
}

export type AgentToolResultSummary = {
  type?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
};

export type RequestCompletion = {
  closeConversation?: boolean;
  message?: string;
  newThreadId?: string;
  closureApplied?: boolean;
  contextRestarted?: boolean;
  softReset?: boolean;
};

export function extractCreateRequestCompletion(toolResults?: AgentToolResultSummary[]): {
  ok?: boolean;
  applicationNumber?: string;
  completion?: RequestCompletion;
} | null {
  const createRequestResult = [...(Array.isArray(toolResults) ? toolResults : [])]
    .reverse()
    .find((result) => result?.type === "tool-result" && result?.toolName === "createRequest");
  if (!createRequestResult) return null;

  const candidate = createRequestResult.output ?? createRequestResult.result;
  if (!candidate || typeof candidate !== "object") return null;

  const boxed = candidate as { type?: unknown; value?: unknown };
  if (boxed.type === "json") {
    if (!boxed.value || typeof boxed.value !== "object") return null;
    return boxed.value as {
      ok?: boolean;
      applicationNumber?: string;
      completion?: RequestCompletion;
    };
  }

  return candidate as {
    ok?: boolean;
    applicationNumber?: string;
    completion?: RequestCompletion;
  };
}

function extractOptionsFromLastOutbound(rawOutbound: string): string[] {
  return (rawOutbound || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

export function resolveAgentEmptyReply(args: {
  assistantText: string;
  toolResults?: AgentToolResultSummary[];
  lastOutboundContent?: string;
}): string {
  const trimmed = (args.assistantText ?? "").trim();
  if (trimmed) return trimmed;

  const toolResults = Array.isArray(args.toolResults) ? args.toolResults : [];
  const validateCalls = toolResults.filter((toolResult) => toolResult?.type === "tool-result" && toolResult?.toolName === "validateServiceField");

  if (validateCalls.length >= 3) {
    const sameInput = new Set(validateCalls.map((toolCall) => stableStringify(toolCall.input))).size <= 1;
    const strictOptions = extractOptionsFromLastOutbound(args.lastOutboundContent ?? "");

    if (sameInput && strictOptions.length >= 2) {
      return `Perdón, hubo un problema técnico al procesar tu respuesta. Para continuar, responde SOLO una opción exacta: ${strictOptions.join(" | ")}.`;
    }

    if (sameInput) {
      return "Perdón, hubo un problema técnico al procesar ese dato. Por favor envíalo de nuevo exactamente como aparece en la pregunta anterior.";
    }
  }

  if (validateCalls.length >= 5) {
    return "Perdón, tuve un inconveniente validando ese dato. ¿Podrías enviarlo nuevamente para continuar?";
  }

  return "Perdón, tuve un inconveniente y no alcancé a responder bien. ¿Podrías repetir tu último dato para continuar?";
}

export function getUnsupportedIntentReply(): string {
  return UNSUPPORTED_INTENT_REPLY;
}

export function isResetThreadTitle(title: string | null | undefined): boolean {
  const t = String(title ?? "").trim();
  if (!t) return false;
  return /\(reset\)$/i.test(t);
}

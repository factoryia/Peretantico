export type RequestCompletionPayload = {
  closeConversation?: boolean;
  message?: string;
  newThreadId?: string;
  closureApplied?: boolean;
};

export type RawCreateRequestCompletion = {
  ok?: boolean;
  applicationNumber?: string;
  completion?: RequestCompletionPayload;
} | null;

export function buildRequestCompletionMessage(args: {
  applicationNumber?: string;
  contextRestarted: boolean;
}): string {
  const confirmation = args.applicationNumber
    ? `Tu solicitud quedó registrada con el número ${args.applicationNumber}.`
    : "Tu solicitud quedó registrada correctamente.";

  if (!args.contextRestarted) {
    return [
      confirmation,
      "",
      "Si necesitas otro servicio o consultar un estado, escríbeme de nuevo por este chat.",
    ].join("\n");
  }

  return [
    confirmation,
    "",
    "He cerrado esta conversación y tu próximo mensaje usará un contexto nuevo para ayudarte.",
    "",
    "Si necesitas otro servicio o consultar un estado, escríbeme de nuevo.",
  ].join("\n");
}

export function resolveRequestCompletionMessage(args: {
  rawCompletion: RawCreateRequestCompletion;
  closureFailed: boolean;
}): string {
  const completion = args.rawCompletion?.completion;
  if (!args.rawCompletion?.ok || !completion?.closeConversation) return "";

  if (args.closureFailed) {
    return buildRequestCompletionMessage({
      applicationNumber: args.rawCompletion.applicationNumber,
      contextRestarted: false,
    });
  }

  return typeof completion.message === "string" ? completion.message.trim() : "";
}

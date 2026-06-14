export type RequestCompletionPayload = {
  closeConversation?: boolean;
  message?: string;
  newThreadId?: string;
  closureApplied?: boolean;
  contextRestarted?: boolean;
  softReset?: boolean;
};

export type RawCreateRequestCompletion = {
  ok?: boolean;
  applicationNumber?: string;
  completion?: RequestCompletionPayload;
} | null;

export function buildRequestCompletionMessage(args: {
  applicationNumber?: string;
  contextRestarted: boolean;
  paymentMethod?: string;
  address?: string;
}): string {
  const confirmation = "✅ Hemos recibido la información y los documentos de tu solicitud.";
  const radicado = args.applicationNumber
    ? `Número de radicado: *${args.applicationNumber}*.`
    : "";

  const details: string[] = [];
  if (args.paymentMethod) {
    const methodLabel = args.paymentMethod === "cash" ? "Efectivo"
      : args.paymentMethod === "transfer" ? "Transferencia"
      : args.paymentMethod === "delivery" ? "Contraentrega"
      : args.paymentMethod;
    details.push(`- *Método de pago:* ${methodLabel}`);
  }
  if (args.address) {
    details.push(`- *Dirección:* ${args.address}`);
  }

  const review =
    "Tu solicitud ha entrado en proceso de revisión. Un asesor de Pere Tantico validará la información y se comunicará contigo si es necesario.";
  const nav = !args.contextRestarted
    ? "Si necesitas otro servicio o consultar un estado, escríbeme de nuevo por este chat."
    : "He cerrado esta conversación y tu próximo mensaje usará un contexto nuevo para ayudarte.";
  const followUp =
    "Si tenemos algún inconveniente con los documentos, nos comunicaremos directamente a tu celular dentro de las próximas 2 horas.";

  const parts = [confirmation];
  if (radicado) parts.push("", radicado);
  if (details.length > 0) parts.push("", details.join("\n"));
  parts.push("", review, "", nav, "", followUp);

  return parts.join("\n");
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

import { TANTICO_SYSTEM_PROMPT } from "./tanticoPrompt";

const GEMINI_MODEL = "gemini-2.5-flash-lite";

export async function rewriteWithGemini(args: {
  userMessage: string;
  baseText: string;
  apiKey?: string;
  maxOutputTokens?: number;
}): Promise<string> {
  const apiKey = args.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  const base = args.baseText.trim();
  if (!apiKey) return base;
  if (!base) return base;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    system_instruction: {
      parts: [{ text: TANTICO_SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "Reescriba la respuesta base en un tono cálido, claro y respetuoso, manteniendo exactamente los mismos datos y sin agregar información nueva.",
              "No elimine enlaces ni cambie números o nombres propios.",
              "Si la respuesta base contiene una lista con guiones, conserve todas las líneas de esa lista.",
              "Si no es posible responder con la información disponible, indique que no cuenta con esa información y ofrezca conectar con el equipo humano.",
              "",
              `Mensaje del usuario: ${args.userMessage}`,
              "",
              "Respuesta base:",
              base,
            ].join("\n"),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: args.maxOutputTokens ?? 300,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return base;
    const data = (await res.json()) as any;
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
    return text || base;
  } catch {
    return base;
  }
}


import { createTool } from "@convex-dev/agent";
import { jsonSchema } from "ai";
import { anyApi } from "convex/server";

function getBogotaDateStrings(now: Date): { iso: string; monthDay: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  const iso = `${year}-${month}-${day}`;
  const monthDay = `${month}-${day}`;
  return { iso, monthDay };
}

export const getSpecialDateToday = createTool({
  description: "Obtiene la fecha especial de hoy para el saludo (si existe)",
  args: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  }),
  handler: async (ctx) => {
    const today = getBogotaDateStrings(new Date());
    const special = await ctx.runQuery(anyApi.specialDates.getTodayForGreeting, {
      today: today.iso,
      monthDay: today.monthDay,
    });
    if (!special) return { hasSpecial: false, today: today.iso };
    return {
      hasSpecial: true,
      today: today.iso,
      special: {
        id: special._id,
        title: special.title,
        description: special.description,
        date: special.date,
      },
    };
  },
});

export function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  const compact = name.replace(/\D/g, "").slice(-2) || name.slice(0, 2);
  return compact.toUpperCase();
}

export function formatListTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);

  if (date >= startOfToday) {
    return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  }
  if (date >= startOfYesterday) return "Ayer";
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

export function formatPhoneDisplay(contactId: string): string {
  return contactId.replace(/^whatsapp:/, "").replace(/^\+/, "+");
}

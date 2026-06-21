// SLA utility helpers
export function slaState(ticket) {
  if (!ticket?.sla) return { label: "—", tone: "neutral", remainingMs: 0 };
  if (["Resolved", "Closed"].includes(ticket.status)) {
    return { label: "Resolved", tone: "ok", remainingMs: 0 };
  }
  const due = new Date(ticket.sla.resolution_due).getTime();
  const now = Date.now();
  const diff = due - now;
  const totalMs = ticket.sla.resolution_minutes * 60 * 1000;
  const pct = diff / totalMs;
  let tone = "safe";
  if (diff <= 0) tone = "breach";
  else if (pct < 0.25) tone = "warning";
  return { label: humanDuration(diff), tone, remainingMs: diff };
}

export function humanDuration(ms) {
  if (ms === 0) return "—";
  const negative = ms < 0;
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (h < 24 && m > 0) parts.push(`${m}m`);
  if (h === 0 && m < 10) parts.push(`${s}s`);
  const label = parts.join(" ") || "0s";
  return negative ? `-${label}` : label;
}

export function slaToneClasses(tone) {
  switch (tone) {
    case "breach":
      return "bg-red-50 text-red-700 border-red-200";
    case "warning":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "ok":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "safe":
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export function statusTone(status) {
  switch (status) {
    case "New": return "bg-blue-50 text-blue-700 border-blue-200";
    case "Assigned": return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "In Progress": return "bg-violet-50 text-violet-700 border-violet-200";
    case "On Hold": return "bg-amber-50 text-amber-700 border-amber-200";
    case "Resolved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Closed": return "bg-slate-100 text-slate-600 border-slate-200";
    default: return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export function priorityTone(p) {
  switch (p) {
    case "Critical": return "bg-red-50 text-red-700 border-red-200";
    case "High": return "bg-orange-50 text-orange-700 border-orange-200";
    case "Medium": return "bg-blue-50 text-blue-700 border-blue-200";
    case "Low": return "bg-slate-50 text-slate-600 border-slate-200";
    default: return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch { return iso; }
}

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map(e => (e?.msg || JSON.stringify(e))).join("; ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}

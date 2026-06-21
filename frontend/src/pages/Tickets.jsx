import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { slaState, slaToneClasses, statusTone, priorityTone, formatDate } from "@/utils/sla";
import { Plus, Search, Download, Filter, AlertTriangle } from "lucide-react";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { API_BASE } from "@/lib/api";

const STATUSES = ["New", "Assigned", "In Progress", "On Hold", "Resolved", "Closed"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const CATEGORIES = ["Hardware", "Software", "Network", "Account Access", "Other"];

export default function Tickets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");

  const fetchTickets = async () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (status !== "all") params.status = status;
    if (priority !== "all") params.priority = priority;
    if (category !== "all") params.category = category;
    const { data } = await api.get("/tickets", { params });
    setTickets(data);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); /* eslint-disable-next-line */ }, [status, priority, category]);

  const breachedCount = tickets.filter(t => slaState(t).tone === "breach").length;

  const exportCsv = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE}/tickets/export.csv`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include"
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tickets.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="tickets-page">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-blue-600 font-bold mb-1 font-heading">// Queue</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-500 mt-1">
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"}
            {breachedCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-red-700 font-medium">
                <AlertTriangle size={14}/> {breachedCount} SLA breach{breachedCount === 1 ? "" : "es"}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {user?.role === "admin" && (
            <button data-testid="export-csv-button" onClick={exportCsv}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2">
              <Download size={14}/> Export CSV
            </button>
          )}
          <button data-testid="new-ticket-button" onClick={() => navigate("/tickets/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <Plus size={14}/> New Ticket
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            data-testid="ticket-search-input"
            value={search} onChange={e=>setSearch(e.target.value)}
            onKeyDown={e=>e.key==="Enter" && fetchTickets()}
            placeholder="Search by title, description, or ticket #"
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="filter-status" className="w-[140px] text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger data-testid="filter-priority" className="w-[140px] text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="filter-category" className="w-[160px] text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Ticket</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Title</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Priority</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Assignee</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">SLA</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="text-center text-sm text-slate-500 py-12">Loading…</td></tr>
            )}
            {!loading && tickets.length === 0 && (
              <tr><td colSpan={7} className="text-center text-sm text-slate-500 py-12">No tickets found.</td></tr>
            )}
            {!loading && tickets.map(t => {
              const sla = slaState(t);
              return (
                <tr key={t.id} data-testid={`ticket-row-${t.ticket_number}`}
                    onClick={() => navigate(`/tickets/${t.id}`)}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-sm font-mono tabular-nums text-slate-700 font-semibold">{t.ticket_number}</td>
                  <td className="px-4 py-3 text-sm text-slate-900 max-w-xs truncate">{t.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${priorityTone(t.priority)}`}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusTone(t.status)}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{t.assignee?.name || <span className="text-slate-400">Unassigned</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border tabular-nums ${slaToneClasses(sla.tone)}`}>
                      {sla.tone === "breach" ? `BREACHED ${sla.label}` : sla.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">{formatDate(t.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

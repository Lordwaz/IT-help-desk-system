import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, Paperclip, Lock, Clock, AlertTriangle } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  slaState, slaToneClasses, statusTone, priorityTone, formatDate, formatApiError
} from "@/utils/sla";
import { API_BASE } from "@/lib/api";

const STATUSES = ["New", "Assigned", "In Progress", "On Hold", "Resolved", "Closed"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const CATEGORIES = ["Hardware", "Software", "Network", "Account Access", "Other"];

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [techs, setTechs] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const [t, c, h] = await Promise.all([
      api.get(`/tickets/${id}`),
      api.get(`/tickets/${id}/comments`),
      api.get(`/tickets/${id}/history`),
    ]);
    setTicket(t.data);
    setComments(c.data);
    setHistory(h.data);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (user?.role !== "requester") {
      api.get("/users/technicians").then(r => setTechs(r.data)).catch(()=>{});
    }
    const i = setInterval(() => setTick(n => n+1), 1000);
    return () => clearInterval(i);
  }, [user]);

  const isStaff = user?.role === "admin" || user?.role === "technician";

  const update = async (patch) => {
    try {
      await api.patch(`/tickets/${id}`, patch);
      toast.success("Updated");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.post(`/tickets/${id}/comments`, { body: newComment, internal });
      setNewComment(""); setInternal(false);
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  if (!ticket) return <div className="text-sm text-slate-500">Loading…</div>;
  const sla = slaState(ticket);

  return (
    <div data-testid="ticket-detail-page">
      <button data-testid="back-button" onClick={()=>navigate("/tickets")} className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-4 font-medium">
        <ArrowLeft size={14}/> Back to queue
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-xs font-bold text-blue-600 tabular-nums">{ticket.ticket_number}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${priorityTone(ticket.priority)}`}>{ticket.priority}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusTone(ticket.status)}`}>{ticket.status}</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight">{ticket.title}</h1>
        </div>
        <div className={`px-3 py-2 rounded-md border text-xs font-bold tabular-nums flex items-center gap-2 ${slaToneClasses(sla.tone)}`}>
          {sla.tone === "breach" ? <AlertTriangle size={14}/> : <Clock size={14}/>}
          {sla.tone === "breach" ? `BREACHED ${sla.label}` : `SLA: ${sla.label}`}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-2 font-heading">Description</div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            {ticket.attachments?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-2">Attachments</div>
                <ul className="space-y-1">
                  {ticket.attachments.map(a => {
                    const token = localStorage.getItem("token");
                    const url = `${API_BASE}/attachments/${a.id}/download?auth=${token}`;
                    return (
                      <li key={a.id}>
                        <a data-testid={`attachment-${a.id}`} href={url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                          <Paperclip size={14}/>{a.filename}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <Tabs defaultValue="comments" className="bg-white border border-slate-200 rounded-lg">
            <TabsList className="border-b border-slate-200 rounded-b-none bg-transparent p-0 h-auto w-full justify-start">
              <TabsTrigger data-testid="tab-comments" value="comments"
                className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none px-6 py-3 text-sm font-medium">
                Discussion
              </TabsTrigger>
              <TabsTrigger data-testid="tab-history" value="history"
                className="data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 border-b-2 border-transparent rounded-none px-6 py-3 text-sm font-medium">
                History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="comments" className="p-6 space-y-4 mt-0">
              {comments.length === 0 && <div className="text-sm text-slate-500">No comments yet.</div>}
              {comments.map(c => (
                <div key={c.id} data-testid={`comment-${c.id}`} className={`rounded-md p-4 ${c.internal ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-200"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-900">{c.author?.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{c.author?.role}</span>
                    {c.internal && <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-700 font-bold"><Lock size={10}/> Internal</span>}
                    <span className="text-[11px] text-slate-400 ml-auto tabular-nums">{formatDate(c.created_at)}</span>
                  </div>
                  <div className="text-sm text-slate-800 whitespace-pre-wrap">{c.body}</div>
                </div>
              ))}

              <form onSubmit={submitComment} className="pt-3 border-t border-slate-100 space-y-2">
                <textarea data-testid="new-comment-input" value={newComment} onChange={e=>setNewComment(e.target.value)}
                  rows={3} placeholder={isStaff ? "Reply to requester or add internal note…" : "Reply…"}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
                <div className="flex items-center justify-between">
                  {isStaff && (
                    <label className="flex items-center gap-2 text-xs text-slate-600">
                      <Switch data-testid="internal-toggle" checked={internal} onCheckedChange={setInternal}/>
                      <Lock size={12}/> Internal note (technicians only)
                    </label>
                  )}
                  <button data-testid="submit-comment-button" type="submit" disabled={!newComment.trim()}
                    className="ml-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md px-4 py-1.5 text-sm font-semibold">
                    Post
                  </button>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="history" className="p-6 mt-0">
              <ol className="space-y-3">
                {history.length === 0 && <li className="text-sm text-slate-500">No history yet.</li>}
                {history.map((h) => (
                  <li key={`${h.at}-${h.action}`} data-testid={`history-${h.at}`} className="flex gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-semibold text-slate-900">{h.actor?.name || "System"}</span>
                      <span className="text-slate-600"> · {h.action.replace(/_/g," ")}</span>
                      {h.detail && <span className="text-slate-500"> — {h.detail}</span>}
                      <div className="text-[11px] text-slate-400 tabular-nums">{formatDate(h.at)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right col */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-4 font-heading">Properties</div>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Requester</dt>
                <dd className="text-slate-900 font-medium text-right">{ticket.requester?.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Created</dt>
                <dd className="text-slate-700 tabular-nums text-right text-xs">{formatDate(ticket.created_at)}</dd>
              </div>
              {ticket.resolved_at && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Resolved</dt>
                  <dd className="text-emerald-700 tabular-nums text-right text-xs">{formatDate(ticket.resolved_at)}</dd>
                </div>
              )}
            </dl>
          </div>

          {isStaff && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 font-heading">Actions</div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Status</label>
                <Select value={ticket.status} onValueChange={v=>update({status:v})}>
                  <SelectTrigger data-testid="action-status"><SelectValue/></SelectTrigger>
                  <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Assignee</label>
                <Select value={ticket.assignee?.id || "unassigned"} onValueChange={v=>update({assignee_id: v === "unassigned" ? null : v})}>
                  <SelectTrigger data-testid="action-assignee"><SelectValue placeholder="Select tech"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {techs.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Priority</label>
                <Select value={ticket.priority} onValueChange={v=>update({priority:v})}>
                  <SelectTrigger data-testid="action-priority"><SelectValue/></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Category</label>
                <Select value={ticket.category} onValueChange={v=>update({category:v})}>
                  <SelectTrigger data-testid="action-category"><SelectValue/></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-3 font-heading">SLA</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Response due</span><span className="tabular-nums">{formatDate(ticket.sla.response_due)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Resolution due</span><span className="tabular-nums">{formatDate(ticket.sla.resolution_due)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Time remaining</span>
                <span className={`tabular-nums font-bold ${sla.tone==="breach"?"text-red-600":sla.tone==="warning"?"text-amber-600":"text-slate-900"}`}>{sla.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

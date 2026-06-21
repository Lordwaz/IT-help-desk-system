import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { Upload, X, ArrowLeft } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatApiError } from "@/utils/sla";

export default function CreateTicket() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", category: "Hardware", priority: "Medium"
  });
  const [attachments, setAttachments] = useState([]);
  const [busy, setBusy] = useState(false);

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/attachments", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setAttachments(a => [...a, data]);
    } catch (e) {
      toast.error("Upload failed: " + formatApiError(e.response?.data?.detail));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/tickets", {
        ...form, attachment_ids: attachments.map(a => a.id)
      });
      toast.success(`Created ${data.ticket_number}`);
      navigate(`/tickets/${data.id}`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setBusy(false); }
  };

  return (
    <div data-testid="create-ticket-page" className="max-w-3xl">
      <button data-testid="back-button" onClick={() => navigate(-1)} className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-4 font-medium">
        <ArrowLeft size={14}/> Back
      </button>

      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-blue-600 font-bold font-heading mb-1">// Submit</div>
        <h1 className="font-heading text-3xl font-bold text-slate-900 tracking-tight">New Ticket</h1>
        <p className="text-sm text-slate-500 mt-1">Tell us what's wrong and we'll get on it.</p>
      </div>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Title</label>
          <input data-testid="ticket-title-input" required value={form.title}
            onChange={e=>setForm({...form,title:e.target.value})}
            placeholder="Brief summary"
            className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Description</label>
          <textarea data-testid="ticket-description-input" required value={form.description}
            onChange={e=>setForm({...form,description:e.target.value})}
            rows={6} placeholder="What happened? Steps to reproduce? Error messages?"
            className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"/>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Category</label>
            <Select value={form.category} onValueChange={v=>setForm({...form,category:v})}>
              <SelectTrigger data-testid="ticket-category-select"><SelectValue/></SelectTrigger>
              <SelectContent>
                {["Hardware","Software","Network","Account Access","Other"].map(c=>(
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Priority</label>
            <Select value={form.priority} onValueChange={v=>setForm({...form,priority:v})}>
              <SelectTrigger data-testid="ticket-priority-select"><SelectValue/></SelectTrigger>
              <SelectContent>
                {["Low","Medium","High","Critical"].map(c=>(
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">Attachments</label>
          <label data-testid="attachment-upload-label" className="flex items-center gap-2 border border-dashed border-slate-300 rounded-md px-3 py-4 text-sm text-slate-500 hover:bg-slate-50 cursor-pointer">
            <Upload size={16}/>
            <span>Click to upload (any file)</span>
            <input type="file" className="hidden"
              onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])}/>
          </label>
          {attachments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {attachments.map(a => (
                <li key={a.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs">
                  <span className="truncate">{a.original_filename}</span>
                  <button type="button" onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))}>
                    <X size={14} className="text-slate-500 hover:text-red-600"/>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={()=>navigate(-1)}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md border border-slate-300">Cancel</button>
          <button data-testid="ticket-submit-button" type="submit" disabled={busy}
            className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-60">
            {busy ? "Creating…" : "Submit ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}

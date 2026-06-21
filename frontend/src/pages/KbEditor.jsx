import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatApiError } from "@/utils/sla";

export default function KbEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState({
    title: "", body: "", category: "Hardware", tags: "", published: true
  });

  useEffect(() => {
    if (editing) {
      api.get(`/kb/${id}`).then(r => setForm({
        ...r.data, tags: (r.data.tags || []).join(", ")
      }));
    }
  }, [id, editing]);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form, tags: form.tags.split(",").map(t=>t.trim()).filter(Boolean)
    };
    try {
      if (editing) await api.patch(`/kb/${id}`, payload);
      else await api.post("/kb", payload);
      toast.success(editing ? "Updated" : "Created");
      navigate("/kb");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div data-testid="kb-editor-page" className="max-w-3xl">
      <button data-testid="back-button" onClick={()=>navigate("/kb")} className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-4 font-medium">
        <ArrowLeft size={14}/> Back
      </button>
      <h1 className="font-heading text-2xl font-bold text-slate-900 tracking-tight mb-6">{editing ? "Edit article" : "New article"}</h1>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Title</label>
          <input data-testid="kb-title-input" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}
            className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Category</label>
          <Select value={form.category} onValueChange={v=>setForm({...form,category:v})}>
            <SelectTrigger data-testid="kb-category-select" className="mt-1"><SelectValue/></SelectTrigger>
            <SelectContent>
              {["Hardware","Software","Network","Account Access","Other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Tags (comma separated)</label>
          <input data-testid="kb-tags-input" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}
            placeholder="vpn, network, wifi"
            className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Body</label>
          <textarea data-testid="kb-body-input" required value={form.body} onChange={e=>setForm({...form,body:e.target.value})}
            rows={12}
            className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"/>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={()=>navigate("/kb")} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md border border-slate-300">Cancel</button>
          <button data-testid="kb-submit-button" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-semibold">
            {editing ? "Save" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}

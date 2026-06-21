import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Save, Clock } from "lucide-react";

export default function SettingsPage() {
  const [rules, setRules] = useState([]);

  useEffect(() => {
    api.get("/sla").then(r => setRules(r.data));
  }, []);

  const save = async () => {
    try {
      await api.put("/sla", rules);
      toast.success("SLA rules saved");
    } catch { toast.error("Save failed"); }
  };

  const update = (i, key, value) => {
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: Number(value) } : r));
  };

  return (
    <div data-testid="settings-page" className="max-w-3xl">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-blue-600 font-bold mb-1 font-heading">// Configuration</div>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">SLA Rules</h1>
        <p className="text-sm text-slate-500 mt-1">Define response and resolution targets by priority (in minutes).</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Priority</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Response (min)</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Resolution (min)</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r, i) => (
              <tr key={r.priority} className="border-b border-slate-100">
                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{r.priority}</td>
                <td className="px-4 py-3">
                  <input data-testid={`sla-response-${r.priority}`} type="number" min={1}
                    value={r.response_minutes}
                    onChange={e=>update(i, "response_minutes", e.target.value)}
                    className="w-28 border border-slate-300 rounded-md px-2 py-1.5 text-sm tabular-nums focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
                </td>
                <td className="px-4 py-3">
                  <input data-testid={`sla-resolution-${r.priority}`} type="number" min={1}
                    value={r.resolution_minutes}
                    onChange={e=>update(i, "resolution_minutes", e.target.value)}
                    className="w-28 border border-slate-300 rounded-md px-2 py-1.5 text-sm tabular-nums focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button data-testid="save-sla-button" onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-semibold flex items-center gap-2">
          <Save size={14}/> Save changes
        </button>
      </div>
    </div>
  );
}

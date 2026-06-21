import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from "recharts";
import { Ticket, CheckCircle2, AlertTriangle, Clock, Calendar as CalIcon, X } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

function Kpi({ label, value, accent, icon: Icon }) {
  return (
    <div data-testid={`kpi-${label.toLowerCase().replace(/\s/g,'-')}`} className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 font-heading">{label}</div>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${accent}`}>
          <Icon size={16}/>
        </div>
      </div>
      <div className="font-heading text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

function DatePickerButton({ label, value, onChange, testid }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          data-testid={testid}
          className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-md bg-white text-sm hover:bg-slate-50"
        >
          <CalIcon size={14} className="text-slate-500"/>
          <span className={value ? "text-slate-900 tabular-nums" : "text-slate-500"}>
            {value ? value.toLocaleDateString() : label}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus/>
      </PopoverContent>
    </Popover>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  const load = async () => {
    const params = {};
    if (start) params.start = start.toISOString();
    if (end) {
      const e = new Date(end);
      e.setHours(23, 59, 59, 999);
      params.end = e.toISOString();
    }
    try {
      const { data } = await api.get("/dashboard/stats", { params });
      setStats(data);
    } catch (e) {
      console.error("Failed to load dashboard stats", e);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [start, end]);

  if (!stats) return <div className="text-sm text-slate-500">Loading…</div>;

  const statusData = Object.entries(stats.by_status).map(([k,v]) => ({ name: k, value: v }));
  const categoryData = Object.entries(stats.by_category).map(([k,v]) => ({ name: k, value: v }));
  const priorityData = Object.entries(stats.by_priority).map(([k,v]) => ({ name: k, value: v }));

  return (
    <div data-testid="dashboard-page">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-blue-600 font-bold mb-1 font-heading">// Overview</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time pulse across the queue.</p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">From</div>
            <DatePickerButton testid="dashboard-start-date" label="Start date" value={start} onChange={setStart}/>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">To</div>
            <DatePickerButton testid="dashboard-end-date" label="End date" value={end} onChange={setEnd}/>
          </div>
          {(start || end) && (
            <button
              data-testid="dashboard-clear-dates"
              onClick={() => { setStart(null); setEnd(null); }}
              className="flex items-center gap-1 px-3 py-2 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <X size={12}/> Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Kpi label="Total Tickets" value={stats.total} accent="bg-blue-50 text-blue-600" icon={Ticket}/>
        <Kpi label="Open" value={stats.open} accent="bg-amber-50 text-amber-600" icon={Clock}/>
        <Kpi label="Resolved" value={stats.resolved} accent="bg-emerald-50 text-emerald-600" icon={CheckCircle2}/>
        <Kpi label="SLA Breaches" value={stats.sla_breach_count} accent="bg-red-50 text-red-600" icon={AlertTriangle}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-4 font-heading">Tickets by Status</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94A3B8"/>
              <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" allowDecimals={false}/>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }}/>
              <Bar dataKey="value" fill="#2563EB" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-4 font-heading">Tickets Over Time (14d)</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={stats.timeline} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#94A3B8"/>
              <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" allowDecimals={false}/>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }}/>
              <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} dot={{ r:3 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-4 font-heading">By Category</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={80}>
                {categoryData.map((entry) => <Cell key={entry.name} fill={COLORS[categoryData.indexOf(entry) % COLORS.length]}/>)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-4 font-heading">By Priority</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData} layout="vertical" margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94A3B8" allowDecimals={false}/>
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} stroke="#94A3B8"/>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }}/>
              <Bar dataKey="value" fill="#10B981" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-xs text-slate-500 flex justify-between border-t border-slate-100 pt-3">
            <span>Avg resolution time</span>
            <span className="font-bold text-slate-900 tabular-nums">{stats.avg_resolution_hours} hrs</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-4 font-heading">Technician Workload</div>
          {stats.by_tech.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">No technicians yet. Create one in Users.</div>
          ) : (
            <ul className="space-y-3">
              {stats.by_tech.map(t => {
                const max = Math.max(1, ...stats.by_tech.map(x => x.open_count));
                const pct = (t.open_count / max) * 100;
                return (
                  <li key={t.id} className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-900 font-medium">{t.name}</span>
                      <span className="text-slate-500 tabular-nums text-xs">{t.open_count} open</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: `${pct}%` }}></div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

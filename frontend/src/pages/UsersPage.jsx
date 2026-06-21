import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { UserPlus, ShieldCheck, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatApiError, formatDate } from "@/utils/sla";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "technician" });

  const load = () => api.get("/users").then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", form);
      toast.success("User created");
      setForm({ name: "", email: "", password: "", role: "technician" });
      setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const toggleActive = async (u) => {
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const updateRole = async (u, role) => {
    try {
      await api.patch(`/users/${u.id}`, { role });
      toast.success("Role updated"); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div data-testid="users-page">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-blue-600 font-bold mb-1 font-heading">// Identity</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Users & Roles</h1>
          <p className="text-sm text-slate-500 mt-1">{users.length} account{users.length === 1 ? "" : "s"}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button data-testid="new-user-button" className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-semibold flex items-center gap-2">
              <UserPlus size={14}/> New User
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create user account</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <input data-testid="user-name-input" required placeholder="Full name" value={form.name}
                onChange={e=>setForm({...form,name:e.target.value})}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
              <input data-testid="user-email-input" required type="email" placeholder="Email" value={form.email}
                onChange={e=>setForm({...form,email:e.target.value})}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
              <input data-testid="user-password-input" required type="password" minLength={6} placeholder="Temporary password" value={form.password}
                onChange={e=>setForm({...form,password:e.target.value})}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
              <Select value={form.role} onValueChange={v=>setForm({...form,role:v})}>
                <SelectTrigger data-testid="user-role-select"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="requester">Requester</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <DialogFooter>
                <button data-testid="user-create-submit" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-semibold">Create</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Email</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Role</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Active</th>
              <th className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} data-testid={`user-row-${u.email}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-sm text-slate-900 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{u.email}</td>
                <td className="px-4 py-3">
                  <Select value={u.role} onValueChange={v=>updateRole(u, v)}>
                    <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="requester">Requester</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Switch data-testid={`user-active-toggle-${u.email}`} checked={u.is_active} onCheckedChange={()=>toggleActive(u)}/>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

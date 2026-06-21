import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatApiError } from "@/utils/sla";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(form);
      toast.success("Account created");
      navigate("/tickets");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-blue-600 font-bold font-heading mb-2">Create Account</div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">Register as Requester</h2>
          <p className="text-xs text-slate-500 mt-1">Technicians and admins are created by the admin team.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Full name</label>
            <input data-testid="register-name-input" required value={form.name}
              onChange={e=>setForm({...form,name:e.target.value})}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email</label>
            <input data-testid="register-email-input" type="email" required value={form.email}
              onChange={e=>setForm({...form,email:e.target.value})}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Password</label>
            <input data-testid="register-password-input" type="password" required minLength={6} value={form.password}
              onChange={e=>setForm({...form,password:e.target.value})}
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
          </div>
          <button data-testid="register-submit-button" disabled={busy} type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2.5 text-sm font-semibold disabled:opacity-60">
            {busy ? "Creating…" : "Create account"}
          </button>
          <div className="text-xs text-center text-slate-500 pt-2">
            Already registered? <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
          </div>
        </div>
      </form>
    </div>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { formatApiError } from "@/utils/sla";

const HERO_IMG = "https://images.unsplash.com/photo-1639066648921-82d4500abf1a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHxzZXJ2ZXIlMjByb29tJTIwcmFjayUyMGFic3RyYWN0fGVufDB8fHxibGFja3wxNzgxODkyNTE4fDA&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Signed in");
      navigate("/tickets");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="relative hidden lg:block bg-slate-950 overflow-hidden">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-blue-950/70 to-slate-950/95"></div>
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center">
              <ShieldCheck size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-heading font-bold text-lg tracking-tight">HELPDESK</div>
              <div className="text-[11px] uppercase tracking-widest text-slate-400 font-medium">IT Operations Console</div>
            </div>
          </div>
          <div className="max-w-md">
            <div className="text-xs uppercase tracking-widest text-blue-400 font-bold mb-3 font-heading">// Mission Control</div>
            <h1 className="font-heading text-4xl font-bold tracking-tight mb-3">Triage faster.<br/>Resolve smarter.</h1>
            <p className="text-slate-300 text-sm leading-relaxed">SLA-driven ticketing, knowledge base and reporting built for managed IT services teams.</p>
          </div>
          <div className="text-[11px] uppercase tracking-widest text-slate-500 font-mono">
            v1.0 · Encrypted Session
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-widest text-blue-600 font-bold mb-2 font-heading">Sign In</div>
            <h2 className="font-heading text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to access your ticket queue.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                data-testid="login-email-input"
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Password</label>
                <Link to="/forgot-password" data-testid="forgot-password-link" className="text-xs text-blue-600 hover:underline">Forgot?</Link>
              </div>
              <input
                data-testid="login-password-input"
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              data-testid="login-submit-button"
              type="submit" disabled={busy}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-md py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {busy ? "Signing in…" : <>Sign in <ArrowRight size={16} /></>}
            </button>

            <div className="text-xs text-center text-slate-500 pt-3">
              Don't have an account?{" "}
              <Link to="/register" data-testid="register-link" className="text-blue-600 hover:underline font-medium">Create one</Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 text-[11px] text-slate-400 font-mono">
            Admin demo: admin@helpdesk.com / Admin123!
          </div>
        </form>
      </div>
    </div>
  );
}

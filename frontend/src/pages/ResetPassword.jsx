import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatApiError } from "@/utils/sla";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      toast.success("Password reset. Please sign in.");
      navigate("/login");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h2 className="font-heading text-2xl font-bold text-slate-900 mb-1">Set a new password</h2>
        <p className="text-xs text-slate-500 mb-6">Paste the token from your email and choose a new password.</p>
        <div className="space-y-3">
          <input data-testid="reset-token-input" required value={token} onChange={e=>setToken(e.target.value)}
            placeholder="Reset token"
            className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-xs"/>
          <input data-testid="reset-password-input" type="password" required minLength={6} value={password}
            onChange={e=>setPassword(e.target.value)} placeholder="New password"
            className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
          <button data-testid="reset-submit-button" disabled={busy} type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2.5 text-sm font-semibold disabled:opacity-60">
            {busy ? "Resetting…" : "Reset password"}
          </button>
        </div>
        <div className="mt-6 text-xs text-center"><Link to="/login" className="text-blue-600 hover:underline">Back to sign in</Link></div>
      </form>
    </div>
  );
}

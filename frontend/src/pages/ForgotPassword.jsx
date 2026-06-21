import { useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatApiError } from "@/utils/sla";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setDone(true);
      toast.success("If that email exists, a reset link was sent.");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-blue-600 font-bold font-heading mb-2">Recover Access</div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">Reset your password</h2>
        </div>

        {done ? (
          <div className="text-sm text-slate-600">
            We've sent a link to <span className="font-semibold">{email}</span> if it exists. Check your inbox or console logs in demo mode.
          </div>
        ) : (
          <div className="space-y-3">
            <input data-testid="forgot-email-input" type="email" required value={email}
              onChange={e=>setEmail(e.target.value)} placeholder="you@company.com"
              className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
            <button data-testid="forgot-submit-button" disabled={busy} type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md py-2.5 text-sm font-semibold disabled:opacity-60">
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </div>
        )}

        <div className="mt-6 text-xs text-center text-slate-500">
          <Link to="/login" className="text-blue-600 hover:underline">Back to sign in</Link>
        </div>
      </form>
    </div>
  );
}

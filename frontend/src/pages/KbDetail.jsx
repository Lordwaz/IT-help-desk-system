import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ArrowLeft, ThumbsUp, ThumbsDown, Pencil } from "lucide-react";

export default function KbDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [voted, setVoted] = useState(false);

  useEffect(() => {
    api.get(`/kb/${id}`).then(r => setArticle(r.data));
  }, [id]);

  const vote = async (helpful) => {
    if (voted) return;
    await api.post(`/kb/${id}/feedback?helpful=${helpful}`);
    setVoted(true);
    toast.success("Thanks for your feedback");
    api.get(`/kb/${id}`).then(r => setArticle(r.data));
  };

  if (!article) return <div className="text-sm text-slate-500">Loading…</div>;
  const canEdit = user?.role === "admin" || user?.role === "technician";

  return (
    <div data-testid="kb-detail-page" className="max-w-3xl">
      <button data-testid="back-button" onClick={()=>navigate("/kb")} className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-4 font-medium">
        <ArrowLeft size={14}/> Back to Knowledge Base
      </button>

      <article className="bg-white border border-slate-200 rounded-lg p-8">
        <div className="flex items-start justify-between mb-3">
          <div className="text-[11px] uppercase tracking-widest font-bold text-blue-600 font-heading">{article.category}</div>
          {canEdit && (
            <Link to={`/kb/${id}/edit`} data-testid="kb-edit-button" className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Pencil size={12}/> Edit
            </Link>
          )}
        </div>
        <h1 className="font-heading text-3xl font-bold text-slate-900 tracking-tight mb-3">{article.title}</h1>
        <div className="flex gap-1 flex-wrap mb-5">
          {article.tags?.map(t => (
            <span key={t} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">{t}</span>
          ))}
        </div>
        <div className="prose prose-slate max-w-none text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{article.body}</div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-3 font-heading">Was this helpful?</div>
          <div className="flex items-center gap-3">
            <button data-testid="kb-helpful-yes" onClick={()=>vote(true)} disabled={voted}
              className="flex items-center gap-2 px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-md text-sm font-medium hover:bg-emerald-100 disabled:opacity-50">
              <ThumbsUp size={14}/> Yes ({article.helpful})
            </button>
            <button data-testid="kb-helpful-no" onClick={()=>vote(false)} disabled={voted}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
              <ThumbsDown size={14}/> No ({article.not_helpful})
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

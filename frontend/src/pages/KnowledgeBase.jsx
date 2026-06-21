import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Search, Plus, BookOpen, ThumbsUp } from "lucide-react";

export default function KnowledgeBase() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await api.get("/kb", { params: search ? { search } : {} });
    setArticles(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const canCreate = user?.role === "admin" || user?.role === "technician";

  return (
    <div data-testid="kb-page">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-blue-600 font-bold mb-1 font-heading">// Self-service</div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">Knowledge Base</h1>
          <p className="text-sm text-slate-500 mt-1">Search guides before opening a ticket.</p>
        </div>
        {canCreate && (
          <button data-testid="new-kb-button" onClick={() => navigate("/kb/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-semibold flex items-center gap-2">
            <Plus size={14}/> New Article
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input data-testid="kb-search-input" value={search} onChange={e=>setSearch(e.target.value)}
            onKeyDown={e=>e.key==="Enter" && load()}
            placeholder="Search articles, tags, content…"
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"/>
        </div>
        <button data-testid="kb-search-button" onClick={load} className="bg-slate-900 hover:bg-slate-800 text-white rounded-md px-4 py-2 text-sm font-medium">Search</button>
      </div>

      {articles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <BookOpen size={32} className="mx-auto text-slate-300 mb-3"/>
          <div className="text-sm text-slate-500">No articles yet.</div>
          {canCreate && <Link to="/kb/new" className="text-sm text-blue-600 hover:underline">Create the first one</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(a => (
            <Link key={a.id} to={`/kb/${a.id}`} data-testid={`kb-card-${a.id}`}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="text-[10px] uppercase tracking-widest font-bold text-blue-600 mb-2">{a.category}</div>
              <h3 className="font-heading text-base font-semibold text-slate-900 mb-2 leading-tight">{a.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-3">{a.excerpt}</p>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex gap-1 flex-wrap">
                  {a.tags?.slice(0,3).map(t=>(
                    <span key={t} className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{t}</span>
                  ))}
                </div>
                <span className="flex items-center gap-1"><ThumbsUp size={11}/> {a.helpful}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

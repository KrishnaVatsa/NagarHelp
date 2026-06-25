import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { civicAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const STATUS_STYLE = {
  Pending:      'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'In-Progress':'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Resolved:     'bg-green-500/15 text-green-400 border-green-500/30',
  Rejected:     'bg-red-500/15 text-red-400 border-red-500/30',
};

const CATEGORY_EMOJI = {
  Pothole:'🕳️', Garbage:'🗑️', Safety:'⚠️',
  Waterlogging:'💧', Streetlight:'💡', Drainage:'🚰', Other:'📌'
};

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest First' },
  { value: 'createdAt', label: 'Oldest First' },
  { value: '-upvotes', label: 'Most Upvoted' },
];

function IssueCard({ issue, onUpvote, onComment, currentUserId }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommenting(true);
    try {
      await onComment(issue._id, commentText.trim());
      setCommentText('');
      toast.success('Comment added!');
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setCommenting(false);
    }
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all">
      {/* Images */}
      {issue.images?.length > 0 && (
        <div className="flex gap-1 overflow-x-auto">
          {issue.images.slice(0, 3).map((src, i) => (
            <img key={i} src={src} alt="" className="h-40 w-auto object-cover flex-shrink-0 first:rounded-tl-2xl last:rounded-tr-2xl" />
          ))}
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{CATEGORY_EMOJI[issue.category] || '📌'}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[issue.status] || STATUS_STYLE.Pending}`}>
                {issue.status}
              </span>
              {issue.source === 'whatsapp' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                  📱 WhatsApp
                </span>
              )}
            </div>
            <h3 className="text-white font-semibold text-sm leading-tight">{issue.title}</h3>
          </div>
          <span className="text-xs text-white/40 whitespace-nowrap">{timeAgo(issue.createdAt)}</span>
        </div>

        <p className="text-sm text-white/60 mb-3 line-clamp-3">{issue.description}</p>

        {/* Location */}
        {issue.location?.address && (
          <div className="flex items-center gap-1.5 text-xs text-white/40 mb-3">
            <span>📍</span>
            <span className="truncate">{issue.location.address}</span>
          </div>
        )}

        {/* Reporter */}
        <div className="flex items-center gap-2 text-xs text-white/40 mb-3">
          <div className="w-5 h-5 rounded-full bg-blue-600/40 flex items-center justify-center text-xs">
            {issue.reportedBy?.name?.[0] || '?'}
          </div>
          <span>{issue.reportedBy?.name || 'Anonymous'} · {issue.category}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onUpvote(issue._id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-600/20 hover:text-blue-400 transition-all text-sm text-white/60 border border-white/10 hover:border-blue-500/30"
          >
            👍 {issue.upvotes || 0}
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-sm text-white/60 border border-white/10"
          >
            💬 {issue.comments?.length || 0}
          </button>

          <div className="flex-1" />

          {issue.status === 'Resolved' && (
            <span className="text-xs text-green-400 font-medium">✓ Resolved</span>
          )}
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
            {issue.comments?.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {issue.comments.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600/40 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      {c.author?.name?.[0] || '?'}
                    </div>
                    <div>
                      <div className="text-xs text-white/40 mb-0.5">{c.author?.name || 'User'}</div>
                      <p className="text-xs text-white/70">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={commenting}
                className="px-3 py-2 bg-blue-600 rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-blue-500 transition-all"
              >
                {commenting ? '...' : 'Send'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function IssuesFeed() {
  const { currentUser } = useAuth();
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ category: '', status: '', sortBy: '-createdAt' });
  const [search, setSearch] = useState('');

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, sortBy: filters.sortBy };
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;

      console.log('Fetching civic issues with params:', params);

      const [issuesRes, statsRes] = await Promise.all([
        civicAPI.getAll(params),
        civicAPI.getStats(),
      ]);

      console.log('Issues response:', issuesRes);
      console.log('Stats response:', statsRes);

      const data = issuesRes.data?.data;
      console.log('Extracted data:', data);

      setIssues(data?.issues || []);
      setTotalPages(data?.pagination?.pages || 1);
      setStats(statsRes.data?.data?.summary || statsRes.data?.data || null);
    } catch (err) {
      console.error('Error fetching issues:', err);
      toast.error('Failed to load issues: ' + (err.response?.data?.message || err.message));
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const handleUpvote = async (issueId) => {
    try {
      await civicAPI.upvote(issueId);
      setIssues(prev => prev.map(i => i._id === issueId ? { ...i, upvotes: (i.upvotes || 0) + 1 } : i));
    } catch {
      toast.error('Failed to upvote');
    }
  };

  const handleComment = async (issueId, text) => {
    await civicAPI.addComment(issueId, text);
    // Refresh the specific issue
    const res = await civicAPI.getById(issueId);
    const updated = res.data?.data;
    if (updated) setIssues(prev => prev.map(i => i._id === issueId ? updated : i));
  };

  const filteredIssues = search
    ? issues.filter(i => i.title?.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase()))
    : issues;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0f1e]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/civic" className="text-white/60 hover:text-white transition-colors">← </Link>
            <div>
              <h1 className="text-base font-bold text-white">Community Issues</h1>
              <p className="text-xs text-white/50">{stats?.total || 0} reports · {stats?.resolutionRate || '0%'} resolved</p>
            </div>
          </div>
          <Link to="/civic/report" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition-all">
            + Report
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total', value: stats.total, color: 'text-white' },
              { label: 'Pending', value: stats.pending, color: 'text-yellow-400' },
              { label: 'Resolved', value: stats.resolved, color: 'text-green-400' },
              { label: 'Rate', value: stats.resolutionRate, color: 'text-blue-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filters */}
        <div className="space-y-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search issues..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500 transition-all"
          />

          <div className="flex gap-2 flex-wrap">
            <select
              value={filters.category}
              onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}
              className="flex-1 min-w-28 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">All Categories</option>
              {['Pothole','Garbage','Safety','Waterlogging','Streetlight','Drainage','Other'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
              className="flex-1 min-w-28 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">All Status</option>
              {['Pending','In-Progress','Resolved','Rejected'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={filters.sortBy}
              onChange={e => { setFilters(f => ({ ...f, sortBy: e.target.value })); setPage(1); }}
              className="flex-1 min-w-32 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              style={{ colorScheme: 'dark' }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Issues list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏙️</div>
            <p className="text-white/50 text-lg font-medium">No issues found</p>
            <p className="text-white/30 text-sm mt-1">Be the first to report a civic issue in your area</p>
            <Link to="/civic/report" className="mt-4 inline-block px-6 py-3 bg-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-500 transition-all">
              Report an Issue
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIssues.map(issue => (
              <IssueCard
                key={issue._id}
                issue={issue}
                onUpvote={handleUpvote}
                onComment={handleComment}
                currentUserId={currentUser?._id}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30 hover:bg-white/10 transition-all"
                >← Prev</button>
                <span className="px-4 py-2 text-sm text-white/50">Page {page} of {totalPages}</span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30 hover:bg-white/10 transition-all"
                >Next →</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { API_BASE } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Bug, Comment } from '../types';
import { 
  ArrowLeft, Edit, Trash2, FileText,
  Download, MessageSquare, Send, Paperclip, Clock
} from 'lucide-react';

export const BugDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [bug, setBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const fetchBugDetails = async () => {
    try {
      const bugRes = await api.get(`/bugs/${id}`);
      setBug(bugRes.data);
      const commentsRes = await api.get(`/comments/${id}`);
      setComments(commentsRes.data);
    } catch (err) {
      showToast("Failed to retrieve bug details.", "error");
      navigate('/bugs');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchBugDetails().finally(() => setLoading(false));
  }, [id, navigate, showToast]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      await api.post('/comments', {
        bug_id: Number(id),
        content: newComment.trim()
      });
      setNewComment('');
      showToast("Comment added.", "success");
      // Reload comments
      const commentsRes = await api.get(`/comments/${id}`);
      setComments(commentsRes.data);
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Comment submission failed.", "error");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleTransition = async (newStatus: string) => {
    if (!bug) return;
    try {
      await api.put(`/bugs/${bug.id}`, {
        status: newStatus
      });
      showToast(`Workflow status updated to ${newStatus}.`, "success");
      fetchBugDetails();
    } catch (error: any) {
      showToast(error.response?.data?.detail || "Status transition failed.", "error");
    }
  };

  const handleDelete = async () => {
    if (!bug) return;
    if (!window.confirm(`Are you sure you want to delete bug report #${bug.id}: "${bug.title}"?`)) {
      return;
    }
    try {
      await api.delete(`/bugs/${bug.id}`);
      showToast("Bug report deleted.", "success");
      navigate('/bugs');
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Delete operation failed.", "error");
    }
  };

  // allowed status buttons helper based on workflow matrix
  const getTransitionButtons = (currentStatus: string) => {
    switch (currentStatus) {
      case 'New':
        return [
          { name: 'Open', color: 'bg-indigo-500 hover:bg-indigo-600' },
          { name: 'Assigned', color: 'bg-purple-500 hover:bg-purple-600' },
          { name: 'Closed', color: 'bg-slate-500 hover:bg-slate-650' }
        ];
      case 'Open':
        return [
          { name: 'Assigned', color: 'bg-purple-500 hover:bg-purple-600' },
          { name: 'In Progress', color: 'bg-amber-500 hover:bg-amber-600' },
          { name: 'Closed', color: 'bg-slate-500 hover:bg-slate-650' }
        ];
      case 'Assigned':
        return [
          { name: 'In Progress', color: 'bg-amber-500 hover:bg-amber-600' },
          { name: 'Testing', color: 'bg-pink-500 hover:bg-pink-650' },
          { name: 'Closed', color: 'bg-slate-500 hover:bg-slate-650' }
        ];
      case 'In Progress':
        return [
          { name: 'Testing', color: 'bg-pink-500 hover:bg-pink-650' },
          { name: 'Resolved', color: 'bg-emerald-500 hover:bg-emerald-600' },
          { name: 'Closed', color: 'bg-slate-500 hover:bg-slate-650' }
        ];
      case 'Testing':
        return [
          { name: 'Resolved', color: 'bg-emerald-500 hover:bg-emerald-600' },
          { name: 'Reopened', color: 'bg-rose-500 hover:bg-rose-600' },
          { name: 'Closed', color: 'bg-slate-500 hover:bg-slate-650' }
        ];
      case 'Resolved':
        return [
          { name: 'Closed', color: 'bg-slate-500 hover:bg-slate-650' },
          { name: 'Reopened', color: 'bg-rose-500 hover:bg-rose-600' }
        ];
      case 'Closed':
        return [
          { name: 'Reopened', color: 'bg-rose-500 hover:bg-rose-600' }
        ];
      case 'Reopened':
        return [
          { name: 'Assigned', color: 'bg-purple-500 hover:bg-purple-600' },
          { name: 'In Progress', color: 'bg-amber-500 hover:bg-amber-600' }
        ];
      default:
        return [];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-rose-500/10 text-rose-600 border-rose-100 dark:border-rose-900/30';
      case 'High': return 'bg-amber-500/10 text-amber-600 border-amber-100 dark:border-amber-900/30';
      case 'Medium': return 'bg-brand-500/10 text-brand-600 border-brand-100 dark:border-brand-900/30';
      case 'Low': return 'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-sky-500/10 text-sky-600 border-sky-100 dark:border-sky-900/30';
      case 'Open': return 'bg-indigo-500/10 text-indigo-600 border-indigo-100 dark:border-indigo-900/30';
      case 'Assigned': return 'bg-purple-500/10 text-purple-600 border-purple-100 dark:border-purple-900/30';
      case 'In Progress': return 'bg-amber-500/10 text-amber-650 border-amber-100 dark:border-amber-900/30';
      case 'Testing': return 'bg-pink-500/10 text-pink-600 border-pink-100 dark:border-pink-900/30';
      case 'Resolved': return 'bg-emerald-500/10 text-emerald-600 border-emerald-100 dark:border-emerald-900/30';
      case 'Closed': return 'bg-slate-500/10 text-slate-600 border-slate-200 dark:border-slate-800';
      case 'Reopened': return 'bg-rose-500/10 text-rose-600 border-rose-100 dark:border-rose-900/30';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!bug) return null;

  const transitionButtons = getTransitionButtons(bug.status);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        {/* Back Link & Info */}
        <div className="flex items-center gap-3">
          <Link 
            to="/bugs" 
            className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400">BUG #{bug.id}</span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusColor(bug.status)}`}>
                {bug.status}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getPriorityColor(bug.priority)}`}>
                {bug.priority}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{bug.title}</h2>
          </div>
        </div>

        {/* Actions (PM/Admin or Reporter) */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Link
            to={`/bugs/${bug.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-350 transition-colors"
          >
            <Edit className="w-4 h-4" /> Edit Specifications
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100/70 hover:text-rose-600 dark:hover:bg-rose-900/30 px-3.5 py-2 text-xs font-semibold text-rose-550 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Delete Tracker
          </button>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Diagnostics, Attachments, Comments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Specs Details */}
          <div className="rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm space-y-4">
            
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Description</h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {bug.description}
              </p>
            </div>

            {bug.steps_to_reproduce && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/45">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Steps to Reproduce</h3>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-darkbg-250/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {bug.steps_to_reproduce}
                </p>
              </div>
            )}

            {(bug.expected_result || bug.actual_result) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/45">
                {bug.expected_result && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Expected Result</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{bug.expected_result}</p>
                  </div>
                )}
                {bug.actual_result && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Actual Result</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{bug.actual_result}</p>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Attachments Section */}
          <div className="rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Paperclip className="w-5 h-5 text-brand-500" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Diagnostics Attachments ({bug.attachments.length})</h3>
            </div>
            
            {bug.attachments.length === 0 ? (
              <p className="text-xs text-slate-400">No logs, screenshots, or attachments uploaded.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bug.attachments.map((att) => (
                  <div 
                    key={att.id} 
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/20 dark:bg-darkbg-250/20"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-5 h-5 text-brand-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{att.file_name}</p>
                        <p className="text-[10px] text-slate-450">{(att.file_size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    {/* Native browser direct link download */}
                    <a
                      href={`${API_BASE}/static/${att.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-500 hover:text-brand-500"
                      title="Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments Panel */}
          <div className="rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <MessageSquare className="w-5 h-5 text-brand-500" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Discussion Comments ({comments.length})</h3>
            </div>

            {/* Comments Timeline */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400">No discussions yet. Mention someone with @fullname to notify them.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 items-start p-3 rounded-xl border border-slate-100 dark:border-slate-800/40 bg-slate-50/10 dark:bg-darkbg-250/10">
                    <div className="h-8 w-8 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                      {comment.user.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{comment.user.full_name}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(comment.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="pt-4 border-t border-slate-100 dark:border-slate-800/40 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment... use @Username to mention someone"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-4 text-xs focus:border-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={commentSubmitting}
                className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white p-2.5 shadow-md shadow-brand-500/10 flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>

        </div>

        {/* Right Column: Workflow Transitions, Settings */}
        <div className="space-y-6">
          
          {/* Transition Panel */}
          {transitionButtons.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Workflow transitions</h3>
              <div className="flex flex-col gap-2">
                {transitionButtons.map((btn) => (
                  <button
                    key={btn.name}
                    onClick={() => handleTransition(btn.name)}
                    className={`w-full text-center text-white py-2.5 px-4 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer ${btn.color}`}
                  >
                    Move to {btn.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Details Specifications */}
          <div className="rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Diagnostics specifications</h3>
            
            <div className="space-y-3.5 text-xs">
              
              {/* Project */}
              <div>
                <p className="text-slate-400">Project</p>
                <p className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{bug.project.name}</p>
              </div>

              {/* Module */}
              {bug.module_name && (
                <div>
                  <p className="text-slate-400">Module / Component</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{bug.module_name}</p>
                </div>
              )}

              {/* Assignee */}
              <div>
                <p className="text-slate-400">Assignee</p>
                {bug.assignee ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-250 flex items-center justify-center font-bold text-[10px] uppercase">
                      {bug.assignee.full_name.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{bug.assignee.full_name}</span>
                  </div>
                ) : (
                  <p className="text-slate-500 italic mt-0.5">Unassigned</p>
                )}
              </div>

              {/* Reporter */}
              <div>
                <p className="text-slate-400">Reporter</p>
                {bug.reporter ? (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-250 flex items-center justify-center font-bold text-[10px] uppercase">
                      {bug.reporter.full_name.charAt(0)}
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{bug.reporter.full_name}</span>
                  </div>
                ) : (
                  <p className="text-slate-550 mt-0.5">N/A</p>
                )}
              </div>

              {/* OS / Browser */}
              {(bug.os || bug.browser) && (
                <div className="grid grid-cols-2 gap-4">
                  {bug.os && (
                    <div>
                      <p className="text-slate-400">Operating System</p>
                      <p className="font-semibold text-slate-755 dark:text-slate-200 mt-0.5">{bug.os}</p>
                    </div>
                  )}
                  {bug.browser && (
                    <div>
                      <p className="text-slate-400">Browser</p>
                      <p className="font-semibold text-slate-755 dark:text-slate-200 mt-0.5">{bug.browser}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Severity */}
              <div>
                <p className="text-slate-400">Severity Tier</p>
                <p className="font-bold text-slate-750 dark:text-slate-200 mt-0.5">{bug.severity}</p>
              </div>

              {/* Due Date */}
              {bug.due_date && (
                <div>
                  <p className="text-slate-400">Due Date</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{new Date(bug.due_date).toLocaleDateString()}</p>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/40 text-[10px] text-slate-400">
                <div>
                  <p>Created</p>
                  <p className="mt-0.5">{new Date(bug.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p>Updated</p>
                  <p className="mt-0.5">{new Date(bug.updated_at).toLocaleDateString()}</p>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
export default BugDetails;

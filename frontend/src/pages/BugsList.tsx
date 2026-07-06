import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Bug, Project, User } from '../types';
import { 
  Plus, Search, RefreshCw, ChevronLeft, ChevronRight, 
  Eye, Edit, Trash2, ArrowUpDown, ShieldAlert
} from 'lucide-react';

export const BugsList: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Data states
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Filter/Search states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [severity, setSeverity] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  // Sorting states
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDesc, setSortDesc] = useState(true);

  const fetchBugs = async () => {
    try {
      const skip = (page - 1) * limit;
      const res = await api.get('/bugs', {
        params: {
          skip,
          limit,
          search: search || undefined,
          status: status || undefined,
          priority: priority || undefined,
          severity: severity || undefined,
          project_id: projectId ? Number(projectId) : undefined,
          assignee_id: assigneeId ? Number(assigneeId) : undefined,
          sort_by: sortBy,
          sort_desc: sortDesc,
        }
      });
      setBugs(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      showToast("Failed to fetch bugs list.", "error");
    }
  };

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [projRes, userRes] = await Promise.all([
          api.get('/projects'),
          api.get('/users').catch(() => ({ data: [] }))
        ]);
        setProjects(projRes.data);
        setUsers(userRes.data);
      } catch (e) {
        // Fallback silently
      }
    };
    loadFiltersData();
  }, [showToast]);

  useEffect(() => {
    setLoading(true);
    fetchBugs().finally(() => setLoading(false));
  }, [page, search, status, priority, severity, projectId, assigneeId, sortBy, sortDesc]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setSeverity('');
    setProjectId('');
    setAssigneeId('');
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(field);
      setSortDesc(true);
    }
    setPage(1);
  };

  const handleDelete = async (e: React.MouseEvent, id: number, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete bug report: "${title}"?`)) {
      return;
    }
    try {
      await api.delete(`/bugs/${id}`);
      showToast("Bug report deleted successfully.", "success");
      fetchBugs();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Delete failed.", "error");
    }
  };

  // Color mappings
  const priorityBadges: Record<string, string> = {
    'Critical': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
    'High': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
    'Medium': 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-100 dark:border-brand-900/30',
    'Low': 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  };

  const severityBadges: Record<string, string> = {
    'Blocker': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30 font-bold',
    'Critical': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30',
    'Major': 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-100 dark:border-brand-900/30',
    'Minor': 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  };

  const getStatusColor = (statusVal: string) => {
    switch (statusVal) {
      case 'New': return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/30';
      case 'Open': return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30';
      case 'Assigned': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30';
      case 'In Progress': return 'bg-amber-500/10 text-amber-600 dark:text-amber-550 border-amber-100 dark:border-amber-900/30';
      case 'Testing': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-900/30';
      case 'Resolved': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
      case 'Closed': return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800';
      case 'Reopened': return 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-100 dark:border-rose-900/30';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Bugs Log</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track, prioritize, and resolve workflow issues and tasks</p>
        </div>
        <Link
          to="/bugs/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold shadow-md shadow-brand-500/10 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Report Bug
        </Link>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-darkbg-100 p-5 shadow-sm space-y-4">
        
        {/* Search & Project Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
          
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by ID, title, module..."
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setPage(1); }}
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Testing">Testing</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Reopened">Reopened</option>
            </select>
          </div>

        </div>

        {/* Priority, Severity, Assignee & Reset Button */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          
          {/* Priority */}
          <div>
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Severities</option>
              <option value="Minor">Minor</option>
              <option value="Major">Major</option>
              <option value="Critical">Critical</option>
              <option value="Blocker">Blocker</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <select
              value={assigneeId}
              disabled={users.length === 0}
              onChange={(e) => { setAssigneeId(e.target.value); setPage(1); }}
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Assignees</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 px-4 text-sm font-semibold text-slate-600 dark:text-slate-350 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reset Filters
          </button>

        </div>

      </div>

      {/* Bugs Table Grid */}
      <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-darkbg-100 shadow-sm overflow-hidden">
        
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          </div>
        ) : bugs.length === 0 ? (
          <div className="p-16 text-center">
            <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Bugs Found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Adjust search terms or create a new bug report.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkbg-200/30 text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">
                  
                  {/* ID */}
                  <th 
                    onClick={() => handleSort('id')}
                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-1">
                      ID <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>

                  {/* Title / Project */}
                  <th 
                    onClick={() => handleSort('title')}
                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-1">
                      Bug Details <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>

                  {/* Priority */}
                  <th 
                    onClick={() => handleSort('priority')}
                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-1">
                      Priority <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>

                  {/* Severity */}
                  <th 
                    onClick={() => handleSort('severity')}
                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-1">
                      Severity <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>

                  {/* Status */}
                  <th 
                    onClick={() => handleSort('status')}
                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-1">
                      Status <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>

                  {/* Assignee */}
                  <th className="px-6 py-4">Assignee</th>

                  {/* Date */}
                  <th 
                    onClick={() => handleSort('created_at')}
                    className="px-6 py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-center gap-1">
                      Reported <ArrowUpDown className="w-3.5 h-3.5" />
                    </div>
                  </th>

                  <th className="px-6 py-4 text-right">Actions</th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {bugs.map((bug) => (
                  <tr 
                    key={bug.id}
                    onClick={() => navigate(`/bugs/${bug.id}`)}
                    className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors cursor-pointer"
                  >
                    
                    {/* ID */}
                    <td className="px-6 py-4 font-bold text-slate-400">
                      #{bug.id}
                    </td>

                    {/* Title / Project */}
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-xs">{bug.title}</p>
                      <p className="text-[11px] text-slate-450 mt-0.5">{bug.project.name} {bug.module_name && `| ${bug.module_name}`}</p>
                    </td>

                    {/* Priority */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${priorityBadges[bug.priority]}`}>
                        {bug.priority}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${severityBadges[bug.severity]}`}>
                        {bug.severity}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${getStatusColor(bug.status)}`}>
                        {bug.status}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="px-6 py-4">
                      {bug.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[9px] font-bold uppercase">
                            {bug.assignee.full_name.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-350">{bug.assignee.full_name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(bug.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        
                        <Link
                          to={`/bugs/${bug.id}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <Link
                          to={`/bugs/${bug.id}/edit`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-500"
                          title="Edit Bug"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={(e) => handleDelete(e, bug.id, bug.title)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                          title="Delete Bug"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Panel */}
        {total > limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-darkbg-250/20 select-none">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing page <strong className="text-slate-700 dark:text-slate-350">{page}</strong> of <strong className="text-slate-700 dark:text-slate-350">{totalPages}</strong> ({total} records)
            </span>
            
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                className={`rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                className={`rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-slate-550 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
      
    </div>
  );
};
export default BugsList;

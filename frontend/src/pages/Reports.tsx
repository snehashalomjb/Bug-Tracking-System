import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Project, User } from '../types';
import { 
  FileSpreadsheet, FileText, Filter, 
  HelpCircle, RefreshCw
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters State
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [severity, setSeverity] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [projRes, userRes] = await Promise.all([
          api.get('/projects'),
          api.get('/users').catch(() => ({ data: [] })) // Fallback if user is Developer/Tester and can't read users list
        ]);
        setProjects(projRes.data);
        setUsers(userRes.data);
      } catch (err) {
        showToast("Error loading filter selections.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadFiltersData();
  }, [showToast]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(true);
    try {
      const response = await api.get('/reports', {
        params: {
          format,
          status: status || undefined,
          priority: priority || undefined,
          severity: severity || undefined,
          project_id: projectId ? Number(projectId) : undefined,
          assignee_id: assigneeId ? Number(assigneeId) : undefined
        },
        responseType: 'blob' // CRITICAL: Treat binary stream as blob
      });

      // Construct file download link
      const blob = new Blob([response.data], {
        type: format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileExt = format === 'excel' ? 'xlsx' : 'pdf';
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `bugs_report_${timestamp}.${fileExt}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showToast(`${format.toUpperCase()} report downloaded successfully.`, "success");
    } catch (err) {
      showToast("Failed to compile or download report.", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setStatus('');
    setPriority('');
    setSeverity('');
    setProjectId('');
    setAssigneeId('');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">System Report Compiler</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Generate enterprise bug matrices, prioritize metrics, and export worksheets</p>
      </div>

      {/* Main card */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white/80 dark:bg-darkbg-100/80 backdrop-blur-md shadow-lg space-y-6">
        
        {/* Section Title */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/40">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-brand-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Report Filter Criteria</h3>
          </div>
          <button 
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-400 hover:text-brand-500 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
          </button>
        </div>

        {/* Filters Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Bug Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2.5 text-sm focus:border-brand-500 focus:outline-none"
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

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Priority Level</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2.5 text-sm focus:border-brand-500 focus:outline-none"
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
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Severity Tier</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Severities</option>
              <option value="Minor">Minor</option>
              <option value="Major">Major</option>
              <option value="Critical">Critical</option>
              <option value="Blocker">Blocker</option>
            </select>
          </div>

          {/* Project */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Project Space</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2.5 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Assigned Engineer</label>
            <select
              value={assigneeId}
              disabled={users.length === 0}
              onChange={(e) => setAssigneeId(e.target.value)}
              className={`mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2.5 text-sm focus:border-brand-500 focus:outline-none ${
                users.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="">All Members</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Action Panel */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4">
          
          {/* Excel Export */}
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-350 text-white font-semibold py-3 px-6 text-sm shadow-md shadow-emerald-600/10 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {exporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" /> Download MS Excel (.xlsx)
              </>
            )}
          </button>

          {/* PDF Export */}
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-350 text-white font-semibold py-3 px-6 text-sm shadow-md shadow-rose-600/10 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {exporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <FileText className="w-4 h-4" /> Download PDF Report (.pdf)
              </>
            )}
          </button>

        </div>

      </div>

      {/* Information Notes */}
      <div className="rounded-xl border border-brand-500/10 bg-brand-500/5 p-4 flex gap-3 text-xs leading-normal">
        <HelpCircle className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-slate-600 dark:text-slate-300">
          <p className="font-bold text-brand-600 dark:text-brand-400">Export Specifications Details</p>
          <p>
            Reports generated represent real-time database state snapshots. Filters apply instantly. Excel worksheets include column sorting autofilters and numeric formatting, while PDFs generate alternating light grids optimized for visual readability.
          </p>
        </div>
      </div>

    </div>
  );
};
export default Reports;

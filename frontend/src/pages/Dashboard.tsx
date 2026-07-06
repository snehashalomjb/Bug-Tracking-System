import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Bug, AlertOctagon, AlertTriangle, CheckCircle2, UserCheck, 
  Activity as ActivityIcon, TrendingUp, BarChart3
} from 'lucide-react';

interface ProjectCount {
  project_name: string;
  count: number;
}

interface DeveloperPerformance {
  developer_name: string;
  resolved_count: number;
  assigned_count: number;
}

interface BugTrend {
  month: string;
  count: number;
}

interface ActivityMin {
  id: number;
  action: string;
  details?: string;
  created_at: string;
  user_name: string;
}

interface DashboardData {
  total_bugs: number;
  open_bugs: number;
  closed_bugs: number;
  critical_bugs: number;
  high_priority_bugs: number;
  assigned_to_me: number;
  bugs_by_status: Record<string, number>;
  bugs_by_priority: Record<string, number>;
  bugs_per_project: ProjectCount[];
  monthly_trends: BugTrend[];
  developer_performance: DeveloperPerformance[];
  recent_activities: ActivityMin[];
}

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch (err: any) {
        showToast("Failed to fetch dashboard statistics.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [showToast]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!data) return null;

  // Custom Priority Color Map
  const priorityColors: Record<string, { bg: string, text: string, bar: string }> = {
    'Critical': { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', bar: 'bg-gradient-to-r from-rose-500 to-red-600' },
    'High': { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-gradient-to-r from-amber-500 to-orange-600' },
    'Medium': { bg: 'bg-brand-500/10 dark:bg-brand-500/20', text: 'text-brand-600 dark:text-brand-400', bar: 'bg-gradient-to-r from-brand-500 to-indigo-600' },
    'Low': { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', bar: 'bg-slate-400' },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-sky-500/15 text-sky-600 dark:text-sky-400';
      case 'Open': return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400';
      case 'Assigned': return 'bg-purple-500/15 text-purple-600 dark:text-purple-400';
      case 'In Progress': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
      case 'Testing': return 'bg-pink-500/15 text-pink-600 dark:text-pink-400';
      case 'Resolved': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
      case 'Closed': return 'bg-slate-500/15 text-slate-600 dark:text-slate-400';
      case 'Reopened': return 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // Render SVG Line Chart for Monthly Trends
  const renderTrendLine = () => {
    const trends = data.monthly_trends;
    if (trends.length === 0) return <p className="text-sm text-slate-400">No trend data available</p>;

    const width = 500;
    const height = 150;
    const padding = 25;
    
    const maxVal = Math.max(...trends.map(t => t.count), 5);
    
    // Calculate coordinates
    const points = trends.map((t, idx) => {
      const x = padding + (idx * (width - padding * 2) / (trends.length - 1));
      const y = height - padding - (t.count * (height - padding * 2) / maxVal);
      return { x, y };
    });

    const pathData = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    // Area under line path
    const areaData = `${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="relative w-full h-44">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Gradients */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5677fc" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#5677fc" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="0.5" className="dark:stroke-slate-800" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#cbd5e1" strokeDasharray="3" strokeWidth="0.5" className="dark:stroke-slate-800" />
          
          {/* Area */}
          <path d={areaData} fill="url(#areaGrad)" />
          
          {/* Path Line */}
          <path d={pathData} fill="none" stroke="#5677fc" strokeWidth="2.5" strokeLinecap="round" />

          {/* Dots */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#5677fc" strokeWidth="2" />
              <text x={p.x} y={p.y - 8} fontSize="8" fill="#64748b" textAnchor="middle" className="font-bold dark:fill-slate-400">
                {trends[idx].count}
              </text>
              <text x={p.x} y={height - 8} fontSize="7" fill="#94a3b8" textAnchor="middle" className="dark:fill-slate-500">
                {trends[idx].month.split('-')[1]}/{trends[idx].month.split('-')[0].substring(2)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        
        {/* Metric 1 */}
        <div className="relative group overflow-hidden rounded-2xl bg-white dark:bg-darkbg-100 p-5 border border-slate-200/50 dark:border-slate-800/40 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Bugs</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <Bug className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-800 dark:text-slate-100">{data.total_bugs}</p>
        </div>

        {/* Metric 2 */}
        <div className="relative group overflow-hidden rounded-2xl bg-white dark:bg-darkbg-100 p-5 border border-slate-200/50 dark:border-slate-800/40 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open Bugs</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-800 dark:text-slate-100">{data.open_bugs}</p>
        </div>

        {/* Metric 3 */}
        <div className="relative group overflow-hidden rounded-2xl bg-white dark:bg-darkbg-100 p-5 border border-slate-200/50 dark:border-slate-800/40 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Closed Bugs</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-800 dark:text-slate-100">{data.closed_bugs}</p>
        </div>

        {/* Metric 4 */}
        <div className="relative group overflow-hidden rounded-2xl bg-white dark:bg-darkbg-100 p-5 border border-slate-200/50 dark:border-slate-800/40 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Critical</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-rose-600 dark:text-rose-400">{data.critical_bugs}</p>
        </div>

        {/* Metric 5 */}
        <div className="relative group overflow-hidden rounded-2xl bg-white dark:bg-darkbg-100 p-5 border border-slate-200/50 dark:border-slate-800/40 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">High Priority</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-amber-600 dark:text-amber-500">{data.high_priority_bugs}</p>
        </div>

        {/* Metric 6 */}
        <div className="relative group overflow-hidden rounded-2xl bg-white dark:bg-darkbg-100 p-5 border border-slate-200/50 dark:border-slate-800/40 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned To Me</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-800 dark:text-slate-100">{data.assigned_to_me}</p>
        </div>
        
      </div>

      {/* Charts / Data Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Trend & Priority */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Monthly Trends */}
          <div className="rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-brand-500" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Monthly Bug Trends</h3>
            </div>
            {renderTrendLine()}
          </div>

          {/* Bugs By Priority & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Status Breakdown List */}
            <div className="rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">Bugs By Status</h3>
              <div className="space-y-3">
                {Object.entries(data.bugs_by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Breakdown Stack */}
            <div className="rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">Bugs By Priority</h3>
              <div className="space-y-4.5">
                {Object.entries(data.bugs_by_priority).map(([priority, count]) => {
                  const maxCount = Math.max(...Object.values(data.bugs_by_priority), 1);
                  const percent = (count / maxCount) * 100;
                  const colorsInfo = priorityColors[priority] || priorityColors.Low;
                  
                  return (
                    <div key={priority} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className={colorsInfo.text}>{priority}</span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${percent}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${colorsInfo.bar}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Bugs Per Project */}
          <div className="rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-brand-500" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Bugs Per Project</h3>
            </div>
            <div className="space-y-4">
              {data.bugs_per_project.length === 0 ? (
                <p className="text-sm text-slate-400">No projects registered.</p>
              ) : (
                data.bugs_per_project.map((proj) => {
                  const maxCount = Math.max(...data.bugs_per_project.map(p => p.count), 1);
                  const percent = (proj.count / maxCount) * 100;
                  
                  return (
                    <div key={proj.project_name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{proj.project_name}</span>
                        <span className="font-bold text-slate-500">{proj.count} bugs</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${percent}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Developer Performance & Activity Log */}
        <div className="space-y-6">
          
          {/* Developer Performance */}
          <div className="rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">Developer Performance</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {data.developer_performance.length === 0 ? (
                <p className="text-sm text-slate-400">No developers found.</p>
              ) : (
                data.developer_performance.map((dev) => (
                  <div key={dev.developer_name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-darkbg-200/40 border border-slate-100 dark:border-slate-800/30">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{dev.developer_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Active assigned: {dev.assigned_count}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {dev.resolved_count} Resolved
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ActivityIcon className="w-5 h-5 text-brand-500" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Audit logs</h3>
            </div>
            
            <div className="relative pl-4 space-y-6 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200 dark:before:bg-slate-800">
              {data.recent_activities.length === 0 ? (
                <p className="text-xs text-slate-400">No logged activity yet.</p>
              ) : (
                data.recent_activities.map((act) => (
                  <div key={act.id} className="relative group text-xs">
                    {/* Bullet marker */}
                    <div className="absolute -left-[14.5px] top-1.5 h-2 w-2 rounded-full border border-slate-400 bg-white dark:bg-darkbg-100 group-hover:bg-brand-500 transition-colors" />
                    
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {act.action.replace('_', ' ')}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 leading-normal">
                        {act.details}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <span>By {act.user_name}</span>
                        <span>{act.created_at.split(' ')[1]}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
export default Dashboard;

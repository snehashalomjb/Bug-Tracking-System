import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Project, User } from '../types';
import { 
  FolderPlus, Edit, Trash2, Calendar, User as UserIcon, 
  Users, CheckCircle2, Archive, X
} from 'lucide-react';
import { useForm } from 'react-hook-form';

export const Projects: React.FC = () => {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const canManage = hasRole(['Admin', 'Project Manager']);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      description: '',
      status: 'Active',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      manager_id: '',
      member_ids: [] as number[],
    }
  });

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      showToast("Failed to load projects list.", "error");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      // Quiet fail if unauthorized, though canManage should prevent it
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchProjects();
      if (canManage) {
        await fetchUsers();
      }
      setLoading(false);
    };
    init();
  }, [canManage, showToast]);

  const openCreateModal = () => {
    setEditingProject(null);
    reset({
      name: '',
      description: '',
      status: 'Active',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      manager_id: '',
      member_ids: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    reset({
      name: project.name,
      description: project.description || '',
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date || '',
      manager_id: project.manager_id ? String(project.manager_id) : '',
      member_ids: project.members.map(m => m.id),
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      manager_id: data.manager_id ? Number(data.manager_id) : null,
      end_date: data.end_date || null,
      member_ids: data.member_ids.map(Number),
    };

    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, payload);
        showToast("Project updated successfully.", "success");
      } else {
        await api.post('/projects', payload);
        showToast("Project created successfully.", "success");
      }
      setIsModalOpen(false);
      fetchProjects();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Action failed. Check fields validations.";
      showToast(errorMsg, "error");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete project: "${name}"? All associated bugs will be deleted.`)) {
      return;
    }
    try {
      await api.delete(`/projects/${id}`);
      showToast("Project deleted successfully.", "success");
      fetchProjects();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Delete operation failed.", "error");
    }
  };

  // Filters candidates with PM or Admin roles for manager dropdown
  const managerCandidates = users.filter(u => 
    u.roles.some(r => r.name === 'Project Manager' || r.name === 'Admin')
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'Archived':
      default:
        return <Archive className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30';
      case 'Completed':
        return 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30';
      case 'Archived':
      default:
        return 'bg-slate-50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Project Workspace</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage development projects and user memberships</p>
        </div>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold shadow-md shadow-brand-500/10 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" /> Create Project
          </button>
        )}
      </div>

      {/* Project Cards Grid */}
      {projects.length === 0 ? (
        <div className="glass-panel p-10 rounded-2xl text-center border border-slate-200/50 dark:border-slate-800/40">
          <FolderPlus className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Projects Registered</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Get started by creating a new project tracking space.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="relative group rounded-2xl bg-white dark:bg-darkbg-100 p-6 border border-slate-200/60 dark:border-slate-800/40 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full"
            >
              
              {/* Card Header */}
              <div className="flex justify-between items-start gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${getStatusBadgeClass(project.status)}`}>
                  {getStatusIcon(project.status)} {project.status}
                </span>
                
                {/* Actions (PM/Admin) */}
                {canManage && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity duration-200">
                    <button
                      onClick={() => openEditModal(project)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-brand-500 dark:hover:bg-slate-800 transition-colors"
                      title="Edit Project"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id, project.name)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Title & Desc */}
              <div className="mt-4 flex-1">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-500 transition-colors">
                  {project.name}
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              {/* Metadata details */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/40 space-y-3 text-xs">
                
                {/* Date */}
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    {new Date(project.start_date).toLocaleDateString()}
                    {project.end_date ? ` - ${new Date(project.end_date).toLocaleDateString()}` : ' (Ongoing)'}
                  </span>
                </div>

                {/* Manager */}
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>
                    PM: <span className="font-semibold text-slate-700 dark:text-slate-200">{project.manager?.full_name || 'Unassigned'}</span>
                  </span>
                </div>

                {/* Members list summary */}
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>
                    Members: <span className="font-semibold text-slate-700 dark:text-slate-200">{project.members.length} Users</span>
                  </span>
                </div>

                {/* Avatars overlaps */}
                {project.members.length > 0 && (
                  <div className="flex -space-x-2 overflow-hidden pt-1.5">
                    {project.members.slice(0, 5).map((member) => (
                      <div 
                        key={member.id} 
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-darkbg-100 bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-[9px] uppercase"
                        title={member.full_name}
                      >
                        {member.full_name.charAt(0)}
                      </div>
                    ))}
                    {project.members.length > 5 && (
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-darkbg-100 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-[8px]">
                        +{project.members.length - 5}
                      </div>
                    )}
                  </div>
                )}
                
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Creation / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-slide-in">
            
            {/* Modal Title */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/40">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {editingProject ? 'Edit Project Specifications' : 'Launch New Project Tracking'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
              
              {/* Project Name */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500">Project Name</label>
                <input
                  type="text"
                  {...register('name', { required: 'Project name is required' })}
                  className={`mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                    errors.name ? 'border-rose-500' : ''
                  }`}
                  placeholder="e.g. Redesign Login Portal"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500">Description</label>
                <textarea
                  rows={3}
                  {...register('description')}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Detailed project explanation, targets, and notes..."
                />
              </div>

              {/* Status & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500">Status</label>
                  <select
                    {...register('status')}
                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500">Start Date</label>
                  <input
                    type="date"
                    {...register('start_date', { required: 'Start date is required' })}
                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2 px-3 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500">End Date</label>
                  <input
                    type="date"
                    {...register('end_date')}
                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2 px-3 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Manager Assignment */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500">Project Manager</label>
                <select
                  {...register('manager_id')}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select Manager (PM/Admin Only)</option>
                  {managerCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Members Checklist Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">Project Members</label>
                <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-darkbg-200/20 rounded-xl p-3.5 max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-850 p-1.5 rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        value={u.id}
                        {...register('member_ids')}
                        className="rounded border-slate-350 text-brand-500 focus:ring-brand-500/25 h-4 w-4"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                        {u.full_name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 px-4 text-sm font-semibold text-slate-600 dark:text-slate-350 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white py-2.5 px-4 text-sm font-semibold shadow-md shadow-brand-500/10 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      
    </div>
  );
};
export default Projects;

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Project, User, Bug } from '../types';
import { 
  ArrowLeft, Save, UploadCloud, X, FileText, 
  FileArchive, FileImage
} from 'lucide-react';

export const BugForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const isEditMode = !!id;

  // Selection Candidates States
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Attachments Drag & Drop states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      project_id: '',
      title: '',
      description: '',
      steps_to_reproduce: '',
      expected_result: '',
      actual_result: '',
      module_name: '',
      browser: '',
      os: '',
      priority: 'Medium',
      severity: 'Major',
      status: 'New',
      assignee_id: '',
      due_date: '',
    }
  });

  const selectedProjectId = watch('project_id');

  useEffect(() => {
    const loadFormInfo = async () => {
      try {
        const [projRes, userRes] = await Promise.all([
          api.get('/projects'),
          api.get('/users').catch(() => ({ data: [] }))
        ]);
        setProjects(projRes.data);
        setUsers(userRes.data);

        if (isEditMode) {
          const bugRes = await api.get(`/bugs/${id}`);
          const bug: Bug = bugRes.data;
          
          reset({
            project_id: String(bug.project_id),
            title: bug.title,
            description: bug.description,
            steps_to_reproduce: bug.steps_to_reproduce || '',
            expected_result: bug.expected_result || '',
            actual_result: bug.actual_result || '',
            module_name: bug.module_name || '',
            browser: bug.browser || '',
            os: bug.os || '',
            priority: bug.priority,
            severity: bug.severity,
            status: bug.status,
            assignee_id: bug.assignee_id ? String(bug.assignee_id) : '',
            due_date: bug.due_date || '',
          });
          setExistingAttachments(bug.attachments || []);
        }
      } catch (err) {
        showToast("Error loading form parameters.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadFormInfo();
  }, [id, isEditMode, reset, showToast]);

  // Filters members of the currently selected project for assignee candidates
  const currentProject = projects.find(p => String(p.id) === String(selectedProjectId));
  const assigneeCandidates = currentProject ? currentProject.members : users;

  // File drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateAndAddFiles = (filesList: FileList) => {
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'zip', 'rar', 'log'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const validFiles: File[] = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!allowedExtensions.includes(ext)) {
        showToast(`Format rejection: file "${file.name}" has unaccepted extension.`, "warning");
        continue;
      }
      if (file.size > maxSize) {
        showToast(`Size limit error: file "${file.name}" exceeds 5MB size limit.`, "warning");
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndAddFiles(e.target.files);
    }
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const deleteExistingAttachment = async (attachmentId: number) => {
    if (!window.confirm("Are you sure you want to delete this attachment permanently?")) return;
    try {
      await api.delete(`/bugs/attachments/${attachmentId}`);
      showToast("Attachment deleted.", "success");
      setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Delete attachment failed.", "error");
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif'].includes(ext || '')) {
      return <FileImage className="w-5 h-5 text-emerald-500" />;
    }
    if (['zip', 'rar'].includes(ext || '')) {
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    }
    return <FileText className="w-5 h-5 text-brand-500" />;
  };

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    const payload = {
      ...data,
      project_id: Number(data.project_id),
      assignee_id: data.assignee_id ? Number(data.assignee_id) : null,
      due_date: data.due_date || null,
    };

    try {
      let bugId: number;
      
      if (isEditMode) {
        bugId = Number(id);
        await api.put(`/bugs/${bugId}`, payload);
        showToast("Bug tracker updated successfully.", "success");
      } else {
        const createRes = await api.post('/bugs', payload);
        bugId = createRes.data.id;
        showToast("Bug logged successfully.", "success");
      }

      // Handle file attachments sequentially if selected
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          await api.post(`/bugs/${bugId}/attachments`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }
        showToast("Attachments uploaded successfully.", "success");
      }

      navigate(`/bugs/${bugId}`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Action failed. Check fields validations.";
      showToast(errorMsg, "error");
    } finally {
      setSubmitting(false);
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
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header bar */}
      <div className="flex items-center gap-4">
        <Link 
          to={isEditMode ? `/bugs/${id}` : "/bugs"}
          className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-55/60 dark:hover:bg-slate-800 p-2 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {isEditMode ? 'Edit Bug Specifications' : 'Report Project Bug'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Document diagnostics details, environments, and attach files</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns: Main fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white/80 dark:bg-darkbg-100/80 backdrop-blur-md shadow-lg space-y-4">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-550">Bug Summary Title</label>
              <input
                type="text"
                {...register('title', { required: 'Bug title is required' })}
                className={`mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  errors.title ? 'border-rose-500' : ''
                }`}
                placeholder="e.g. Server crash on refreshing cart page"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-550">Description / Details</label>
              <textarea
                rows={4}
                {...register('description', { required: 'Bug description details are required' })}
                className={`mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                  errors.description ? 'border-rose-500' : ''
                }`}
                placeholder="Describe what occurs and how it impacts functionality..."
              />
            </div>

            {/* Diagnostics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-550">Steps to Reproduce</label>
                <textarea
                  rows={3}
                  {...register('steps_to_reproduce')}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2 px-3 text-sm focus:outline-none"
                  placeholder="1. Login as standard user&#10;2. Click add cart&#10;3. Verify crash..."
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-550">Expected Result</label>
                  <input
                    type="text"
                    {...register('expected_result')}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2 px-3 text-sm focus:outline-none"
                    placeholder="User should see added item badge"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-550">Actual Result</label>
                  <input
                    type="text"
                    {...register('actual_result')}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2 px-3 text-sm focus:outline-none"
                    placeholder="Page blank white screen crashes"
                  />
                </div>
              </div>
            </div>

            {/* Module Name, OS, Browser */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-550">Module/Component</label>
                <input
                  type="text"
                  {...register('module_name')}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:outline-none"
                  placeholder="e.g. Authentication"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-550">Operating System</label>
                <input
                  type="text"
                  {...register('os')}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:outline-none"
                  placeholder="e.g. Windows 11"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-550">Browser</label>
                <input
                  type="text"
                  {...register('browser')}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:outline-none"
                  placeholder="e.g. Chrome 124"
                />
              </div>
            </div>

          </div>

          {/* Attachments drag & drop zone */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white/80 dark:bg-darkbg-100/80 backdrop-blur-md shadow-lg space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">File Attachments</h3>
            
            {/* Existing Attachments for Edits */}
            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Current Saved Attachments:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {existingAttachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-darkbg-250/20 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(att.file_name)}
                        <span className="font-semibold text-slate-700 dark:text-slate-350 truncate">{att.file_name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteExistingAttachment(att.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drag Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                isDragActive 
                  ? 'border-brand-500 bg-brand-500/5' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-brand-500 bg-slate-50/10 hover:bg-slate-50/20'
              }`}
            >
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2 animate-bounce" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Drag and drop file attachments here</p>
              <p className="text-xs text-slate-400 mt-1">Accepts images, PDF, zip, txt, log files up to 5MB</p>
              
              <label className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 py-2 px-4 text-xs font-semibold text-slate-600 dark:text-slate-350 cursor-pointer transition-colors">
                Browse Files
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Selected files preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-semibold">New Files to be Uploaded:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-brand-500/20 bg-brand-500/5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(file.name)}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-450">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(idx)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100/50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Column: Settings & Metadata */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white/80 dark:bg-darkbg-100/80 backdrop-blur-md shadow-lg space-y-4">
            
            {/* Project Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-550">Project Space</label>
              <select
                {...register('project_id', { required: 'Project is required' })}
                disabled={isEditMode}
                className={`mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2 text-sm focus:border-brand-500 focus:outline-none ${
                  isEditMode ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="">Select Project Target</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.project_id && (
                <p className="mt-1 text-xs text-rose-500">{errors.project_id.message}</p>
              )}
            </div>

            {/* Workflow status */}
            {isEditMode && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-550">Workflow Status</label>
                <select
                  {...register('status')}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2 text-sm focus:border-brand-500 focus:outline-none"
                >
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
            )}

            {/* Priority & Severity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-550">Priority</label>
                <select
                  {...register('priority')}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-550">Severity</label>
                <select
                  {...register('severity')}
                  className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="Minor">Minor</option>
                  <option value="Major">Major</option>
                  <option value="Critical">Critical</option>
                  <option value="Blocker">Blocker</option>
                </select>
              </div>
            </div>

            {/* Assignee Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-550">Assignee</label>
              <select
                {...register('assignee_id')}
                disabled={!selectedProjectId}
                className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Assignee</option>
                {assigneeCandidates.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
              {!selectedProjectId && (
                <p className="mt-1 text-[10px] text-slate-400 italic">Select project space target first.</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-550">Due Date</label>
              <input
                type="date"
                {...register('due_date')}
                className="mt-1.5 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-350 text-white font-semibold py-3 px-4 text-sm shadow-md shadow-brand-500/10 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Bug Report
                </>
              )}
            </button>

          </div>
        </div>

      </form>

    </div>
  );
};
export default BugForm;

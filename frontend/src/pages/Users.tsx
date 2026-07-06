import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { User } from '../types';
import { 
  UserPlus, Edit, Trash2, Key, Check, ShieldAlert,
  X, Mail
} from 'lucide-react';
import { useForm } from 'react-hook-form';

export const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role_names: [] as string[],
      is_active: true,
    }
  });

  const { register: registerReset, handleSubmit: handleSubmitReset, reset: resetReset, formState: { errors: errorsReset } } = useForm({
    defaultValues: {
      new_password: ''
    }
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      showToast("Failed to load users list.", "error");
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchUsers();
      setLoading(false);
    };
    init();
  }, [showToast]);

  const openCreateModal = () => {
    setEditingUser(null);
    reset({
      fullName: '',
      email: '',
      password: '',
      role_names: ['Developer'],
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    reset({
      fullName: user.full_name,
      email: user.email,
      password: '', // Empty password for updates
      role_names: user.roles.map(r => r.name),
      is_active: user.is_active,
    });
    setIsModalOpen(true);
  };

  const openPasswordResetModal = (user: User) => {
    setResettingUser(user);
    resetReset({ new_password: '' });
    setIsPasswordResetOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingUser) {
        // For updates, we mapping Pydantic fields
        const payload = {
          email: data.email,
          full_name: data.fullName,
          is_active: data.is_active,
          role_names: data.role_names,
          password: data.password || null
        };
        await api.put(`/users/${editingUser.id}`, payload);
        showToast("User updated successfully.", "success");
      } else {
        const payload = {
          email: data.email,
          password: data.password,
          full_name: data.fullName,
          role_names: data.role_names
        };
        await api.post('/users', payload);
        showToast("User created successfully.", "success");
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Action failed. Check validations.";
      showToast(errorMsg, "error");
    }
  };

  const onSubmitPasswordReset = async (data: any) => {
    if (!resettingUser) return;
    try {
      // Put request mapping Pydantic UserUpdate payload
      await api.put(`/users/${resettingUser.id}`, {
        password: data.new_password
      });
      showToast(`Password reset successfully for ${resettingUser.full_name}.`, "success");
      setIsPasswordResetOpen(false);
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Password reset failed.";
      showToast(errorMsg, "error");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (id === currentUser?.id) {
      showToast("Security Lock: You cannot delete your own account.", "warning");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user: "${name}"?`)) {
      return;
    }
    try {
      await api.delete(`/users/${id}`);
      showToast("User account deleted successfully.", "success");
      fetchUsers();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Delete operation failed.", "error");
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
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">User Specifications</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Admin panel to provision user accounts, modify roles, and reset credentials</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold shadow-md shadow-brand-500/10 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" /> Add User Account
        </button>
      </div>

      {/* Users Grid Table */}
      <div className="rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-darkbg-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-darkbg-200/30 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Assigned Roles</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
              {users.map((item) => (
                <tr 
                  key={item.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  
                  {/* Name / Email */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-base uppercase">
                        {item.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{item.full_name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Mail className="w-3.5 h-3.5" /> {item.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Roles */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {item.roles.map((r) => (
                        <span 
                          key={r.id}
                          className="rounded-full bg-brand-500/10 dark:bg-brand-500/20 px-2.5 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30"
                        >
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 text-center">
                    {item.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                        <Check className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 dark:bg-slate-900/20 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                        <X className="w-3.5 h-3.5" /> Suspended
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      
                      {/* Password Reset */}
                      <button
                        onClick={() => openPasswordResetModal(item)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-500"
                        title="Edit Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(item.id, item.full_name)}
                        disabled={item.id === currentUser?.id}
                        className={`rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 ${
                          item.id === currentUser?.id ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        title={item.id === currentUser?.id ? 'Cannot delete self' : 'Delete User'}
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
      </div>

      {/* Creation / Update Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-slide-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/40">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {editingUser ? 'Modify User Profile' : 'Register New User Account'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500">Full Name</label>
                <input
                  type="text"
                  {...register('fullName', { required: 'Full name is required' })}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none"
                  placeholder="John Doe"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500">Email Address</label>
                <input
                  type="email"
                  {...register('email', { required: 'Email address is required' })}
                  className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none"
                  placeholder="john@company.com"
                />
              </div>

              {/* Password (Only show on creation, optional for updates) */}
              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500">Password</label>
                  <input
                    type="password"
                    {...register('password', { required: 'Password is required' })}
                    className="mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
              )}

              {/* Roles selection */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">User Roles</label>
                <div className="flex flex-col gap-2 p-3 border border-slate-250/20 dark:border-slate-800/40 rounded-xl bg-slate-50/20 dark:bg-darkbg-200/20">
                  {['Admin', 'Project Manager', 'Developer', 'Tester'].map((roleName) => (
                    <label key={roleName} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-100/50 dark:hover:bg-slate-800/40">
                      <input
                        type="checkbox"
                        value={roleName}
                        {...register('role_names')}
                        className="rounded border-slate-350 text-brand-500 focus:ring-brand-500/25 h-4 w-4"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">{roleName}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Active Toggle (Only for editing) */}
              {editingUser && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    {...register('is_active')}
                    className="rounded border-slate-350 text-brand-500 focus:ring-brand-500/25 h-4 w-4"
                  />
                  <label htmlFor="is_active" className="text-xs font-semibold uppercase text-slate-500 cursor-pointer">
                    Account Status Active
                  </label>
                </div>
              )}

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
                  Save User
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {isPasswordResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsPasswordResetOpen(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
          
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-slide-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/40">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Reset Account Password
              </h3>
              <button onClick={() => setIsPasswordResetOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-normal">
                You are updating the credentials for <strong>{resettingUser?.full_name}</strong>. Provide a secure new password.
              </p>
            </div>

            <form onSubmit={handleSubmitReset(onSubmitPasswordReset)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500">New Password</label>
                <input
                  type="password"
                  {...registerReset('new_password', { 
                    required: 'New password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                  })}
                  className={`mt-1 block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-2.5 px-3 text-sm focus:border-brand-500 focus:outline-none ${
                    errorsReset.new_password ? 'border-rose-500' : ''
                  }`}
                  placeholder="••••••••"
                />
                {errorsReset.new_password && (
                  <p className="mt-1 text-xs text-rose-500">{errorsReset.new_password.message}</p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <button
                  type="button"
                  onClick={() => setIsPasswordResetOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 px-4 text-sm font-semibold text-slate-600 dark:text-slate-350 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white py-2.5 px-4 text-sm font-semibold shadow-md shadow-brand-500/10 cursor-pointer"
                >
                  Apply Reset
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Users;

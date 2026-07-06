import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Shield, User as UserIcon, Calendar } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-panel p-8 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white/80 dark:bg-darkbg-100/80 backdrop-blur-md shadow-xl">
        
        {/* Banner header */}
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800/40">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold text-3xl shadow-lg shadow-brand-500/20">
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {user?.full_name || 'User Profile'}
            </h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
              {user?.roles?.map((role) => (
                <span 
                  key={role.id}
                  className="rounded-full bg-brand-500/10 dark:bg-brand-500/20 px-3 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400"
                >
                  {role.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Profile Card Fields */}
        <div className="mt-8 space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Account Specifications
          </h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            
            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><Mail className="w-5 h-5" /></div>
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Email Address</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{user?.email}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><Shield className="w-5 h-5" /></div>
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Activation State</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                  {user?.is_active ? 'Active Account' : 'Deactivated'}
                </p>
              </div>
            </div>

            {/* User ID */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><UserIcon className="w-5 h-5" /></div>
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Unique User ID</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">#{user?.id}</p>
              </div>
            </div>

            {/* Member Since */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><Calendar className="w-5 h-5" /></div>
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Registration Date</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
};
export default Profile;

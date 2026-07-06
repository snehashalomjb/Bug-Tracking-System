import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-darkbg-200 px-4 transition-colors duration-200">
      <div className="w-full max-w-md text-center glass-panel p-8 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/40 bg-white/80 dark:bg-darkbg-100/80 backdrop-blur-md">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 mx-auto shadow-sm">
          <ShieldAlert className="h-10 w-10 animate-bounce" />
        </div>
        
        <h2 className="mt-6 text-2xl font-bold text-slate-800 dark:text-slate-100">
          Access Denied
        </h2>
        
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          You do not have the required permissions to view this resource. Please contact your system administrator if you believe this is an error.
        </p>
        
        <div className="mt-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 px-5 py-3 text-sm font-semibold text-white transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
export default Unauthorized;

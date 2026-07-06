import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Bug, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      password: '',
    }
  });

  // Redirect to dashboard or previous location
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      showToast("Logged in successfully! Welcome back.", "success");
      navigate(from, { replace: true });
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Authentication failed. Check your credentials.";
      showToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-darkbg-200 px-4 py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      
      {/* Glow effects */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/40 bg-white/80 dark:bg-darkbg-100/80 backdrop-blur-md">
        
        {/* Header */}
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 text-white shadow-lg shadow-brand-500/30">
            <Bug className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Sign In
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Access the Antigravity Bug Tracking System
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Email Address
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  className={`block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:bg-white dark:focus:bg-darkbg-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all ${
                    errors.email ? 'border-rose-500 focus:ring-rose-500/20' : ''
                  }`}
                  placeholder="name@company.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Password
              </label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password', { required: 'Password is required' })}
                  className={`block w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-darkbg-200/50 py-3 pl-10 pr-10 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-brand-500 focus:bg-white dark:focus:bg-darkbg-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all ${
                    errors.password ? 'border-rose-500 focus:ring-rose-500/20' : ''
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 py-3 px-4 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all shadow-md shadow-brand-500/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <span className="flex items-center gap-1.5">
                Sign In <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Login;

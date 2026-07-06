import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { useToast } from '../context/ToastContext';
import { 
  LayoutDashboard, Folder, Bug, Users, FileBarChart, 
  LogOut, Moon, Sun, Bell, Menu, X, ChevronRight, User as UserIcon
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const handleLogout = () => {
    logout();
    showToast("Logged out successfully.", "info");
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Admin', 'Project Manager', 'Developer', 'Tester'] },
    { name: 'Projects', path: '/projects', icon: Folder, roles: ['Admin', 'Project Manager', 'Developer', 'Tester'] },
    { name: 'Bugs', path: '/bugs', icon: Bug, roles: ['Admin', 'Project Manager', 'Developer', 'Tester'] },
    { name: 'Users', path: '/users', icon: Users, roles: ['Admin'] },
    { name: 'Reports', path: '/reports', icon: FileBarChart, roles: ['Admin', 'Project Manager', 'Developer', 'Tester'] },
  ];

  const getPageTitle = () => {
    const currentPath = location.pathname;
    if (currentPath.startsWith('/dashboard')) return 'Dashboard';
    if (currentPath.startsWith('/projects')) return 'Projects';
    if (currentPath.startsWith('/bugs')) return 'Bugs';
    if (currentPath.startsWith('/users')) return 'User Management';
    if (currentPath.startsWith('/reports')) return 'Reports';
    if (currentPath.startsWith('/profile')) return 'User Profile';
    if (currentPath.startsWith('/settings')) return 'Settings';
    return 'Bug Tracker';
  };

  const activeClass = (path: string) => {
    return location.pathname.startsWith(path) 
      ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-r-4 border-brand-500 font-medium'
      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200';
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-darkbg-200 transition-colors duration-200 overflow-hidden">
      
      {/* Backdrop overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-darkbg-100/80 backdrop-blur-md transition-transform duration-300 lg:static lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/40">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 text-white shadow-md shadow-brand-500/20">
              <Bug className="w-5 h-5 animate-pulse" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent dark:from-brand-400 dark:to-indigo-400">
              Bug Tracker
            </span>
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {navItems
            .filter((item) => hasRole(item.roles))
            .map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 ${activeClass(
                  item.path
                )}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
                {location.pathname.startsWith(item.path) && (
                  <ChevronRight className="w-4 h-4 ml-auto text-brand-500" />
                )}
              </Link>
            ))}
        </nav>

        {/* Sidebar User Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-darkbg-200/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user?.full_name || 'User Profile'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.roles?.[0]?.name || 'Developer'}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-darkbg-100/80 backdrop-blur-md px-6 z-10 flex-shrink-0">
          
          {/* Burger menu for Mobile */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-550 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {getPageTitle()}
            </h1>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="rounded-lg p-2 text-slate-505 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notification trigger */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-darkbg-100" />
              </button>
              
              {isNotificationOpen && (
                <>
                  <div 
                    onClick={() => setIsNotificationOpen(false)}
                    className="fixed inset-0 z-40 bg-transparent"
                  />
                  <div className="absolute right-0 mt-2 z-50 w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Notifications</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Welcome to the Bug Tracking System!
                        </p>
                        <span className="text-[10px] text-slate-400">Just now</span>
                      </div>
                      <div className="pb-1">
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Check your assigned bugs in the Bugs Log.
                        </p>
                        <span className="text-[10px] text-slate-400">10 mins ago</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800" />

            {/* Profile badge link */}
            <Link 
              to="/profile" 
              className="flex items-center gap-2 hover:opacity-85"
            >
              <div className="h-8 w-8 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden md:inline text-sm font-medium text-slate-700 dark:text-slate-300">
                {user?.full_name.split(' ')[0]}
              </span>
            </Link>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-6 focus:outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;

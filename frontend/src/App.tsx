import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DarkModeProvider } from './context/DarkModeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import BugsList from './pages/BugsList';
import BugForm from './pages/BugForm';
import BugDetails from './pages/BugDetails';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <DarkModeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Protected Routes Container */}
              <Route element={<ProtectedRoute />}>
                
                {/* Dashboard Layout Wrapper */}
                <Route element={<DashboardLayout />}>
                  {/* General Protected Routes */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/bugs" element={<BugsList />} />
                  <Route path="/bugs/new" element={<BugForm />} />
                  <Route path="/bugs/:id" element={<BugDetails />} />
                  <Route path="/bugs/:id/edit" element={<BugForm />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/profile" element={<Profile />} />
                  
                  {/* Admin Only Routes */}
                  <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                    <Route path="/users" element={<Users />} />
                  </Route>

                  {/* Root fallback */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Route>

              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </DarkModeProvider>
    </ToastProvider>
  );
};

export default App;

// frontend/src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import api from './services/api';

// lazy-load existing pages (your existing files)
const Login = lazy(() => import('./pages/Login'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const InvigilatorDashboard = lazy(() => import('./pages/InvigilatorDashboard'));
const AdminExamPreview = lazy(() => import('./pages/AdminExamPreview'));

// Small wrapper to inject header only on protected routes
function ProtectedLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="/login" element={<Login />} />

          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <ProtectedLayout>
                <StudentDashboard />
              </ProtectedLayout>
            </ProtectedRoute>
          } />

          <Route path="/invigilator" element={
            <ProtectedRoute allowedRoles={['invigilator']}>
              <ProtectedLayout>
                <InvigilatorDashboard />
              </ProtectedLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ProtectedLayout>
                <AdminExamPreview />
              </ProtectedLayout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<div className="p-6">Page not found — <a href="/login" className="text-sky-600">Go to login</a></div>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

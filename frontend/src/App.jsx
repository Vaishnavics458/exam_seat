// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login'; // create or ensure you have Login.jsx
import StudentDashboard from './pages/StudentDashboard';
import AdminExamPreview from './pages/AdminExamPreview';
import InvigilatorDashboard from './pages/InvigilatorDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminStudents from './pages/admin/AdminStudents';
import ProtectedRoute from './components/ProtectedRoute';
import api from './services/api';
import AdminInvigilators from './pages/admin/AdminInvigilators';
import AdminRooms from './pages/admin/AdminRooms';
import AdminExams from './pages/admin/AdminExams';

export default function App(){
  // If you want login to auto-open as first page, ensure / route redirects to /login
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />

        {/* Student dashboard */}
        <Route path="/student" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } />

        {/* Invigilator dashboard */}
        <Route path="/invigilator" element={
          <ProtectedRoute allowedRoles={['invigilator']}>
            <InvigilatorDashboard />
          </ProtectedRoute>
        } />

        
        {/* Admin area with nested subpages */}
<Route path="/admin" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminLayout />
  </ProtectedRoute>
}>
  <Route index element={<Navigate to="students" replace />} />
  <Route path="students" element={<AdminStudents />} />
  <Route path="invigilators" element={<AdminInvigilators />} />
  <Route path="rooms" element={<AdminRooms />} />
  <Route path="exams" element={<AdminExams />} />
  {/* Admin Exam Preview (per-exam + shortcut preview) */}
  {/* URL: /admin/preview  OR /admin/exams/:examId/preview */}
  <Route path="preview" element={<AdminExamPreview />} />
  <Route path="exams/:examId/preview" element={<AdminExamPreview />} />
</Route>



        {/* fallback */}
        <Route path="*" element={<div className="p-6">Not found — <a href="/login">Go to login</a></div>} />
      </Routes>
    </BrowserRouter>
  );
}

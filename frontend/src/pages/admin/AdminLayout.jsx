// frontend/src/pages/admin/AdminLayout.jsx
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = (api && api.getAuthUser) ? api.getAuthUser() : null;
  const displayName = (user && (user.email || user.name || user.role)) ? (user.email || user.name || user.role) : 'admin';

  function handleLogout() {
    // clear token & user then redirect to login
    api.setAuthToken && api.setAuthToken(null, null);
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-semibold text-sky-800">Admin — Control Panel</h1>
            <div className="text-sm text-slate-500">Manage students, invigilators, rooms & exams</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-700">Signed in as: <span className="font-medium">{displayName}</span></div>
            <button onClick={handleLogout} className="px-3 py-2 border rounded bg-white hover:bg-slate-50">Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex gap-6 p-6">
        {/* sidebar */}
        <aside className="w-56">
          <nav className="space-y-2 bg-white p-4 rounded shadow-sm">
            <ul className="space-y-2">
              <li>
                <NavLink
                  to="/admin/students"
                  className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'text-sky-700 font-medium' : 'text-slate-700'}`}
                >
                  Students
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/admin/invigilators"
                  className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'text-sky-700 font-medium' : 'text-slate-700'}`}
                >
                  Invigilators
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/admin/rooms"
                  className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'text-sky-700 font-medium' : 'text-slate-700'}`}
                >
                  Rooms
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/admin/exams"
                  className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'text-sky-700 font-medium' : 'text-slate-700'}`}
                >
                  Exams
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/admin/preview"
                  className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'text-sky-700 font-medium' : 'text-slate-700'}`}
                >
                  Exam Preview
                </NavLink>
              </li>
            </ul>
          </nav>
        </aside>

        {/* main content area: nested routes render here */}
        <main className="flex-1">
          <div className="bg-white rounded shadow-sm p-6">
            {/* Outlet renders AdminStudents, AdminExams, AdminExamPreview, etc. */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// frontend/src/pages/admin/AdminLayout.jsx
import { NavLink} from 'react-router-dom';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function AdminLayout() {
  const user = api.getAuthUser();
  const navigate = useNavigate();

  function logout() {
    api.setAuthToken(null, null);
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-sky-800">Admin — Control Panel</h1>
          <div className="text-xs text-slate-500">Manage students, invigilators, rooms & exams</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600">Signed in as: <span className="font-medium">{user?.role || '—'}</span></div>
          <button className="px-3 py-1 border rounded" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <aside className="bg-white p-3 rounded shadow-sm">
          <nav className="space-y-2">
            <Link to="/admin/students" className="block px-2 py-2 rounded hover:bg-slate-50">Students</Link>
            <Link to="/admin/invigilators" className="block px-2 py-2 rounded hover:bg-slate-50">Invigilators</Link>
            <Link to="/admin/rooms" className="block px-2 py-2 rounded hover:bg-slate-50">Rooms</Link>
            <Link to="/admin/exams" className="block px-2 py-2 rounded hover:bg-slate-50">Exams</Link>
            {/* inside AdminLayout's sidebar nav list, add this AFTER Exams */}
<li className="py-2 px-4">
  <NavLink to="/admin/preview" className={({isActive}) => isActive ? 'font-semibold text-sky-700' : 'text-slate-700'}>
    Exam Preview
  </NavLink>
</li>

          </nav>
        </aside>

        <main className="bg-white p-4 rounded shadow-sm">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// frontend/src/components/Header.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Header() {
  const navigate = useNavigate();
  const user = api.getAuthUser ? api.getAuthUser() : null;

  function doLogout() {
    api.setAuthToken && api.setAuthToken(null, null);
    try { // clear fallback window props too
      if (typeof window !== 'undefined') {
        window.__examseat_token = null;
        window.__examseat_user = null;
      }
    } catch(e){}
    navigate('/login', { replace: true });
  }

  return (
    <header className="w-full bg-white border-b py-3 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <div>
          <div className="text-sky-800 font-semibold text-lg">ExamSeat Pro</div>
          <div className="text-xs text-slate-500">Manage seating, invigilation & preview</div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="text-sm text-slate-600">
              Signed in as: <span className="font-medium text-slate-800">{user.role || '—'}</span>
              {user.name ? <span className="ml-2 text-slate-500">({user.name})</span> : null}
              {user.roll_number ? <span className="ml-2 text-slate-500">({user.roll_number})</span> : null}
            </div>
          ) : null}

          <button
            onClick={doLogout}
            className="px-3 py-1 rounded border bg-white text-sm hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

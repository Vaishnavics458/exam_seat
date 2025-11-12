// frontend/src/pages/StudentDashboard.jsx
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import React, { useEffect, useState } from 'react';
import { getStudentSeating, getAuthUser } from '../services/api';
import SeatGrid from '../components/SeatGrid';

export default function StudentDashboard() {
  const [roll, setRoll] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const navigate = useNavigate();


  // if logged-in student, auto-load
  useEffect(() => {
    const user = getAuthUser();
    if (user && user.role === 'student' && user.roll_number) {
      setRoll(user.roll_number);
      fetchSeating(user.roll_number);
    }
  }, []);

  async function fetchSeating(rollNumber) {
    setError('');
    setData(null);
    if (!rollNumber) return setError('Please enter a roll number');
    setLoading(true);
    try {
      const res = await getStudentSeating(rollNumber.trim());
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }

  async function onSearch(e) {
    e?.preventDefault();
    await fetchSeating(roll);
  }

  const user = getAuthUser();

  return (
    <div className="bg-white p-6 rounded shadow max-w-3xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Student Dashboard</h2>
        <div className="text-sm text-slate-500">
          {user ? `Signed in as: ${user.name || user.roll_number || user.email} (${user.role})` : 'Not signed in'}
        </div>
      </div>
      {/* Header with signed-in info + logout */}
<div className="flex items-center justify-between mb-4">
  <div>
    <h1 className="text-xl font-semibold">Student Dashboard</h1>
    <div className="text-xs text-slate-500">
      Signed in as: <span className="font-medium">
        { (api.getAuthUser && api.getAuthUser()?.role) || 'student' }
      </span>
      { (api.getAuthUser && api.getAuthUser()?.roll_number) ? ` • ${api.getAuthUser().roll_number}` : '' }
    </div>
  </div>

  <div>
    <button
      className="px-3 py-1 border rounded bg-white"
      onClick={() => {
        if (typeof api.setAuthToken === 'function') api.setAuthToken(null, null);
        try { localStorage.removeItem('examseat_token'); localStorage.removeItem('examseat_user'); } catch (_) {}
        navigate('/login', { replace: true });
      }}
    >
      Logout
    </button>
  </div>
</div>


      {/* If logged-in student, hide manual input and auto-loaded above */}
      {(!user || user.role !== 'student') && (
        <form onSubmit={onSearch} className="flex gap-2 mb-4">
          <input
            value={roll}
            onChange={e => setRoll(e.target.value)}
            placeholder="Enter roll number (e.g. 1BI22IS001)"
            className="flex-1 p-2 border rounded"
          />
          <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded">
            {loading ? 'Searching...' : 'Find'}
          </button>
        </form>
      )}

      {error && <div className="mt-4 text-red-600">{error}</div>}

      {data && (
        <div className="mt-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium">{data.student.name} — {data.student.roll_number}</h3>
            <div className="text-sm text-slate-600">Student ID: {data.student.student_id}</div>
          </div>

          {data.assignments.length === 0 ? (
            <div className="p-4 bg-yellow-50 rounded">No assignments found for this student.</div>
          ) : (
            <div className="grid gap-4">
              {data.assignments.map((a, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-500">{a.date} • {a.time_slot}</div>
                      <div className="text-xl font-semibold">{a.exam_id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-500">Room</div>
                      <div className="text-lg font-medium">{a.room_name || 'TBD'}</div>
                      <div className="text-sky-700 mt-1">Seat: {a.seat_id || 'Not assigned'}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <SeatGrid roomName={a.room_name} seatId={a.seat_id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

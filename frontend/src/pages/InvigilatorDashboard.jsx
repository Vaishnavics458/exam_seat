// frontend/src/pages/InvigilatorDashboard.jsx
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import api, { getAuthUser } from "../services/api";

export default function InvigilatorDashboard() {
  const [invigilators, setInvigilators] = useState([]);
  const [invigilatorId, setInvigilatorId] = useState("");
  const [duties, setDuties] = useState([]);
  const [loadingInvs, setLoadingInvs] = useState(false);
  const [loadingDuties, setLoadingDuties] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();


  // on mount: fetch invigilators and try to preselect the logged-in user
// inside InvigilatorDashboard.jsx - replace useEffect / initial load logic with:
useEffect(() => {
  // If logged-in invigilator, auto-select them
  async function init() {
    setLoadingInvs(true);
    try {
      const listRes = await fetch("/api/invigilators");
      const list = await listRes.json();
      setInvigilators(list || []);

      let user = (typeof window !== 'undefined' && window.api && window.api.getAuthUser) ? window.api.getAuthUser() : null;
      // try your local api.getAuthUser helper if exported
      try {
        const { getAuthUser } = require('../services/api');
        const uu = getAuthUser();
        if (uu) { user = uu; }
      } catch (e) { /* ignore require in browser build */ }

      if (user && user.role === 'invigilator') {
        // try to match by id or name
        const match = list.find(i => String(i.id) === String(user.id) || (i.name && i.name.toLowerCase() === (user.name || '').toLowerCase()));
        if (match) {
          setInvigilatorId(String(match.id));
          await loadDuties(String(match.id));
          return;
        }
      }

      // fallback: preselect first invigilator (existing behaviour)
      if (list && list.length > 0) {
        setInvigilatorId(String(list[0].id));
        loadDuties(String(list[0].id));
      }
    } catch (err) {
      console.error('loadInvigilators error', err);
      setError(String(err));
    } finally {
      setLoadingInvs(false);
    }
  }
  init();
}, []);


  async function loadDuties(id) {
    if (!id) {
      setDuties([]);
      return;
    }
    setLoadingDuties(true);
    setError("");
    setDuties([]);
    try {
      const payload = await api.getInvigilatorDuties(id);
      setDuties(payload.duties || []);
    } catch (err) {
      console.error("loadDuties error", err);
      setError(String(err));
    } finally {
      setLoadingDuties(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      
      {/* Header with role + logout */}
<div className="flex items-center justify-between mb-4">
  <div>
    <h1 className="text-xl font-semibold text-sky-800">Invigilator Duty Dashboard</h1>
    <div className="text-xs text-slate-500">
      Signed in as: <span className="font-medium">{ (api.getAuthUser && api.getAuthUser()?.name) || (api.getAuthUser && api.getAuthUser()?.role) || 'invigilator' }</span>
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


      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex-1">
          <label className="block text-sm text-slate-600 mb-1">Select Invigilator</label>
          <div className="relative">
            <select
              value={invigilatorId}
              onChange={(e) => {
                setInvigilatorId(e.target.value);
                loadDuties(e.target.value);
              }}
              className="w-full border rounded p-2 bg-white"
            >
              <option value="">-- pick invigilator --</option>
              {invigilators.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.name ? `${inv.name} (${inv.id})` : `${inv.id}`}
                </option>
              ))}
            </select>
            {loadingInvs && (
              <div className="absolute right-2 top-2 text-xs text-slate-500">loading…</div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-2 bg-sky-600 text-white rounded"
            onClick={() => loadDuties(invigilatorId)}
            disabled={!invigilatorId || loadingDuties}
          >
            Refresh Duties
          </button>
          <button
            className="px-3 py-2 border rounded"
            onClick={() => {
              setInvigilatorId("");
              setDuties([]);
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border text-red-700 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loadingDuties && <div className="text-sm text-slate-500 mb-4">Loading duties…</div>}

      {!loadingDuties && duties.length === 0 && invigilatorId && (
        <div className="p-3 bg-yellow-50 rounded mb-4">No duties found for this invigilator.</div>
      )}

      {duties.length > 0 && (
        <div className="border rounded bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Assigned Duties</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border px-3 py-2">Exam</th>
                  <th className="border px-3 py-2">Date</th>
                  <th className="border px-3 py-2">Time Slot</th>
                  <th className="border px-3 py-2">Room</th>
                  <th className="border px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {duties.map((d, i) => (
                  <tr key={d.assign_id || i} className="hover:bg-slate-50">
                    <td className="border px-3 py-2">{d.exam_id || "-"}</td>
                    <td className="border px-3 py-2">{d.date || "-"}</td>
                    <td className="border px-3 py-2">{d.time_slot || "-"}</td>
                    <td className="border px-3 py-2">{d.room_name || d.room_id || "-"}</td>
                    <td className="border px-3 py-2">{d.special_instructions || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

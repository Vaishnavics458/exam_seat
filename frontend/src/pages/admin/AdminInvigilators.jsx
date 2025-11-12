import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import InvigilatorForm from './InvigilatorForm';

export default function AdminInvigilators() {
  const [loading, setLoading] = useState(false);
  const [invigilators, setInvigilators] = useState([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setError('');
    setLoading(true);
    try {
      const res = await api.getAdminInvigilators();
      setInvigilators(res || []);
    } catch (err) {
      console.error('load invigilators', err);
      setError(err && (err.message || (err.payload && err.payload.error)) || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditItem(null);
    setShowForm(true);
  }
  function openEdit(item) {
    setEditItem(item);
    setShowForm(true);
  }
  function closeForm() {
    setEditItem(null);
    setShowForm(false);
  }

  async function handleSave(payload) {
    // payload contains invigilator fields
    try {
      if (payload.id) {
        setBusyId(payload.id);
        await api.updateAdminInvigilator(payload.id, payload);
      } else {
        setBusyId('new');
        await api.createAdminInvigilator(payload);
      }
      await load();
      closeForm();
    } catch (err) {
      console.error('save invig', err);
      alert('Save failed: ' + (err && (err.message || JSON.stringify(err))));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this invigilator? This cannot be undone.')) return;
    try {
      setBusyId(id);
      await api.deleteAdminInvigilator(id);
      await load();
    } catch (err) {
      console.error('delete invig', err);
      alert('Delete failed: ' + (err && (err.message || JSON.stringify(err))));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = invigilators.filter(inv => {
    if (!query) return true;
    const q = query.toLowerCase();
    return String(inv.name || '').toLowerCase().includes(q) ||
           String(inv.invigilator_id || '').toLowerCase().includes(q) ||
           String(inv.courses || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Invigilators</h2>
          <div className="text-sm text-slate-500">View, add, edit or delete invigilators</div>
        </div>
        <div className="flex items-center gap-3">
          <input
            placeholder="Search by name / id / course"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="px-3 py-2 border rounded w-64"
          />
          <button className="px-4 py-2 rounded bg-sky-600 text-white" onClick={openAdd}>Add Invigilator</button>
        </div>
      </div>

      <div className="bg-white rounded shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Courses / Dept</th>
              <th className="p-3 text-left">Load</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-4 text-center text-slate-500">Loading…</td></tr>
            ) : (filtered.length === 0 ? (
              <tr><td colSpan="6" className="p-4 text-center text-slate-500">No invigilators found</td></tr>
            ) : filtered.map(inv => (
              <tr key={inv.id} className="border-t">
                <td className="p-3">{inv.invigilator_id || inv.id}</td>
                <td className="p-3">{inv.name}</td>
                <td className="p-3">{inv.courses || '—'}</td>
                <td className="p-3">{inv.load_score ?? '—'}</td>
                <td className="p-3">{inv.created_at ? new Date(inv.created_at).toLocaleString() : '—'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 rounded border text-sm" onClick={()=>openEdit(inv)}>Edit</button>
                    <button
                      className="px-2 py-1 rounded bg-rose-600 text-white text-sm"
                      onClick={()=>handleDelete(inv.id)}
                      disabled={busyId === inv.id}
                    >
                      {busyId === inv.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <InvigilatorForm
          initial={editItem}
          onCancel={closeForm}
          onSave={handleSave}
          saving={busyId === 'new' || !!busyId}
        />
      )}

      {error && <div className="mt-4 text-rose-700">{error}</div>}
    </div>
  );
}

// frontend/src/pages/admin/AdminRooms.jsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import RoomForm from './RoomForm';
import { useNavigate } from 'react-router-dom';

export default function AdminRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    try {
      const res = await api.getAdminRooms();
      // back-end returns array
      setRooms(res || []);
    } catch (err) {
      console.error('load rooms', err);
      alert('Failed to load rooms: ' + (err && (err.message || JSON.stringify(err))));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditItem(null);
    setShowForm(true);
  }
  function openEdit(room) {
    setEditItem(room);
    setShowForm(true);
  }
  function closeForm() {
    setEditItem(null);
    setShowForm(false);
  }

  async function handleSave(payload) {
    try {
      if (payload.id) {
        setBusyId(payload.id);
        await api.updateAdminRoom(payload.id, payload);
      } else {
        setBusyId('new');
        await api.createAdminRoom(payload);
      }
      await load();
      closeForm();
    } catch (err) {
      console.error('save room', err);
      alert('Save failed: ' + (err && (err.message || JSON.stringify(err))));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this room?')) return;
    try {
      setBusyId(id);
      await api.deleteAdminRoom(id);
      await load();
    } catch (err) {
      console.error('delete room', err);
      alert('Delete failed: ' + (err && (err.message || JSON.stringify(err))));
    } finally {
      setBusyId(null);
    }
  }

  function openFull(room) {
    // route to admin exam preview optionally with room focus
    // We'll navigate to /admin/preview which you already added and AdminExamPreview supports modal opening
    navigate('/admin/preview'); // admin preview has full-room modal button already
    // note: if you want to auto-open the modal you can extend preview to accept query params, but let's keep simple
  }

  const filtered = rooms.filter(r => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (r.room_name || '').toLowerCase().includes(q) ||
           String(r.floor || '').toLowerCase().includes(q) ||
           String(r.total_capacity || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Rooms</h2>
          <div className="text-sm text-slate-500">Manage rooms (capacity, layout, rows/columns)</div>
        </div>
        <div className="flex items-center gap-3">
          <input className="px-3 py-2 border rounded w-64" placeholder="Search name / floor / capacity" value={query} onChange={e=>setQuery(e.target.value)} />
          <button className="px-4 py-2 rounded bg-sky-600 text-white" onClick={openAdd}>Add Room</button>
        </div>
      </div>

      <div className="bg-white rounded shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Floor</th>
              <th className="p-3 text-left">Capacity</th>
              <th className="p-3 text-left">Bench cap</th>
              <th className="p-3 text-left">Rows × Cols</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-4 text-center text-slate-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" className="p-4 text-center text-slate-500">No rooms found</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.room_name}</td>
                <td className="p-3">{r.floor ?? '—'}</td>
                <td className="p-3">{r.total_capacity ?? '—'}</td>
                <td className="p-3">{r.bench_capacity ?? '—'}</td>
                <td className="p-3">{(r.rows ?? '—')} × {(r.columns ?? '—')}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 rounded border text-sm" onClick={()=>openEdit(r)}>Edit</button>
                    <button className="px-2 py-1 rounded bg-rose-600 text-white text-sm" onClick={()=>handleDelete(r.id)} disabled={busyId===r.id}>{busyId===r.id ? 'Deleting…' : 'Delete'}</button>
                    <button className="px-2 py-1 rounded bg-sky-600 text-white text-sm" onClick={()=>openFull(r)}>Open Full Room</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <RoomForm initial={editItem} onCancel={closeForm} onSave={handleSave} saving={!!busyId} />
      )}
    </div>
  );
}

// frontend/src/pages/admin/RoomForm.jsx
import React, { useEffect, useState } from 'react';

export default function RoomForm({ initial = null, onCancel, onSave, saving = false }) {
  const [roomName, setRoomName] = useState('');
  const [floor, setFloor] = useState('');
  const [totalCapacity, setTotalCapacity] = useState('');
  const [benchCapacity, setBenchCapacity] = useState('');
  const [rows, setRows] = useState('');
  const [columns, setColumns] = useState('');
  const [layout, setLayout] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setRoomName(initial.room_name || '');
      setFloor(initial.floor ?? '');
      setTotalCapacity(initial.total_capacity ?? '');
      setBenchCapacity(initial.bench_capacity ?? '');
      setRows(initial.rows ?? '');
      setColumns(initial.columns ?? '');
      setLayout(initial.layout ? JSON.stringify(initial.layout) : (initial.layout || ''));
    } else {
      setRoomName(''); setFloor(''); setTotalCapacity(''); setBenchCapacity(''); setRows(''); setColumns(''); setLayout('');
    }
  }, [initial]);

  function validate() {
    if (!roomName || !roomName.trim()) { setError('Room name required'); return false; }
    if (rows && isNaN(Number(rows))) { setError('Rows must be a number'); return false; }
    if (columns && isNaN(Number(columns))) { setError('Columns must be a number'); return false; }
    if (totalCapacity && isNaN(Number(totalCapacity))) { setError('Total capacity must be numeric'); return false; }
    return true;
  }

  function handleSubmit(e) {
    e && e.preventDefault();
    setError('');
    if (!validate()) return;
    let parsedLayout = null;
    try {
      parsedLayout = layout ? (typeof layout === 'string' ? JSON.parse(layout) : layout) : null;
    } catch (err) {
      // If user did plain text, we just send string
      parsedLayout = layout;
    }
    const payload = {
      id: initial && initial.id ? initial.id : undefined,
      room_name: roomName.trim(),
      floor: floor ? floor : null,
      total_capacity: totalCapacity ? Number(totalCapacity) : null,
      bench_capacity: benchCapacity ? Number(benchCapacity) : null,
      rows: rows ? Number(rows) : null,
      columns: columns ? Number(columns) : null,
      layout: parsedLayout || null
    };
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form className="bg-white rounded-md p-6 w-full max-w-lg" onSubmit={handleSubmit}>
        <h3 className="text-lg font-semibold mb-3">{initial ? 'Edit Room' : 'Add Room'}</h3>

        <label className="text-sm text-slate-600">Room name *</label>
        <input className="w-full p-2 border rounded mb-3" value={roomName} onChange={e=>setRoomName(e.target.value)} required />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-600">Floor</label>
            <input className="w-full p-2 border rounded mb-3" value={floor} onChange={e=>setFloor(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Total capacity</label>
            <input className="w-full p-2 border rounded mb-3" value={totalCapacity} onChange={e=>setTotalCapacity(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-slate-600">Bench capacity</label>
            <input className="w-full p-2 border rounded mb-3" value={benchCapacity} onChange={e=>setBenchCapacity(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Rows</label>
            <input className="w-full p-2 border rounded mb-3" value={rows} onChange={e=>setRows(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-slate-600">Columns</label>
            <input className="w-full p-2 border rounded mb-3" value={columns} onChange={e=>setColumns(e.target.value)} />
          </div>
        </div>

        <label className="text-sm text-slate-600">Layout (optional JSON or text)</label>
        <textarea rows={3} className="w-full p-2 border rounded mb-3" value={layout} onChange={e=>setLayout(e.target.value)} />

        {error && <div className="mb-3 text-rose-600">{error}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" className="px-3 py-1 rounded border" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="px-4 py-1 rounded bg-sky-600 text-white" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

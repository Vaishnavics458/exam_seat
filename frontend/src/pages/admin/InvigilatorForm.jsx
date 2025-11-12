import React, { useState, useEffect } from 'react';

export default function InvigilatorForm({ initial = null, onCancel, onSave, saving = false }) {
  const [invigilatorId, setInvigilatorId] = useState('');
  const [name, setName] = useState('');
  const [courses, setCourses] = useState('');
  const [availability, setAvailability] = useState('');
  const [loadScore, setLoadScore] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setInvigilatorId(initial.invigilator_id || '');
      setName(initial.name || '');
      setCourses(initial.courses || '');
      setAvailability(initial.availability || '');
      setLoadScore(initial.load_score ?? 0);
    } else {
      setInvigilatorId('');
      setName('');
      setCourses('');
      setAvailability('');
      setLoadScore(0);
    }
  }, [initial]);

  function validate() {
    if (!name || !name.trim()) {
      setError('Name is required');
      return false;
    }
    return true;
  }

  function handleSubmit(e) {
    e && e.preventDefault();
    setError('');
    if (!validate()) return;
    const payload = {
      id: initial && initial.id ? initial.id : undefined,
      invigilator_id: invigilatorId || undefined,
      name: name.trim(),
      courses: courses.trim() || undefined,
      availability: availability.trim() || undefined,
      load_score: loadScore ? Number(loadScore) : 0
    };
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form className="bg-white rounded-md p-6 w-full max-w-md" onSubmit={handleSubmit}>
        <h3 className="text-lg font-semibold mb-3">{initial ? 'Edit Invigilator' : 'Add Invigilator'}</h3>

        <label className="text-sm text-slate-600">Invigilator ID (optional)</label>
        <input className="w-full p-2 border rounded mb-3" value={invigilatorId} onChange={e=>setInvigilatorId(e.target.value)} />

        <label className="text-sm text-slate-600">Name *</label>
        <input className="w-full p-2 border rounded mb-3" value={name} onChange={e=>setName(e.target.value)} required />

        <label className="text-sm text-slate-600">Courses / Dept</label>
        <input className="w-full p-2 border rounded mb-3" value={courses} onChange={e=>setCourses(e.target.value)} placeholder="e.g. MA106, CS" />

        <label className="text-sm text-slate-600">Availability (notes)</label>
        <input className="w-full p-2 border rounded mb-3" value={availability} onChange={e=>setAvailability(e.target.value)} />

        <label className="text-sm text-slate-600">Load score</label>
        <input type="number" className="w-full p-2 border rounded mb-4" value={loadScore} onChange={e=>setLoadScore(e.target.value)} />

        {error && <div className="mb-3 text-rose-600">{error}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" className="px-3 py-1 rounded border" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="submit" className="px-4 py-1 rounded bg-sky-600 text-white" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

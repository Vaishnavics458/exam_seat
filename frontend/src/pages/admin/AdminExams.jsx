// frontend/src/pages/admin/AdminExams.jsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyMap, setBusyMap] = useState({}); // per-exam action busy flags
  const [error, setError] = useState(null);

  // modal state: add / edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null => add, object => edit
  const [form, setForm] = useState({
    exam_id: '',
    date: '',
    time_slot: '',
    course_codes: '',
    total_students: ''
  });

  // load exams
  async function loadExams() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminExams(); // expects array of {id, exam_id, date, time_slot, ...}
      setExams(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('loadExams error', err);
      setError(err && (err.message || (err.payload && err.payload.error)) || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadExams(); }, []);

  // open add modal
  function openAdd() {
    setEditing(null);
    setForm({ exam_id: '', date: '', time_slot: '', course_codes: '', total_students: '' });
    setModalOpen(true);
  }

  // open edit modal
  function openEdit(exam) {
    setEditing(exam);
    setForm({
      exam_id: exam.exam_id || '',
      date: exam.date ? exam.date.split('T')[0] : (exam.date || ''), // normalize ISO
      time_slot: exam.time_slot || '',
      course_codes: exam.course_codes || '',
      total_students: exam.total_students ? String(exam.total_students) : ''
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm({ exam_id: '', date: '', time_slot: '', course_codes: '', total_students: '' });
  }

  async function saveExam() {
    // basic validation
    if (!form.exam_id || !form.date) {
      alert('exam_id and date are required');
      return;
    }
    try {
      if (editing) {
        // update by DB id
        await api.put(`/admin/exams/${editing.id}`, {
          exam_id: form.exam_id.trim(),
          date: form.date || null,
          time_slot: form.time_slot || null,
          course_codes: form.course_codes || null,
          total_students: form.total_students ? Number(form.total_students) : null
        });
        alert('Exam updated');
      } else {
        await api.post('/admin/exams', {
          exam_id: form.exam_id.trim(),
          date: form.date || null,
          time_slot: form.time_slot || null,
          course_codes: form.course_codes || null,
          total_students: form.total_students ? Number(form.total_students) : null
        });
        alert('Exam created');
      }
      closeModal();
      await loadExams();
    } catch (err) {
      console.error('saveExam error', err);
      alert('Save failed: ' + (err && (err.message || (err.payload && err.payload.error)) || String(err)));
    }
  }

  async function doDelete(exam) {
    if (!confirm(`Delete exam ${exam.exam_id}? This cannot be undone.`)) return;
    try {
      await api.del(`/admin/exams/${exam.id}`);
      alert('Deleted');
      await loadExams();
    } catch (err) {
      console.error('delete error', err);
      alert('Delete failed: ' + (err && (err.message || (err.payload && err.payload.error)) || String(err)));
    }
  }

  // regenerate seating or invigilation (calls existing endpoints)
    // regenerate seating or invigilation (calls existing endpoints)
  async function regen(exam, type) {
    const key = `${type}_${exam.exam_id}`;
    setBusyMap(m => ({ ...m, [key]: true }));
    try {
      if (type === 'seating') {
        await api.generateSeating(exam.exam_id);
        alert(`Seating regenerated for ${exam.exam_id}`);
        // Add this line:
        localStorage.setItem('lastRegeneratedExamId', exam.exam_id);
      } else {
        await api.generateInvigilation(exam.exam_id);
        alert(`Invigilation regenerated for ${exam.exam_id}`);
      }

      // refresh local list of exams
      try {
        await loadExams();
      } catch (errLoad) {
        console.warn('loadExams after regen failed', errLoad);
      }

      // dispatch global event so other pages (preview) reload their data
      try {
        if (typeof window !== 'undefined') {
          const detail = { examId: exam.exam_id, type };
          window.dispatchEvent(new CustomEvent('exam:regenerated', { detail }));
          console.log('Dispatched exam:regenerated', detail);
        }
      } catch (errEv) {
        console.warn('dispatch exam:regenerated failed', errEv);
      }

    } catch (err) {
      console.error('regen error', err);
      alert(`${type} regeneration failed: ` + (err && (err.message || (err.payload && err.payload.error)) || String(err)));
    } finally {
      setBusyMap(m => ({ ...m, [key]: false }));
    }
  }


  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-sky-800">Admin — Exams</h1>
            <p className="text-sm text-slate-600">Create, edit or remove exams. Regenerate seating / invigilation from here.</p>
          </div>
          <div>
            <button onClick={openAdd} className="px-3 py-2 rounded bg-sky-600 text-white">Add Exam</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">{loading ? 'Loading exams…' : `Found ${exams.length} exams`}</div>
          <div className="flex items-center gap-3">
            <button onClick={loadExams} className="px-3 py-1 rounded border">Refresh</button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 border rounded">{String(error)}</div>}

        <div className="bg-white rounded shadow-sm overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">DB id</th>
                <th className="p-3 text-left">Exam ID</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Time Slot</th>
                <th className="p-3 text-left">Course Codes</th>
                <th className="p-3 text-left">Students</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(ex => (
                <tr key={ex.id} className="border-t">
                  <td className="p-3">{ex.id}</td>
                  <td className="p-3 font-medium">{ex.exam_id}</td>
                  <td className="p-3">{ex.date ? (ex.date.split ? ex.date.split('T')[0] : ex.date) : '-'}</td>
                  <td className="p-3">{ex.time_slot || '-'}</td>
                  <td className="p-3">{ex.course_codes || '-'}</td>
                  <td className="p-3">{ex.total_students || '-'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(ex)} className="px-2 py-1 rounded border text-xs">Edit</button>
                      <button onClick={() => doDelete(ex)} className="px-2 py-1 rounded border text-xs text-rose-600">Delete</button>

                      <button
                        onClick={() => regen(ex, 'seating')}
                        className="px-2 py-1 rounded bg-sky-600 text-white text-xs"
                        disabled={!!busyMap[`seating_${ex.exam_id}`]}
                      >
                        {busyMap[`seating_${ex.exam_id}`] ? 'Seating…' : 'Regenerate Seating'}
                      </button>

                      <button
                        onClick={() => regen(ex, 'invigilation')}
                        className="px-2 py-1 rounded bg-amber-600 text-white text-xs"
                        disabled={!!busyMap[`invigilation_${ex.exam_id}`]}
                      >
                        {busyMap[`invigilation_${ex.exam_id}`] ? 'Invig…' : 'Regenerate Invig'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {exams.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">No exams found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-md w-full max-w-xl p-5">
            <h3 className="text-lg font-semibold mb-3">{editing ? 'Edit Exam' : 'Add Exam'}</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600">Exam ID (unique)</label>
                <input value={form.exam_id} onChange={e => setForm(f => ({ ...f, exam_id: e.target.value }))} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Time slot</label>
                <input value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-xs text-slate-600">Total students</label>
                <input type="number" value={form.total_students} onChange={e => setForm(f => ({ ...f, total_students: e.target.value }))} className="w-full p-2 border rounded" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-600">Course codes (comma separated)</label>
                <input value={form.course_codes} onChange={e => setForm(f => ({ ...f, course_codes: e.target.value }))} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 rounded border" onClick={closeModal}>Cancel</button>
              <button className="px-3 py-2 rounded bg-sky-600 text-white" onClick={saveExam}>{editing ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

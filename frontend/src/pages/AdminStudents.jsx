// frontend/src/pages/AdminStudents.jsx
import React, { useEffect, useState } from 'react';
import {
  getAdminStudents,
  createAdminStudent,
  updateAdminStudent,
  deleteAdminStudent,
  downloadSeatingPdf
} from '../services/api';
import CSVUploader from '../components/CSVUploader';

function StudentRow({ s, onEdit, onDelete }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="border px-3 py-2 text-sm">{s.id}</td>
      <td className="border px-3 py-2 text-sm">{s.student_id || '-'}</td>
      <td className="border px-3 py-2 text-sm">{s.roll_number || '-'}</td>
      <td className="border px-3 py-2 text-sm">{s.name || '-'}</td>
      <td className="border px-3 py-2 text-sm">{s.course_code || '-'}</td>
      <td className="border px-3 py-2 text-sm">{s.branch || '-'}</td>
      <td className="border px-3 py-2 text-sm">{s.semester || '-'}</td>
      <td className="border px-3 py-2 text-right">
        <div className="flex gap-2 justify-end">
          <button className="px-2 py-1 text-xs border rounded" onClick={() => onEdit(s)}>Edit</button>
          <button className="px-2 py-1 text-xs bg-rose-600 text-white rounded" onClick={() => onDelete(s)}>Delete</button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ student_id: '', roll_number: '', name: '', course_code: '', branch: '', semester: '' });
  const [modalBusy, setModalBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const list = await getAdminStudents();
      setStudents(list || []);
    } catch (err) {
      console.error('load students', err);
      setError(err && (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing({ _new: true });
    setForm({ student_id: '', roll_number: '', name: '', course_code: '', branch: '', semester: '' });
  }

  function openEdit(student) {
    setEditing(student);
    setForm({
      student_id: student.student_id || '',
      roll_number: student.roll_number || '',
      name: student.name || '',
      course_code: student.course_code || '',
      branch: student.branch || '',
      semester: student.semester || ''
    });
  }

  function closeModal() {
    setEditing(null);
    setForm({ student_id: '', roll_number: '', name: '', course_code: '', branch: '', semester: '' });
  }

  async function submitForm(e) {
    e?.preventDefault();
    setModalBusy(true);
    try {
      if (editing && editing._new) {
        await createAdminStudent(form);
      } else if (editing && editing.id) {
        await updateAdminStudent(editing.id, form);
      }
      await load();
      closeModal();
    } catch (err) {
      console.error('save error', err);
      setError(err && (err.message || String(err)));
    } finally {
      setModalBusy(false);
    }
  }

  async function handleDelete(student) {
    if (!confirm(`Delete student ${student.name || student.roll_number || student.id}? This cannot be undone.`)) return;
    try {
      await deleteAdminStudent(student.id);
      await load();
    } catch (err) {
      console.error('delete failed', err);
      setError(err && (err.message || String(err)));
    }
  }

  async function onCsvDone() {
    await load();
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-sky-800">Admin — Students</h1>
          <p className="text-sm text-slate-600">List, add, edit, delete students. Bulk upload CSV below.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-3 py-2 bg-sky-600 text-white rounded" onClick={openNew}>Add student</button>
          <button className="px-3 py-2 border rounded" onClick={load}>Refresh</button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 border rounded">{error}</div>}

      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border px-3 py-2">#</th>
              <th className="border px-3 py-2">Student ID</th>
              <th className="border px-3 py-2">Roll</th>
              <th className="border px-3 py-2">Name</th>
              <th className="border px-3 py-2">Course</th>
              <th className="border px-3 py-2">Branch</th>
              <th className="border px-3 py-2">Sem</th>
              <th className="border px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="p-4 text-slate-500">Loading…</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan="8" className="p-4 text-slate-500">No students found</td></tr>
            ) : students.map(s => (
              <StudentRow key={s.id} s={s} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Bulk CSV Upload</h3>
          <CSVUploader onDone={onCsvDone} />
        </div>

        <div>
          <h3 className="font-semibold mb-2">Quick actions</h3>
          <div className="bg-white p-3 border rounded space-y-2">
            <p className="text-sm text-slate-600">Download seating PDF for an exam room:</p>
            <DownloadPdfBox />
          </div>
        </div>
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-md w-full max-w-xl p-4">
            <h3 className="font-semibold mb-2">{editing._new ? 'Add student' : `Edit student ${editing.name || editing.id}`}</h3>
            <form onSubmit={submitForm} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600">Student ID</label>
                <input className="w-full border rounded p-2" value={form.student_id} onChange={e=>setForm({...form, student_id: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-slate-600">Roll number</label>
                <input className="w-full border rounded p-2" value={form.roll_number} onChange={e=>setForm({...form, roll_number: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-600">Name</label>
                <input className="w-full border rounded p-2" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-slate-600">Course code</label>
                <input className="w-full border rounded p-2" value={form.course_code} onChange={e=>setForm({...form, course_code: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-slate-600">Branch</label>
                <input className="w-full border rounded p-2" value={form.branch} onChange={e=>setForm({...form, branch: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-slate-600">Semester</label>
                <input className="w-full border rounded p-2" value={form.semester} onChange={e=>setForm({...form, semester: e.target.value})} />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" className="px-3 py-1 border rounded" onClick={closeModal} disabled={modalBusy}>Cancel</button>
                <button type="submit" className="px-3 py-1 bg-sky-600 text-white rounded" disabled={modalBusy}>{modalBusy ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// DownloadPdfBox component (inside same file)
function DownloadPdfBox() {
  const [examId, setExamId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function doDownload() {
    if (!examId || !roomId) return setMsg({ type: 'error', text: 'Exam ID and Room ID required' });
    setMsg(null);
    setBusy(true);
    try {
      const blob = await downloadSeatingPdf(examId, roomId);
      const filename = `seating_${examId}_room_${roomId}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg({ type: 'success', text: 'Downloaded' });
    } catch (err) {
      console.error('download pdf', err);
      setMsg({ type: 'error', text: err && (err.message || String(err)) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input className="border rounded p-2" placeholder="Exam ID (e.g. E001_10AM)" value={examId} onChange={e=>setExamId(e.target.value)} />
        <input className="border rounded p-2" placeholder="Room ID (numeric)" value={roomId} onChange={e=>setRoomId(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={doDownload} disabled={busy}>{busy ? 'Downloading…' : 'Download PDF'}</button>
      </div>
      {msg && <div className={`mt-3 p-2 rounded ${msg.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-green-50 text-green-700'}`}>{msg.text}</div>}
    </div>
  );
}

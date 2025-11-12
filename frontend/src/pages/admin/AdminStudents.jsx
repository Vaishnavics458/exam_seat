// frontend/src/pages/admin/AdminStudents.jsx
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

function StudentForm({ initial = {}, onCancel, onSave }) {
  const [form, setForm] = useState({
    student_id: initial.student_id || '',
    roll_number: initial.roll_number || '',
    name: initial.name || '',
    course_code: initial.course_code || '',
    branch: initial.branch || '',
    semester: initial.semester || ''
  });

  useEffect(()=> setForm({
    student_id: initial.student_id || '',
    roll_number: initial.roll_number || '',
    name: initial.name || '',
    course_code: initial.course_code || '',
    branch: initial.branch || '',
    semester: initial.semester || ''
  }), [initial]);

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input value={form.student_id} onChange={e=>setForm({...form, student_id:e.target.value})} placeholder="Student ID" className="p-2 border rounded" />
        <input value={form.roll_number} onChange={e=>setForm({...form, roll_number:e.target.value})} placeholder="Roll number" className="p-2 border rounded" />
        <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Name" className="p-2 border rounded" />
        <input value={form.course_code} onChange={e=>setForm({...form, course_code:e.target.value})} placeholder="Course code" className="p-2 border rounded" />
        <input value={form.branch} onChange={e=>setForm({...form, branch:e.target.value})} placeholder="Branch" className="p-2 border rounded" />
        <input value={form.semester} onChange={e=>setForm({...form, semester:e.target.value})} placeholder="Semester" className="p-2 border rounded" />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button className="px-3 py-1 border rounded" onClick={onCancel}>Cancel</button>
        <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={()=>onSave(form)}>Save</button>
      </div>
    </div>
  );
}

export default function AdminStudents(){
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await api.getAdminStudents();
      setStudents(res || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, []);

  async function handleCreate(body) {
    try {
      await api.createAdminStudent(body);
      setShowForm(false);
      load();
    } catch (err) {
      alert('Create failed: ' + (err.message || err));
    }
  }

  async function handleUpdate(body) {
    try {
      await api.updateAdminStudent(editing.id, body);
      setEditing(null);
      setShowForm(false);
      load();
    } catch (err) {
      alert('Update failed: ' + (err.message || err));
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this student?')) return;
    try {
      await api.deleteAdminStudent(id);
      load();
    } catch (err) {
      alert('Delete failed: ' + (err.message || err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Students</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded" onClick={()=>{ setEditing(null); setShowForm(true); }}>Add student</button>
          <button className="px-3 py-1 border rounded" onClick={load}>Refresh</button>
        </div>
      </div>

      {error && <div className="mb-4 p-2 bg-rose-50 text-rose-700 rounded">{error}</div>}
      {loading ? <div>Loading…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border px-3 py-2">Student ID</th>
                <th className="border px-3 py-2">Roll</th>
                <th className="border px-3 py-2">Name</th>
                <th className="border px-3 py-2">Course</th>
                <th className="border px-3 py-2">Branch</th>
                <th className="border px-3 py-2">Semester</th>
                <th className="border px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="border px-3 py-2">{s.student_id}</td>
                  <td className="border px-3 py-2">{s.roll_number}</td>
                  <td className="border px-3 py-2">{s.name}</td>
                  <td className="border px-3 py-2">{s.course_code}</td>
                  <td className="border px-3 py-2">{s.branch}</td>
                  <td className="border px-3 py-2">{s.semester}</td>
                  <td className="border px-3 py-2">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 border rounded text-xs" onClick={()=>{ setEditing(s); setShowForm(true); }}>Edit</button>
                      <button className="px-2 py-1 border rounded text-xs" onClick={()=>handleDelete(s.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal (simple) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded w-full max-w-2xl p-4">
            <h3 className="font-semibold mb-2">{editing ? 'Edit student' : 'Add student'}</h3>
            <StudentForm initial={editing || {}} onCancel={()=>{ setShowForm(false); setEditing(null); }} onSave={(b)=>{ editing ? handleUpdate(b) : handleCreate(b); }} />
          </div>
        </div>
      )}
    </div>
  );
}

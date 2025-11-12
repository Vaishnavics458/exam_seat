import React, { useEffect, useState, useRef } from 'react';
import {
  getAdminStudents,
  createAdminStudent,
  updateAdminStudent,
  deleteAdminStudent,
  bulkUploadStudents
} from '../services/api';
import api from '../services/api';
import { saveAs } from 'file-saver'; // optional if you want to save files (not required here)

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // add/edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBusy, setModalBusy] = useState(false);
  const [editing, setEditing] = useState(null); // null => add, otherwise student object
  const [form, setForm] = useState({
    student_id: '',
    roll_number: '',
    name: '',
    course: '',
    branch: '',
    semester: ''
  });

  // Bulk upload state
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState(null);
  const fileInputRef = useRef(null);

  async function loadStudents() {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminStudents();
      // res expected to be an array of students
      setStudents(Array.isArray(res) ? res : (res.rows || []));
    } catch (err) {
      console.error('loadStudents error', err);
      setError(err && (err.message || (err.payload && err.payload.error)) || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line
  }, []);

  function openAddModal() {
    setEditing(null);
    setForm({ student_id: '', roll_number: '', name: '', course: '', branch: '', semester: '' });
    setModalOpen(true);
  }

  function openEditModal(student) {
    setEditing(student);
    setForm({
      student_id: student.student_id || student.id || '',
      roll_number: student.roll_number || '',
      name: student.name || '',
      course: student.course || '',
      branch: student.branch || '',
      semester: student.semester || ''
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (modalBusy) return;
    setModalOpen(false);
    setEditing(null);
    setForm({ student_id: '', roll_number: '', name: '', course: '', branch: '', semester: '' });
  }

  async function submitForm(e) {
    e && e.preventDefault();
    setModalBusy(true);
    try {
      if (editing) {
        // update
        await updateAdminStudent(editing.id || editing.student_id, {
          student_id: form.student_id,
          roll_number: form.roll_number,
          name: form.name,
          course: form.course,
          branch: form.branch,
          semester: form.semester
        });
      } else {
        // create
        await createAdminStudent({
          student_id: form.student_id,
          roll_number: form.roll_number,
          name: form.name,
          course: form.course,
          branch: form.branch,
          semester: form.semester
        });
      }
      await loadStudents();
      closeModal();
    } catch (err) {
      console.error('save student failed', err);
      alert('Save failed: ' + (err && (err.message || JSON.stringify(err))));
    } finally {
      setModalBusy(false);
    }
  }

  async function handleDelete(student) {
    if (!window.confirm(`Delete student ${student.name || student.roll_number}?`)) return;
    try {
      await deleteAdminStudent(student.id || student.student_id);
      await loadStudents();
    } catch (err) {
      console.error('delete failed', err);
      alert('Delete failed: ' + (err && (err.message || JSON.stringify(err))));
    }
  }

  // Bulk upload helpers
  function onBulkFileChange(e) {
    const f = e && e.target && e.target.files && e.target.files[0];
    setBulkFile(f || null);
    setBulkMessage(null);
  }

  async function uploadBulkFile() {
    if (!bulkFile) {
      setBulkMessage({ type: 'error', text: 'Choose a CSV/Excel file first' });
      return;
    }
    setBulkBusy(true);
    setBulkMessage(null);
    try {
      const res = await bulkUploadStudents(bulkFile);
      // res expected e.g. { status:'ok', imported: N, errors: [...] } or message
      const text = (res && (res.message || (res.imported ? `${res.imported} imported` : JSON.stringify(res)))) || 'Upload succeeded';
      setBulkMessage({ type: 'success', text });
      // refresh students list
      await loadStudents();
      // clear file input visually
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setBulkFile(null);
    } catch (err) {
      console.error('bulk upload failed', err);
      const msg = err && (err.payload && err.payload.error) ? err.payload.error : (err.message || String(err));
      setBulkMessage({ type: 'error', text: `Upload failed: ${msg}` });
    } finally {
      setBulkBusy(false);
    }
  }

  function clearBulkSelection() {
    setBulkFile(null);
    setBulkMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <header className="max-w-6xl mx-auto mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-sky-800">Admin — Control Panel</h1>
          <p className="text-sm text-slate-600">Manage students, invigilators, rooms & exams</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">Signed in as: admin</div>
          <button className="px-3 py-1 border rounded" onClick={loadStudents}>Refresh</button>
          <button className="px-3 py-1 rounded bg-sky-600 text-white" onClick={openAddModal}>Add student</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-4 gap-6">
        <nav className="col-span-1 bg-white p-4 rounded-md shadow-sm">
          <ul className="space-y-2 text-sm">
            <li className="font-medium">Students</li>
            <li className="text-slate-600">Invigilators</li>
            <li className="text-slate-600">Rooms</li>
            <li className="text-slate-600">Exams</li>
          </ul>
        </nav>

        <section className="col-span-3">
          <div className="bg-white rounded-md shadow-sm p-4">
            <h2 className="text-lg font-semibold mb-3">Students</h2>

            {error && <div className="mb-3 p-2 bg-rose-50 text-rose-700 rounded">{error}</div>}

            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-3 text-left">#</th>
                    <th className="p-3 text-left">Student ID</th>
                    <th className="p-3 text-left">Roll</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Course</th>
                    <th className="p-3 text-left">Branch</th>
                    <th className="p-3 text-left">Semester</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="8" className="p-8 text-center text-slate-500">Loading…</td></tr>
                  ) : (students && students.length > 0) ? (
                    students.map((s, idx) => (
                      <tr key={s.id || s.student_id} className="border-t">
                        <td className="p-3">{idx + 1}</td>
                        <td className="p-3">{s.student_id || s.id}</td>
                        <td className="p-3">{s.roll_number}</td>
                        <td className="p-3">{s.name}</td>
                        <td className="p-3">{s.course}</td>
                        <td className="p-3">{s.branch}</td>
                        <td className="p-3">{s.semester}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button className="px-2 py-1 border rounded text-xs" onClick={() => openEditModal(s)}>Edit</button>
                            <button className="px-2 py-1 border rounded text-xs" onClick={() => handleDelete(s)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="8" className="p-8 text-center text-slate-500">No students found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bulk CSV Upload UI */}
            <div className="mt-6 bg-slate-50 rounded p-4 border">
              <h3 className="font-semibold mb-2">Bulk CSV Upload</h3>
              <p className="text-sm text-slate-500 mb-3">Expected CSV columns (case-insensitive): Student_ID, Roll_Number, Name, Course_Code, Branch, Semester</p>

              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={onBulkFileChange}
                  className="block"
                />
                <button
                  className="px-3 py-2 bg-sky-600 text-white rounded"
                  onClick={uploadBulkFile}
                  disabled={bulkBusy}
                >
                  {bulkBusy ? 'Uploading…' : 'Upload CSV'}
                </button>

                <button className="px-3 py-2 border rounded" onClick={clearBulkSelection} disabled={bulkBusy}>
                  Clear
                </button>

                {bulkFile && <div className="text-sm text-slate-600 ml-3">Selected: <span className="font-medium">{bulkFile.name}</span></div>}
              </div>

              {bulkMessage && (
                <div className={`mt-3 p-2 rounded ${bulkMessage.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-green-50 text-green-700'}`}>
                  {bulkMessage.text}
                </div>
              )}
            </div>

          </div>
        </section>
      </main>

      {/* Add/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-md p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold mb-3">{editing ? 'Edit student' : 'Add student'}</h3>
            <form onSubmit={submitForm}>
              <label className="text-xs text-slate-600">Student ID</label>
              <input className="w-full p-2 border rounded mb-2" value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})} />

              <label className="text-xs text-slate-600">Roll number</label>
              <input className="w-full p-2 border rounded mb-2" value={form.roll_number} onChange={e => setForm({...form, roll_number: e.target.value})} />

              <label className="text-xs text-slate-600">Name</label>
              <input className="w-full p-2 border rounded mb-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />

              <label className="text-xs text-slate-600">Course</label>
              <input className="w-full p-2 border rounded mb-2" value={form.course} onChange={e => setForm({...form, course: e.target.value})} />

              <label className="text-xs text-slate-600">Branch</label>
              <input className="w-full p-2 border rounded mb-2" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} />

              <label className="text-xs text-slate-600">Semester</label>
              <input className="w-full p-2 border rounded mb-4" value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} />

              <div className="flex justify-end gap-2">
                <button type="button" className="px-3 py-2 border rounded" onClick={closeModal} disabled={modalBusy}>Cancel</button>
                <button type="submit" className="px-3 py-2 rounded bg-sky-600 text-white" disabled={modalBusy}>
                  {modalBusy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// frontend/src/components/CSVUploader.jsx
import React, { useState } from 'react';
import { bulkUploadStudents } from '../services/api';

export default function CSVUploader({ onDone }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg(null);
    if (!file) return setMsg({ type: 'error', text: 'Choose a CSV file first' });
    setBusy(true);
    try {
      const res = await bulkUploadStudents(file);
      //setMsg({ type: 'success', text: `Uploaded — inserted: ${res.inserted_count ?? res.inserted || 'unknown'}` });
      setMsg({ type: 'success', text: `Uploaded — inserted: ${res.inserted_count || res.inserted_count === 0 ? res.inserted_count : 'unknown'}` });  
      if (typeof onDone === 'function') onDone(res);
    } catch (err) {
      setMsg({ type: 'error', text: err && (err.message || JSON.stringify(err)) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white p-4 border rounded">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-start gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files && e.target.files[0])}
          className="block"
          disabled={busy}
        />
        <div className="flex items-center gap-2">
          <button type="submit" className="px-3 py-1 bg-sky-600 text-white rounded" disabled={busy}>
            {busy ? 'Uploading…' : 'Upload CSV'}
          </button>
          <button type="button" className="px-3 py-1 border rounded" onClick={() => { setFile(null); setMsg(null); if (typeof onDone === 'function') onDone(null); }} disabled={busy}>
            Clear
          </button>
        </div>
      </form>

      {msg && (
        <div className={`mt-3 p-2 rounded ${msg.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-green-50 text-green-700'}`}>
          {msg.text}
        </div>
      )}

      <div className="mt-2 text-xs text-slate-500">
        Expected CSV columns (case-insensitive): <code>Student_ID, Roll_Number, Name, Course_Code, Branch, Semester</code>.
      </div>
    </div>
  );
}

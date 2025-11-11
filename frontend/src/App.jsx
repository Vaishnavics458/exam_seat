import React, { useState } from "react";
import StudentDashboard from "./pages/StudentDashboard";
import AdminExamPreview from "./pages/AdminExamPreview";
import InvigilatorDashboard from "./pages/InvigilatorDashboard";

export default function App(){
  const [mode, setMode] = useState('student'); // 'student' | 'admin' | 'invigilator'
  const [adminExamToLoad, setAdminExamToLoad] = useState(null);

  function openAdminPreview(examId) {
    setAdminExamToLoad(examId);
    setMode('admin');
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-sky-800">ExamSeat Pro</h1>
          <p className="text-sm text-slate-600">Student lookup & admin preview</p>
        </div>
        <div className="space-x-2">
          <button className={`px-3 py-2 rounded ${mode==='student'? 'bg-sky-600 text-white': 'bg-white border'}`} onClick={()=>setMode('student')}>Student</button>
          <button className={`px-3 py-2 rounded ${mode==='admin'? 'bg-sky-600 text-white': 'bg-white border'}`} onClick={()=>setMode('admin')}>Admin Preview</button>
          <button className={`px-3 py-2 rounded ${mode==='invigilator'? 'bg-sky-600 text-white': 'bg-white border'}`} onClick={()=>setMode('invigilator')}>Invigilator</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {mode === 'student' && <StudentDashboard />}
        {mode === 'admin' && <AdminExamPreview key={adminExamToLoad || 'default'} />}
        {mode === 'invigilator' && <InvigilatorDashboard onOpenAdminPreview={openAdminPreview} />}
      </main>
    </div>
  )
}

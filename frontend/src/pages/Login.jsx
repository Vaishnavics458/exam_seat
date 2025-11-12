// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('student'); // default student as you asked
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roll, setRoll] = useState('');
  const [invName, setInvName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e && e.preventDefault();
    setError('');
    setBusy(true);

    try {
      let body;
      if (role === 'admin') {
        body = { role: 'admin', email: email.trim(), password };
      } else if (role === 'student') {
        body = { role: 'student', roll_number: roll.trim() };
      } else {
        // invigilator
        body = { role: 'invigilator', name: invName.trim() };
      }

      const res = await api.login(body);
      // res expected { token, user? }
      if (res && res.token) {
        // optionally obtain user object from API (getMe) - but api.login may return user
        let user = res.user || null;
        try {
          if (!user && api.getMe) {
            const me = await api.getMe().catch(()=>null);
            if (me) user = me.user || me;
          }
        } catch (err) { /* ignore */ }

        api.setAuthToken && api.setAuthToken(res.token, user);

        // redirect by role
        const target = (user && user.role) ? user.role : role;
        if (target === 'admin') navigate('/admin', { replace: true });
        else if (target === 'invigilator') navigate('/invigilator', { replace: true });
        else navigate('/student', { replace: true });
      } else {
        setError('Login failed: unexpected response');
      }
    } catch (err) {
      setError(err && (err.error || err.message || JSON.stringify(err)) || 'Login error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-6 rounded shadow-md border">
        <h2 className="text-2xl font-semibold text-sky-800 mb-2">Sign in</h2>
        <p className="text-sm text-slate-500 mb-4">Choose role and provide credentials</p>

        <div className="mb-4">
          <label className="text-xs text-slate-500">Role</label>
          <div className="mt-1 flex gap-2">
            <button
              className={`flex-1 py-2 rounded ${role==='student' ? 'bg-sky-600 text-white' : 'bg-white border'}`}
              onClick={()=>setRole('student')}
            >Student</button>
            <button
              className={`flex-1 py-2 rounded ${role==='invigilator' ? 'bg-sky-600 text-white' : 'bg-white border'}`}
              onClick={()=>setRole('invigilator')}
            >Invigilator</button>
            <button
              className={`flex-1 py-2 rounded ${role==='admin' ? 'bg-sky-600 text-white' : 'bg-white border'}`}
              onClick={()=>setRole('admin')}
            >Admin</button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {role === 'admin' && (
            <>
              <label className="block text-sm text-slate-600">Email</label>
              <input className="w-full p-2 border rounded mb-2" value={email} onChange={e=>setEmail(e.target.value)} />

              <label className="block text-sm text-slate-600">Password</label>
              <input type="password" className="w-full p-2 border rounded mb-4" value={password} onChange={e=>setPassword(e.target.value)} />
            </>
          )}

          {role === 'student' && (
            <>
              <label className="block text-sm text-slate-600">Roll Number</label>
              <input className="w-full p-2 border rounded mb-4" value={roll} onChange={e=>setRoll(e.target.value)} placeholder="e.g. 1BI22IS001" />
            </>
          )}

          {role === 'invigilator' && (
            <>
              <label className="block text-sm text-slate-600">Name or ID</label>
              <input className="w-full p-2 border rounded mb-4" value={invName} onChange={e=>setInvName(e.target.value)} placeholder="e.g. Arjun Sharma" />
            </>
          )}

          {error && <div className="mb-3 p-2 bg-rose-50 text-rose-700 rounded text-sm">{String(error)}</div>}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-sky-600 text-white"
              disabled={busy}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>

            <button
              type="button"
              className="px-3 py-2 rounded border text-sm"
              onClick={() => {
                setEmail(''); setPassword(''); setRoll(''); setInvName(''); setError('');
              }}
            >
              Clear
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-slate-500">
          Tip: Student login only requires roll number. Invigilator uses name/ID. Admin uses email/password.
        </div>
      </div>
    </div>
  );
}

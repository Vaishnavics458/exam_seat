// frontend/src/services/api.js
// Fetch wrapper + convenience endpoint helpers with JWT support.

const API_PREFIX = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_PREFIX)
  ? import.meta.env.VITE_API_PREFIX
  : '/api';

const TOKEN_KEY = 'examseat_token';
const USER_KEY = 'examseat_user';

// --- Auth helpers ---
export function setAuthToken(token, user = null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);

  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);

  // also expose on window for dev convenience
  if (typeof window !== 'undefined') {
    window.__examseat_token = token || null;
    window.__examseat_user = user || null;
  }
}

export function getAuthToken() {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) return t;
    if (typeof window !== 'undefined') return window.__examseat_token || null;
    return null;
  } catch (e) {
    return (typeof window !== 'undefined' && window.__examseat_token) || null;
  }
}

export function getAuthUser() {
  try {
    const raw = localStorage.getItem(USER_KEY) || (typeof window !== 'undefined' && window.__examseat_user);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return null;
  }
}

function buildUrl(path) {
  if (!path) throw new Error('Missing path for API call');
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return (path.startsWith('/')) ? `${API_PREFIX}${path}` : `${API_PREFIX}/${path}`;
}

async function handleResponse(res) {
  const txt = await res.text();
  try {
    const json = txt ? JSON.parse(txt) : null;
    if (!res.ok) {
      const err = new Error(json && (json.error || json.message) ? (json.error || json.message) : res.statusText);
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  } catch (e) {
    // non-JSON response
    if (!res.ok) {
      const err = new Error(txt || res.statusText);
      err.status = res.status;
      throw err;
    }
    return txt;
  }
}

function defaultHeaders(opts = {}) {
  const headers = Object.assign({ 'Accept': 'application/json' }, opts.headers || {});
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/* Generic wrappers */
export async function get(path, opts = {}) {
  const url = buildUrl(path);
  const res = await fetch(url, {
    method: 'GET',
    credentials: opts.credentials || 'same-origin',
    headers: Object.assign(defaultHeaders(opts), opts.headers || {}),
  });
  return handleResponse(res);
}

export async function post(path, body = {}, opts = {}) {
  const url = buildUrl(path);
  const headers = Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json' }, defaultHeaders(opts));
  const res = await fetch(url, {
    method: 'POST',
    credentials: opts.credentials || 'same-origin',
    headers,
    body: (headers['Content-Type'] && headers['Content-Type'].includes('application/json')) ? JSON.stringify(body) : body,
  });
  return handleResponse(res);
}

export async function put(path, body = {}, opts = {}) {
  const url = buildUrl(path);
  const headers = Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json' }, defaultHeaders(opts));
  const res = await fetch(url, {
    method: 'PUT',
    credentials: opts.credentials || 'same-origin',
    headers,
    body: (headers['Content-Type'] && headers['Content-Type'].includes('application/json')) ? JSON.stringify(body) : body,
  });
  return handleResponse(res);
}

export async function del(path, opts = {}) {
  const url = buildUrl(path);
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: opts.credentials || 'same-origin',
    headers: Object.assign(defaultHeaders(opts), opts.headers || {})
  });
  return handleResponse(res);
}

/* Convenience endpoint helpers used by the UI components */
// Students
export const getStudentSeating = (rollNumber) => get(`/students/${encodeURIComponent(rollNumber)}/seating`);

// Exams / preview
export const getExamPreview = (examId) => get(`/exams/${encodeURIComponent(examId)}/preview`);
export const getExams = () => get('/exams');

// Rooms
export const getRooms = () => get('/rooms');

// Invigilators and duties
export const getInvigilators = () => get('/invigilators');
export const getInvigilatorDuties = (invId) => get(`/invigilators/${encodeURIComponent(invId)}/duties`);

// Invigilation overview for an exam
export const getInvigilation = (examId) => get(`/exams/${encodeURIComponent(examId)}/invigilation`);

// Generate endpoints
export const generateInvigilation = (examId) => post(`/exams/${encodeURIComponent(examId)}/generate-invigilation`);
export const generateSeating = (examId) => post(`/exams/${encodeURIComponent(examId)}/generate-seating`);

// Auth
export const login = (body) => post('/auth/login', body);
export const getMe = () => get('/auth/me');

// Assign / reassign room (admin)
export const assignRoom = (examId, body) => post(`/exams/${encodeURIComponent(examId)}/assign-room`, body);
export const assignRoomSmart = (examId, body) => post(`/exams/${encodeURIComponent(examId)}/assign-room-smart`, body);

// Delete assignment by assignment id
export const deleteAssignment = (assignmentId) => del(`/assignments/${encodeURIComponent(assignmentId)}`);

/* --- Admin CRUD helpers --- */

// Students admin
export const getAdminStudents = () => get('/admin/students');
export const createAdminStudent = (body) => post('/admin/students', body);
export const updateAdminStudent = (id, body) => put(`/admin/students/${encodeURIComponent(id)}`, body);
export const deleteAdminStudent = (id) => del(`/admin/students/${encodeURIComponent(id)}`);

// Invigilators admin
export const getAdminInvigilators = () => get('/admin/invigilators');
export const createAdminInvigilator = (body) => post('/admin/invigilators', body);
export const updateAdminInvigilator = (id, body) => put(`/admin/invigilators/${encodeURIComponent(id)}`, body);
export const deleteAdminInvigilator = (id) => del(`/admin/invigilators/${encodeURIComponent(id)}`);

// Rooms / exams admin (examples)
export const getAdminRooms = () => get('/admin/rooms/list');
export const createAdminRoom = (body) => post('/admin/rooms', body);
export const updateAdminRoom = (id, body) => put(`/admin/rooms/${encodeURIComponent(id)}`, body);
export const deleteAdminRoom = (id) => del(`/admin/rooms/${encodeURIComponent(id)}`);
export const getAdminExams = () => get('/admin/exams');

/* Bulk upload (students) */
// file: HTML File object from <input type="file">
export async function bulkUploadStudents(file) {
  const url = buildUrl('/admin/students/bulk-upload');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      // do NOT set Content-Type for multipart; browser will set boundary
      'Accept': 'application/json',
      ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
    },
    body: form
  });
  return handleResponse(res);
}

/* Seating PDF download helper */
export async function downloadSeatingPdf(examId, roomId) {
  const path = `/admin/exams/${encodeURIComponent(examId)}/rooms/${encodeURIComponent(roomId)}/seating-pdf`;
  const url = buildUrl(path);
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    headers: Object.assign({ 'Accept': 'application/pdf' }, getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  const blob = await res.blob();
  return blob; // caller: createObjectURL + link download
}

/* default export (object) */
const exported = {
  // low level
  get, post, put, del,
  // auth helpers
  login, getMe, setAuthToken, getAuthToken, getAuthUser,
  // convenience endpoints
  getStudentSeating, getExamPreview, getExams, getRooms,
  getInvigilators, getInvigilatorDuties, getInvigilation,
  generateInvigilation, generateSeating, assignRoom, assignRoomSmart, deleteAssignment,
  // admin
  getAdminStudents, createAdminStudent, updateAdminStudent, deleteAdminStudent,
  getAdminInvigilators, createAdminInvigilator, updateAdminInvigilator, deleteAdminInvigilator,
  getAdminRooms, createAdminRoom, updateAdminRoom, deleteAdminRoom, getAdminExams, bulkUploadStudents, downloadSeatingPdf
};

export default exported;

// expose helpers to the browser console in dev for quick debugging
if (typeof window !== 'undefined' && import.meta.env && import.meta.env.DEV) {
  window.api = exported;
  window.setAuthToken = setAuthToken;
  window.getAuthToken = getAuthToken;
  window.getAuthUser = getAuthUser;
}

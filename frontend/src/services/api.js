// frontend/src/services/api.js
// Fetch wrapper + convenience endpoint helpers used across the frontend.

const API_PREFIX = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_PREFIX)
  ? import.meta.env.VITE_API_PREFIX
  : '/api';

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
      const err = new Error(json && json.error ? json.error : json && json.message ? json.message : res.statusText);
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

/* Generic wrappers */
export async function get(path, opts = {}) {
  const url = buildUrl(path);
  const res = await fetch(url, {
    method: 'GET',
    credentials: opts.credentials || 'same-origin',
    headers: { 'Accept': 'application/json', ...(opts.headers || {}) },
  });
  return handleResponse(res);
}

export async function post(path, body = {}, opts = {}) {
  const url = buildUrl(path);
  const headers = Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json' }, opts.headers || {});
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
  const headers = Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json' }, opts.headers || {});
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
    headers: Object.assign({ 'Accept': 'application/json' }, opts.headers || {})
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

// Assign / reassign room (admin)
// body should be { room_id: <id>, invigilator_id: <id> }
export const assignRoom = (examId, body) => post(`/exams/${encodeURIComponent(examId)}/assign-room`, body);

// Smart assign/reassign endpoint (if you created it)
export const assignRoomSmart = (examId, body) => post(`/exams/${encodeURIComponent(examId)}/assign-room-smart`, body);

// Delete assignment by assignment id
export const deleteAssignment = (assignmentId) => del(`/assignments/${encodeURIComponent(assignmentId)}`);

/* default export (object) to satisfy import api from '../services/api' */
export default {
  get, post, put, del,
  getStudentSeating, getExamPreview, getExams, getRooms,
  getInvigilators, getInvigilatorDuties, getInvigilation,
  generateInvigilation, generateSeating, assignRoom, assignRoomSmart, deleteAssignment
};
// --- paste at the very end of frontend/src/services/api.js ---

// expose helpers to the browser console in dev for quick debugging
if (typeof window !== 'undefined' && import.meta.env && import.meta.env.DEV) {
  // default export object created earlier is `default`
  // if not, create an object with named functions
  window.api = {
    get, post, put, del,
    getStudentSeating, getExamPreview, getExams, getRooms,
    getInvigilators, getInvigilatorDuties, getInvigilation,
    generateInvigilation, generateSeating, assignRoom, assignRoomSmart, deleteAssignment
  };

  // also expose top-level names for convenience
  window.getExamPreview = getExamPreview;
  window.getStudentSeating = getStudentSeating;
  window.getInvigators = getInvigilators; // small typo-safe alias (optional)
  window.getInvigilators = getInvigilators;
}

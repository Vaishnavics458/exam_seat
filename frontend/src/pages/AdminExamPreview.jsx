import React, { useEffect, useState } from "react";

/**
 * AdminExamPreview.jsx (with Reassign feature)
 * - Renders exam preview + invigilation list (as before)
 * - Adds "Reassign" button for each invigilator to move them to a different room
 * - Calls API: prefer api.assignRoomSmart, fallback to api.assignRoom or POST /api/exams/:examId/assign-room
 */

// import api helper (fallback to window.api)
let api;
try {
  api = require("../services/api").default || require("../services/api");
} catch (e) {
  api = window.api || null;
}

export default function AdminExamPreview({ examId = "E001_10AM" }) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [invigilation, setInvigilation] = useState(null);
  const [error, setError] = useState(null);

  // modal state for reassign
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ invigilator: null, fromRoomId: null });
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  async function loadData() {
    setError(null);
    setLoading(true);
    try {
      const apihost = api || window.api;
      if (!apihost) throw new Error("API helper not available (check src/services/api.js or window.api)");

      const pPromise = (apihost.getExamPreview || apihost.getExamPreview).call(apihost, examId);
      const iPromise = (apihost.getInvigilation || apihost.getInvigilation).call(apihost, examId);

      const [pRes, iRes] = await Promise.allSettled([pPromise, iPromise]);

      if (pRes.status === "rejected") throw new Error("Preview fetch failed: " + (pRes.reason && pRes.reason.message));
      if (iRes.status === "rejected") {
        console.warn("Invigilation fetch failed:", iRes.reason);
        setInvigilation(null);
      } else setInvigilation(iRes.value);

      setPreview(pRes.value);
    } catch (err) {
      console.error("loadPreview error", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); /* eslint-disable-line */ }, [examId]);

  // find list of rooms for modal dropdown (from preview)
  function getAllRooms() {
    if (!preview || !preview.rooms) return [];
    return preview.rooms.map(r => ({ id: r.room_id, name: r.room_name }));
  }

  // open modal for reassign
  function openReassignModal(invigilator, fromRoomId) {
    setModalData({ invigilator, fromRoomId });
    setSelectedRoomId(null);
    setModalMessage(null);
    setModalOpen(true);
  }

  // close modal
  function closeModal() {
    if (modalBusy) return;
    setModalOpen(false);
    setModalData({ invigilator: null, fromRoomId: null });
    setSelectedRoomId(null);
    setModalMessage(null);
  }

  // perform reassign API call
  async function doReassign() {
    if (!modalData.invigilator || !selectedRoomId) {
      setModalMessage({ type: "error", text: "Choose a target room" });
      return;
    }
    setModalBusy(true);
    setModalMessage(null);

    const apihost = api || window.api;
    try {
      // prefer assignRoomSmart(examId, { room_id, invigilator_id })
      if (typeof apihost.assignRoomSmart === "function") {
        const res = await apihost.assignRoomSmart(examId, { room_id: selectedRoomId, invigilator_id: modalData.invigilator.invigilator_id });
        // expected success shape: { status: 'ok' } or inserted assignment
        if (res && (res.status === "ok" || res.success)) {
          setModalMessage({ type: "success", text: "Reassigned successfully" });
          await loadData();
          setTimeout(closeModal, 500);
        } else {
          throw new Error(JSON.stringify(res || "unknown response"));
        }
      } else if (typeof apihost.assignRoom === "function") {
        const res = await apihost.assignRoom(examId, { room_id: selectedRoomId, invigilator_id: modalData.invigilator.invigilator_id });
        if (res && (res.status === "ok" || res.success)) {
          setModalMessage({ type: "success", text: "Reassigned successfully" });
          await loadData();
          setTimeout(closeModal, 500);
        } else throw new Error(JSON.stringify(res || "unknown response"));
      } else if (typeof apihost.post === "function") {
        // fallback to generic post wrapper: api.post('/exams/:examId/assign-room', body)
        // some projects implement post(basePath, body)
        try {
          const path = `/exams/${encodeURIComponent(examId)}/assign-room`;
          const res = await apihost.post(path, { room_id: selectedRoomId, invigilator_id: modalData.invigilator.invigilator_id });
          if (res && (res.status === "ok" || res.success)) {
            setModalMessage({ type: "success", text: "Reassigned successfully" });
            await loadData();
            setTimeout(closeModal, 500);
          } else throw new Error(JSON.stringify(res || "unknown response"));
        } catch (err) {
          // try direct fetch as last resort
          const r = await fetch(`/api/exams/${encodeURIComponent(examId)}/assign-room`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id: selectedRoomId, invigilator_id: modalData.invigilator.invigilator_id })
          });
          const jr = await r.json();
          if (r.ok && (jr.status === "ok" || jr.success)) {
            setModalMessage({ type: "success", text: "Reassigned successfully" });
            await loadData();
            setTimeout(closeModal, 500);
          } else throw new Error(JSON.stringify(jr || r.statusText));
        }
      } else {
        throw new Error("No assign API found (implement assignRoomSmart / assignRoom / post)");
      }
    } catch (err) {
      console.error("Reassign error", err);
      setModalMessage({ type: "error", text: err && (err.message || JSON.stringify(err)) });
    } finally {
      setModalBusy(false);
    }
  }

  // small helper to render a single room's seat grid
  function RoomGrid({ room }) {
    const rows = room.rows || 6;
    const cols = room.cols || 5;
    const seatMap = {};
    (room.seats || []).forEach(s => { seatMap[`${s.row}-${s.col}`] = s; });

    return (
      <div className="bg-white rounded-md shadow-sm p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-800">Room {room.room_name || room.room_id}</h3>
          <div className="text-sm text-slate-500">{rows} × {cols}</div>
        </div>

        <div className="overflow-auto">
          <div className="grid gap-1"
               style={{ gridTemplateColumns: `repeat(${cols}, minmax(48px, 1fr))` }}>
            {
              Array.from({ length: rows }).flatMap((_, rIdx) =>
                Array.from({ length: cols }).map((__, cIdx) => {
                  const r = rIdx + 1, c = cIdx + 1;
                  const key = `${r}-${c}`;
                  const seat = seatMap[key];
                  const student = seat && seat.student;
                  return (
                    <div key={key} className="border border-slate-200 rounded-sm p-1 text-xs min-h-[48px] flex items-center justify-center bg-slate-50">
                      {student ? (
                        <div className="text-center">
                          <div className="font-medium text-[11px]">{student.roll_number || student.name}</div>
                          <div className="text-[10px] text-slate-500">{seat ? seat.seat_id : `r${r}c${c}`}</div>
                        </div>
                      ) : (
                        <div className="text-slate-400 text-[11px]">{seat ? seat.seat_id : `r${r}c${c}`}</div>
                      )}
                    </div>
                  )
                })
              )
            }
          </div>
        </div>
      </div>
    );
  }

  // invigilators list with Reassign button
  function InvigList({ room }) {
    const rooms = invigilation && invigilation.rooms ? invigilation.rooms : [];
    const found = rooms.find(r => String(r.room_id) === String(room.room_id));
    const invs = (found && found.invigilators) || [];

    return (
      <div>
        {invs.length === 0 ? (
          <div className="text-sm text-slate-500">No invigilator assigned</div>
        ) : (
          <ul className="space-y-2">
            {invs.map(inv => (
              <li key={inv.invigilator_id} className="p-2 bg-slate-50 rounded-md border flex items-start justify-between">
                <div>
                  <div className="font-medium text-sm">{inv.name}</div>
                  <div className="text-xs text-slate-500">{inv.course || inv.info || '—'}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    className="px-2 py-1 rounded bg-orange-500 text-white text-xs"
                    onClick={() => openReassignModal(inv, room.room_id)}
                  >
                    Reassign
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <header className="max-w-6xl mx-auto mb-6">
        <h1 className="text-2xl font-semibold text-sky-800">Admin — Exam Preview</h1>
        <p className="text-sm text-slate-600">Exam: <span className="font-medium">{examId}</span></p>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={loadData} className="px-3 py-1 rounded bg-sky-600 text-white">Refresh</button>
          <div className="text-sm text-slate-500">{loading ? 'Loading...' : (error ? `Error: ${error}` : 'Loaded')}</div>
        </div>

        {error && <div className="mb-4 p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded">{error}</div>}

        {!preview && !loading ? (
          <div className="text-slate-500">No preview data</div>
        ) : null}

        {preview && (
          <div className="grid grid-cols-1 gap-6">
            {preview.rooms.map(room => (
              <div key={room.room_id} className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <RoomGrid room={room} />
                </div>
                <aside className="col-span-1">
                  <div className="bg-white rounded-md shadow-sm p-3">
                    <h4 className="font-semibold mb-2">Invigilators</h4>
                    <InvigList room={room} />
                  </div>
                </aside>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reassign Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-md p-4 w-full max-w-md">
            <h3 className="font-semibold mb-2">Reassign Invigilator</h3>
            <div className="mb-2 text-sm text-slate-600">
              <div><strong>Name:</strong> {modalData.invigilator?.name}</div>
              <div><strong>From room:</strong> {modalData.fromRoomId}</div>
            </div>

            <label className="block text-sm mb-1">Target room</label>
            <select
              className="w-full mb-3 p-2 border rounded"
              value={selectedRoomId || ""}
              onChange={e => setSelectedRoomId(Number(e.target.value) || null)}
            >
              <option value="">-- choose room --</option>
              {getAllRooms()
                .filter(r => String(r.id) !== String(modalData.fromRoomId)) // don't show current
                .map(r => <option key={r.id} value={r.id}>{r.name || r.id}</option>)}
            </select>

            {modalMessage && (
              <div className={`mb-3 p-2 rounded ${modalMessage.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-green-50 text-green-700'}`}>
                {modalMessage.text}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={closeModal} disabled={modalBusy}>Cancel</button>
              <button className="px-3 py-1 rounded bg-orange-600 text-white" onClick={doReassign} disabled={modalBusy || !selectedRoomId}>
                {modalBusy ? "Working..." : "Confirm Reassign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

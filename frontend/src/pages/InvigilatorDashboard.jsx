import React, { useEffect, useState } from "react";

/**
 * InvigilatorDashboard with dropdown selector populated from /api/invigilators
 * - Automatically loads duties when an invigilator is selected
 * - Shows name + id in the select for easy identification
 */
export default function InvigilatorDashboard() {
  const [invigilators, setInvigilators] = useState([]);
  const [invigilatorId, setInvigilatorId] = useState("");
  const [duties, setDuties] = useState([]);
  const [loadingInvs, setLoadingInvs] = useState(false);
  const [loadingDuties, setLoadingDuties] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInvigilators();
  }, []);

  async function loadInvigilators() {
    setLoadingInvs(true);
    setError("");
    try {
      const res = await fetch("/api/invigilators");
      if (!res.ok) throw new Error(`Failed to load invigilators (${res.status})`);
      const list = await res.json();
      setInvigilators(list || []);
      // optionally pre-select first invigilator for convenience
      if (list && list.length > 0) {
        setInvigilatorId(String(list[0].id));
        // auto-load duties for the first item
        loadDuties(String(list[0].id));
      }
    } catch (err) {
      console.error("loadInvigilators error", err);
      setError(String(err));
    } finally {
      setLoadingInvs(false);
    }
  }

  async function loadDuties(id) {
    if (!id) {
      setDuties([]);
      return;
    }
    setLoadingDuties(true);
    setError("");
    setDuties([]);
    try {
      const res = await fetch(`/api/invigilators/${encodeURIComponent(id)}/duties`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Failed to load duties (${res.status}) - ${txt}`);
      }
      const payload = await res.json();
      setDuties(payload.duties || []);
    } catch (err) {
      console.error("loadDuties error", err);
      setError(String(err));
    } finally {
      setLoadingDuties(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-sky-800 mb-4">
        Invigilator Duty Dashboard
      </h1>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex-1">
          <label className="block text-sm text-slate-600 mb-1">Select Invigilator</label>
          <div className="relative">
            <select
              value={invigilatorId}
              onChange={(e) => {
                setInvigilatorId(e.target.value);
                loadDuties(e.target.value);
              }}
              className="w-full border rounded p-2 bg-white"
            >
              <option value="">-- pick invigilator --</option>
              {invigilators.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.name ? `${inv.name} (${inv.id})` : `${inv.id}`}
                </option>
              ))}
            </select>
            {loadingInvs && (
              <div className="absolute right-2 top-2 text-xs text-slate-500">loading…</div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="px-3 py-2 bg-sky-600 text-white rounded"
            onClick={() => loadDuties(invigilatorId)}
            disabled={!invigilatorId || loadingDuties}
          >
            Refresh Duties
          </button>
          <button
            className="px-3 py-2 border rounded"
            onClick={() => {
              setInvigilatorId("");
              setDuties([]);
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border text-red-700 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loadingDuties && <div className="text-sm text-slate-500 mb-4">Loading duties…</div>}

      {!loadingDuties && duties.length === 0 && invigilatorId && (
        <div className="p-3 bg-yellow-50 rounded mb-4">No duties found for this invigilator.</div>
      )}

      {duties.length > 0 && (
        <div className="border rounded bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Assigned Duties</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border px-3 py-2">Exam</th>
                  <th className="border px-3 py-2">Date</th>
                  <th className="border px-3 py-2">Time Slot</th>
                  <th className="border px-3 py-2">Room</th>
                  <th className="border px-3 py-2">Seat Count</th>
                  <th className="border px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {duties.map((d, i) => (
                  <tr key={d.assign_id || i} className="hover:bg-slate-50">
                    <td className="border px-3 py-2">{d.exam_id || "-"}</td>
                    <td className="border px-3 py-2">{d.date || "-"}</td>
                    <td className="border px-3 py-2">{d.time_slot || "-"}</td>
                    <td className="border px-3 py-2">{d.room_name || d.room_id || "-"}</td>
                    <td className="border px-3 py-2">{String(d.seat_count ?? "-")}</td>
                    <td className="border px-3 py-2">{d.special_instructions || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="px-3 py-2 bg-sky-600 text-white rounded"
              onClick={() => {
                // quick print summary
                const html = `
                  <h1>Invigilator Duties</h1>
                  <p>Invigilator ID: ${invigilatorId}</p>
                  <pre>${duties.map(d => `${d.exam_id} • ${d.date} • ${d.time_slot} • ${d.room_name}`).join("\n")}</pre>
                `;
                const win = window.open("", "_blank");
                win.document.write(html);
                win.print();
                win.close();
              }}
            >
              Print Summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// backend/src/routes/index.js
const express = require('express');
const router = express.Router();
const db = require('../models/db');
const invigService = require('../services/invigilation.service');
const seatingService = require('../services/seating.service');

// utils
const { detectAssignTable } = require('../utils/schema-utils');
const { parseSeatId } = require('../utils/seat-utils');

/* GET /api/exams - list exams */
router.get('/exams', async function (req, res) {
  try {
    const result = await db.query('SELECT * FROM exams ORDER BY date, id');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /exams error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/rooms - list rooms */
router.get('/rooms', async function (req, res) {
  try {
    const result = await db.query('SELECT * FROM rooms ORDER BY room_name');
    res.json(result.rows);
  } catch (err) {
    console.error('GET /rooms error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/students/:roll_number/seating
   Returns student info and seating assignments (possibly empty) */
router.get('/students/:roll_number/seating', async function (req, res) {
  const roll = req.params.roll_number;
  try {
    const q = ''
      + 'SELECT s.id AS student_pk, s.student_id, s.roll_number, s.name AS student_name, '
      + '       e.exam_id, e.date, e.time_slot, '
      + '       r.room_name, sa.seat_id '
      + 'FROM students s '
      + 'LEFT JOIN seat_assignments sa ON sa.student_id = s.id '
      + 'LEFT JOIN rooms r ON r.id = sa.room_id '
      + 'LEFT JOIN exams e ON e.id = sa.exam_id '
      + 'WHERE s.roll_number = $1 '
      + 'ORDER BY e.date NULLS LAST, e.time_slot NULLS LAST';
    const result = await db.query(q, [roll]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const studentInfo = {
      student_pk: result.rows[0].student_pk,
      student_id: result.rows[0].student_id,
      roll_number: result.rows[0].roll_number,
      name: result.rows[0].student_name
    };

    const assignments = result.rows
      .filter(function (r) { return r.exam_id; })
      .map(function (r) {
        return {
          exam_id: r.exam_id,
          date: r.date,
          time_slot: r.time_slot,
          room_name: r.room_name,
          seat_id: r.seat_id
        };
      });

    return res.json({ student: studentInfo, assignments: assignments });
  } catch (err) {
    console.error('GET /students/:roll_number/seating error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/exams/:examId/preview
   Returns rooms and seat grids for an exam
   - Expands grid if assigned seat ids indicate larger rows/cols (e.g. r9c5)
   - Falls back to near-square layout if no explicit coordinates present
   - Defensive: doesn't rely on optional DB columns like capacity/rows/cols
*/
router.get('/exams/:examId/preview', async function (req, res) {
  const examId = req.params.examId;
  try {
    // find exam primary key
    const examRow = await db.query('SELECT id, exam_id FROM exams WHERE exam_id = $1', [examId]);
    if (examRow.rowCount === 0) return res.status(404).json({ error: 'Exam not found' });
    const examPk = examRow.rows[0].id;

    // fetch rooms (only id + room_name to avoid missing-column errors)
    const roomsRes = await db.query('SELECT id, room_name FROM rooms ORDER BY room_name');
    const rooms = roomsRes.rows;

    // fetch seat assignments for this exam (room_id + seat_id + student info)
    const saRes = await db.query(
      'SELECT sa.seat_id, sa.room_id, sa.student_id, s.name AS student_name, s.roll_number '
      + 'FROM seat_assignments sa LEFT JOIN students s ON s.id = sa.student_id '
      + 'WHERE sa.exam_id = $1',
      [examPk]
    );

    // group assignments by room_id
    const assignmentsByRoom = {};
    for (let i = 0; i < saRes.rows.length; i++) {
      const row = saRes.rows[i];
      if (!assignmentsByRoom[row.room_id]) assignmentsByRoom[row.room_id] = [];
      assignmentsByRoom[row.room_id].push({
        seat_id: row.seat_id,
        student: row.student_id ? { name: row.student_name, roll_number: row.roll_number } : null
      });
    }

    // build room grids
    const roomGrids = rooms.map(function (room) {
      const assigned = assignmentsByRoom[room.id] || [];

      // First try to detect max row/col from assigned seat_ids
      let maxRow = 0;
      let maxCol = 0;
      for (let j = 0; j < assigned.length; j++) {
        const a = assigned[j];
        if (!a.seat_id) continue;
        const coords = parseSeatId(a.seat_id);
        if (coords) {
          if (coords.row > maxRow) maxRow = coords.row;
          if (coords.col > maxCol) maxCol = coords.col;
        }
      }

      // If we found numeric coords, use them as minimum grid size
      let rowsCount = 0;
      let colsCount = 0;
      if (maxRow > 0 && maxCol > 0) {
        rowsCount = maxRow;
        colsCount = maxCol;
      } else if (assigned.length > 0) {
        // No explicit coords — infer near-square layout from number of assigned seats
        const cap = Math.max(assigned.length, 30); // at least consider 30 to avoid too small grids
        rowsCount = Math.ceil(Math.sqrt(cap));
        colsCount = Math.ceil(cap / rowsCount);
      } else {
        // default safe layout (30 seats: 6 x 5)
        rowsCount = 6;
        colsCount = 5;
      }

      // In rare cases where only one dimension parsed, ensure the other dimension fits assigned seats
      if (maxRow > 0 && maxCol === 0) {
        rowsCount = Math.max(rowsCount, maxRow);
        colsCount = Math.max(colsCount, Math.ceil(Math.max(assigned.length, 30) / rowsCount));
      } else if (maxCol > 0 && maxRow === 0) {
        colsCount = Math.max(colsCount, maxCol);
        rowsCount = Math.max(rowsCount, Math.ceil(Math.max(assigned.length, 30) / colsCount));
      }

      // Create seats matrix
      const seats = [];
      for (let r = 1; r <= rowsCount; r++) {
        for (let c = 1; c <= colsCount; c++) {
          const seatId = `r${r}c${c}`;
          seats.push({ seat_id: seatId, row: r, col: c, student: null });
        }
      }

      // Overlay assignments: try exact match first, then parsed coords
      for (let j = 0; j < assigned.length; j++) {
        const a = assigned[j];
        if (!a.seat_id) continue;

        // exact case-insensitive match
        const idx = seats.findIndex(s => s.seat_id.toLowerCase() === a.seat_id.toLowerCase());
        if (idx >= 0) {
          seats[idx].student = a.student;
          continue;
        }

        // parsed coords
        const coords = parseSeatId(a.seat_id);
        if (coords) {
          const atIdx = seats.findIndex(s => s.row === coords.row && s.col === coords.col);
          if (atIdx >= 0) seats[atIdx].student = a.student;
          else {
            // parsed coords are outside current grid: expand grid minimally
            const newRows = Math.max(rowsCount, coords.row);
            const newCols = Math.max(colsCount, coords.col);
            // rebuild seats with new dimensions and reapply assignments (simple approach)
            const newSeats = [];
            for (let rr = 1; rr <= newRows; rr++) {
              for (let cc = 1; cc <= newCols; cc++) {
                newSeats.push({ seat_id: `r${rr}c${cc}`, row: rr, col: cc, student: null });
              }
            }
            // copy existing students
            for (const s of seats) {
              const pos = (s.row - 1) * newCols + (s.col - 1);
              if (pos >= 0 && pos < newSeats.length) newSeats[pos].student = s.student;
            }
            // assign this specific student
            const placeIdx = newSeats.findIndex(s => s.row === coords.row && s.col === coords.col);
            if (placeIdx >= 0) newSeats[placeIdx].student = a.student;
            // update variables to use expanded version
            rowsCount = newRows;
            colsCount = newCols;
            seats.length = 0;
            for (const ns of newSeats) seats.push(ns);
          }
        }
      }

      return {
        room_id: room.id,
        room_name: room.room_name,
        rows: rowsCount,
        cols: colsCount,
        seats
      };
    });

    return res.json({ exam_id: examId, rooms: roomGrids });
  } catch (err) {
    console.error('GET /exams/:examId/preview error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// -----------------------------
// Invigilator endpoints
// -----------------------------

// Defensive GET /api/invigilators
// returns array of { id, name, info } where info is courses/subject/department if available
router.get('/invigilators', async (req, res) => {
  try {
    const colRes = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'invigilators'
    `);
    const cols = (colRes.rows || []).map(r => r.column_name);

    const extraCandidates = ['courses', 'subject', 'department', 'course', 'subject_code', 'email', 'phone'];
    const extraCol = extraCandidates.find(c => cols.includes(c));

    // build select columns safely
    const selectCols = ['id', 'name'];
    if (extraCol) selectCols.push(extraCol);

    const q = `SELECT ${selectCols.join(', ')} FROM invigilators ORDER BY id;`;
    const result = await db.query(q);

    const out = (result.rows || []).map(r => ({
      id: r.id,
      name: r.name || null,
      info: extraCol ? (r[extraCol] || null) : null
    }));

    return res.json(out);
  } catch (err) {
    console.warn('GET /invigilators failed - returning empty list', err && err.message);
    return res.json([]);
  }
});

// GET /api/invigilators/:id/duties
router.get('/invigilators/:id/duties', async (req, res) => {
  const invId = req.params.id;
  try {
    // 1) Detect assignment table name (common variants)
    const assignTable = await detectAssignTable();

    // 2) Detect which columns exist on that table (so we won't reference missing ones)
    const colRes = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
    `, [assignTable]);
    const assignCols = (colRes.rows || []).map(r => r.column_name);

    // build the select list dynamically and safely
    const selectCols = [];
    // always include id, invigilator_id, exam_id, room_id if present
    if (assignCols.includes('id')) selectCols.push('ia.id AS assign_id');
    if (assignCols.includes('invigilator_id')) selectCols.push('ia.invigilator_id');
    if (assignCols.includes('exam_id')) selectCols.push('ia.exam_id');
    if (assignCols.includes('room_id')) selectCols.push('ia.room_id');

    // optional: special_instructions or notes
    const hasNotes = assignCols.includes('special_instructions') || assignCols.includes('notes') || assignCols.includes('instruction');
    if (hasNotes) {
      // prefer the actual column name present
      const noteCol = assignCols.includes('special_instructions') ? 'special_instructions' : (assignCols.includes('notes') ? 'notes' : 'instruction');
      selectCols.push(`ia.${noteCol} AS special_instructions`);
    }

    // If no useful columns found, return empty duties quickly
    if (selectCols.length === 0) {
      return res.json({ invigilator_id: invId, duties: [] });
    }

    // 3) Compose query (join exams + rooms for friendly output)
    const q = `
      SELECT ${selectCols.join(', ')},
             e.exam_id AS exam_code,
             e.date, e.time_slot,
             r.room_name
      FROM ${assignTable} ia
      LEFT JOIN exams e ON e.id = ia.exam_id
      LEFT JOIN rooms r ON r.id = ia.room_id
      WHERE ia.invigilator_id = $1
      ORDER BY e.date, e.time_slot, ia.id;
    `;

    const result = await db.query(q, [invId]).catch(err => {
      console.warn('invigilator duties query failed, returning empty', err && err.message);
      return { rows: [] };
    });

    // 4) Normalize output
    const duties = (result.rows || []).map(row => ({
      assign_id: row.assign_id || null,
      exam_id: row.exam_id || row.exam_code || null,
      exam_code: row.exam_code || null,
      date: row.date || null,
      time_slot: row.time_slot || null,
      room_id: row.room_id || null,
      room_name: row.room_name || null,
      special_instructions: row.special_instructions || null
    }));

    return res.json({ invigilator_id: invId, duties });
  } catch (err) {
    console.error('GET /invigilators/:id/duties error', err && err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/exams/:examId/generate-invigilation
router.post('/exams/:examId/generate-invigilation', async (req, res) => {
  const examIdParam = req.params.examId;
  try {
    const examRow = await db.query('SELECT id FROM exams WHERE exam_id = $1', [examIdParam]);
    if (examRow.rowCount === 0) {
      return res.status(404).json({ status: 'error', error: 'Exam not found' });
    }
    const examPk = examRow.rows[0].id;

    const perRoom = Number(req.query.perRoom) || 1;
    const result = await invigService.assignInvigilatorsForExam(examPk, perRoom);

    if (result.status === 'ok') return res.json(result);
    return res.status(500).json(result);
  } catch (err) {
    console.error('POST /exams/:examId/generate-invigilation error', err);
    return res.status(500).json({ status: 'error', error: String(err) });
  }
});

// GET /api/exams/:examId/invigilation
router.get('/exams/:examId/invigilation', async (req, res) => {
  const examIdParam = req.params.examId;
  try {
    const examRow = await db.query('SELECT id FROM exams WHERE exam_id = $1', [examIdParam]);
    if (examRow.rowCount === 0) return res.status(404).json({ error: 'Exam not found' });
    const examPk = examRow.rows[0].id;

    const q = `
      SELECT ia.room_id, r.room_name, ia.invigilator_id, iv.name AS inv_name, iv.courses AS course
      FROM invig_assignments ia
      LEFT JOIN rooms r ON r.id = ia.room_id
      LEFT JOIN invigilators iv ON iv.id = ia.invigilator_id
      WHERE ia.exam_id = $1
      ORDER BY r.room_name, ia.id;
    `;
    const result = await db.query(q, [examPk]);
    const rows = result.rows || [];

    const grouped = {};
    for (const row of rows) {
      const roomKey = String(row.room_id);
      if (!grouped[roomKey]) grouped[roomKey] = {
        room_id: row.room_id,
        room_name: row.room_name || `Room ${row.room_id}`,
        invigilators: []
      };
      grouped[roomKey].invigilators.push({
        invigilator_id: row.invigilator_id,
        name: row.inv_name,
        course: row.course
      });
    }

    const rooms = Object.values(grouped);
    return res.json({ exam_id: examIdParam, rooms });
  } catch (err) {
    console.error('GET /exams/:examId/invigilation error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// --- Manual assign / unassign endpoints (paste into backend/src/routes/index.js) ---

// POST /api/exams/:examId/assign-room
router.post('/exams/:examId/assign-room', async (req, res) => {
  const examIdParam = req.params.examId;
  const { room_id, invigilator_id } = req.body || {};
  if (!room_id || !invigilator_id) return res.status(400).json({ error: 'room_id and invigilator_id required' });

  try {
    // exam pk
    const examRow = await db.query('SELECT id FROM exams WHERE exam_id = $1', [examIdParam]);
    if (examRow.rowCount === 0) return res.status(404).json({ error: 'Exam not found' });
    const examPk = examRow.rows[0].id;

    // detect assign table (same helper as earlier)
    const assignTable = await detectAssignTable();

    // ensure invigilator exists
    const invRes = await db.query('SELECT id FROM invigilators WHERE id = $1', [invigilator_id]);
    if (invRes.rowCount === 0) return res.status(404).json({ error: `Invigilator id ${invigilator_id} not found` });

    // ensure room exists
    const roomRes = await db.query('SELECT id FROM rooms WHERE id = $1', [room_id]);
    if (roomRes.rowCount === 0) return res.status(404).json({ error: `Room id ${room_id} not found` });

    // optional: prevent double-booked invigilator for same exam/time
    const alreadyQ = `SELECT 1 FROM ${assignTable} ia WHERE ia.invigilator_id = $1 AND ia.exam_id = $2 LIMIT 1`;
    const already = await db.query(alreadyQ, [invigilator_id, examPk]);
    if (already.rowCount > 0) {
      return res.status(409).json({ error: 'Invigilator already assigned for this exam (conflict).' });
    }

    // insert safe (handle created_at absence)
    try {
      const insQ = `INSERT INTO ${assignTable} (exam_id, room_id, invigilator_id, created_at) VALUES ($1,$2,$3,NOW()) RETURNING id`;
      const ir = await db.query(insQ, [examPk, room_id, invigilator_id]);
      return res.json({ status: 'ok', assignment_id: ir.rows[0].id });
    } catch (insErr) {
      if (insErr.message && insErr.message.includes('created_at')) {
        const ir2 = await db.query(`INSERT INTO ${assignTable} (exam_id, room_id, invigilator_id) VALUES ($1,$2,$3) RETURNING id`, [examPk, room_id, invigilator_id]);
        return res.json({ status: 'ok', assignment_id: ir2.rows[0].id });
      }
      console.error('Manual assign insert error', insErr);
      return res.status(500).json({ error: 'Insert failed', detail: String(insErr) });
    }
  } catch (err) {
    console.error('POST /assign-room error', err && err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/exams/:examId/assign-room-smart
router.post('/exams/:examId/assign-room-smart', async (req, res) => {
  const examIdParam = req.params.examId;
  const { room_id: roomId, invigilator_id: invId } = req.body || {};

  if (!roomId || !invId) {
    return res.status(400).json({ error: 'Missing room_id or invigilator_id in request body' });
  }

  try {
    // 1) find exam PK
    const examRow = await db.query('SELECT id FROM exams WHERE exam_id = $1', [examIdParam]);
    if (examRow.rowCount === 0) return res.status(404).json({ error: 'Exam not found' });
    const examPk = examRow.rows[0].id;

    // 2) verify invigilator exists
    const invRow = await db.query('SELECT id FROM invigilators WHERE id = $1', [invId]);
    if (invRow.rowCount === 0) return res.status(404).json({ error: 'Invigilator not found' });

    // 3) verify room exists
    const roomRow = await db.query('SELECT id FROM rooms WHERE id = $1', [roomId]);
    if (roomRow.rowCount === 0) return res.status(404).json({ error: 'Room not found' });

    // 4) detect assignment table name (defensive)
    const assignTable = await detectAssignTable();

    // 5) Transaction: delete old assignment for same exam+invigilator, then insert new
    await db.query('BEGIN');

    // delete any existing assignment for this invigilator on this exam (if present)
    await db.query(`DELETE FROM ${assignTable} WHERE exam_id = $1 AND invigilator_id = $2`, [examPk, invId]);

    // insert new assignment (created_at optional)
    let insertRes;
    try {
      insertRes = await db.query(
        `INSERT INTO ${assignTable} (exam_id, room_id, invigilator_id, created_at) VALUES ($1,$2,$3,NOW()) RETURNING id`,
        [examPk, roomId, invId]
      );
    } catch (insErr) {
      // fallback if created_at not present
      if (insErr && insErr.message && insErr.message.includes('created_at')) {
        insertRes = await db.query(
          `INSERT INTO ${assignTable} (exam_id, room_id, invigilator_id) VALUES ($1,$2,$3) RETURNING id`,
          [examPk, roomId, invId]
        );
      } else {
        await db.query('ROLLBACK');
        console.error('assign-room-smart insert error', insErr);
        return res.status(500).json({ error: 'Insert failed', detail: String(insErr) });
      }
    }

    await db.query('COMMIT');

    const newId = insertRes.rows[0] && insertRes.rows[0].id;
    return res.json({ status: 'ok', assignment_id: newId, exam: examIdParam, room_id: roomId, invigilator_id: invId });
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch (_) {}
    console.error('assign-room-smart error', err && err.message);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
});

// seating route — kept as before
router.post('/exams/:examId/generate-seating', async (req, res) => {
  const examIdParam = req.params.examId;
  try {
    const examRow = await db.query('SELECT id, exam_id FROM exams WHERE exam_id = $1', [examIdParam]);
    if (examRow.rowCount === 0) {
      return res.status(404).json({ status: 'error', error: 'Exam not found' });
    }
    const examPk = examRow.rows[0].id;
    const examCode = examRow.rows[0].exam_id;

    if (!seatingService) {
      return res.status(500).json({ status: 'error', error: 'Seating service missing' });
    }

    let result;
    if (typeof seatingService.generateSeatingByExamId === 'function') {
      try {
        result = await seatingService.generateSeatingByExamId(examPk);
      } catch (errNumeric) {
        try {
          result = await seatingService.generateSeatingByExamId(examCode);
        } catch (errString) {
          console.error('Seating service failed for numeric then string:', errNumeric && errNumeric.message, '/', errString && errString.message);
          return res.status(500).json({ status: 'error', error: String(errString || errNumeric) });
        }
      }
    } else {
      return res.status(500).json({ status: 'error', error: 'Seating service function generateSeatingByExamId not found' });
    }

    if (!result) {
      return res.status(500).json({ status: 'error', error: 'Seating service returned no result' });
    }
    return res.json(result);
  } catch (err) {
    console.error('POST /exams/:examId/generate-seating error', err && (err.stack || err.message || err));
    return res.status(500).json({ status: 'error', error: String(err && (err.message || err)) });
  }
});

module.exports = router;

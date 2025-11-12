// backend/src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const db = require('../models/db');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const PDFDocument = require('pdfkit');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ------------------ Students CRUD ------------------
// GET /api/admin/students
router.get('/students', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const q = `SELECT id, student_id, roll_number, name, course_code, branch, semester, created_at FROM students ORDER BY roll_number`;
    const r = await db.query(q);
    res.json(r.rows);
  } catch (err) {
    console.error('GET /admin/students error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/students
router.post('/students', authenticate, authorizeRoles('admin'), async (req, res) => {
  const { student_id, roll_number, name, course_code, branch, semester } = req.body || {};
  if (!student_id || !roll_number || !name) return res.status(400).json({ error: 'student_id, roll_number and name required' });
  try {
    await db.query(
      `INSERT INTO students (student_id, roll_number, name, course_code, branch, semester) VALUES ($1,$2,$3,$4,$5,$6)`,
      [student_id, roll_number, name, course_code || null, branch || null, semester ? Number(semester) : null]
    );
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('POST /admin/students error', err);
    res.status(500).json({ error: 'Insert failed', detail: String(err) });
  }
});

// PUT /api/admin/students/:id
router.put('/students/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  const id = req.params.id;
  const { student_id, roll_number, name, course_code, branch, semester } = req.body || {};
  try {
    await db.query(
      `UPDATE students SET student_id=$1, roll_number=$2, name=$3, course_code=$4, branch=$5, semester=$6 WHERE id=$7`,
      [student_id, roll_number, name, course_code || null, branch || null, semester ? Number(semester) : null, id]
    );
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('PUT /admin/students/:id error', err);
    res.status(500).json({ error: 'Update failed', detail: String(err) });
  }
});

// DELETE /api/admin/students/:id
router.delete('/students/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM students WHERE id=$1', [id]);
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('DELETE /admin/students/:id error', err);
    res.status(500).json({ error: 'Delete failed', detail: String(err) });
  }
});

// ------------------ Bulk upload students CSV ------------------
// POST /api/admin/students/bulk-upload  (multipart form-data; field name: file)
router.post('/students/bulk-upload', authenticate, authorizeRoles('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file required (field name "file")' });
    const text = req.file.buffer.toString('utf8');
    const rows = parse(text, { columns: true, skip_empty_lines: true });

    // Simple normalization & dedupe using student_id or roll_number
    const normalized = [];
    for (const r of rows) {
      const student_id = (r.Student_ID || r.student_id || r.studentId || '').trim();
      const roll_number = (r.Roll_Number || r.roll_number || r.rollNumber || '').trim();
      const name = (r.Name || r.name || '').trim();
      const course_code = (r.Course_Code || r.course_code || '').trim();
      const branch = (r.Branch || r.branch || '').trim();
      const semester = r.Semester || r.semester || null;
      if (!student_id && !roll_number) continue; // skip bad rows
      normalized.push({ student_id, roll_number, name, course_code, branch, semester });
    }

    if (normalized.length === 0) return res.status(400).json({ error: 'No valid rows found' });

    // Insert in transaction; ON CONFLICT DO UPDATE for upserts using student_id if present
    await db.query('BEGIN');
    const inserted = [];
    for (const r of normalized) {
      try {
        if (r.student_id) {
          const q = `
            INSERT INTO students (student_id, roll_number, name, course_code, branch, semester, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,NOW())
            ON CONFLICT (student_id) DO UPDATE
              SET roll_number = EXCLUDED.roll_number,
                  name = EXCLUDED.name,
                  course_code = EXCLUDED.course_code,
                  branch = EXCLUDED.branch,
                  semester = EXCLUDED.semester
            RETURNING id
          `;
          const out = await db.query(q, [r.student_id, r.roll_number || null, r.name || null, r.course_code || null, r.branch || null, r.semester ? Number(r.semester) : null]);
          inserted.push(out.rows[0].id);
        } else {
          // no student_id -> insert only if roll not exists
          const out = await db.query(
            `INSERT INTO students (student_id, roll_number, name, course_code, branch, semester, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,NOW())
             RETURNING id`,
            [null, r.roll_number || null, r.name || null, r.course_code || null, r.branch || null, r.semester ? Number(r.semester) : null]
          );
          inserted.push(out.rows[0].id);
        }
      } catch (errRow) {
        // log and continue
        console.warn('bulk row insert failed', errRow && errRow.message);
      }
    }
    await db.query('COMMIT');
    res.json({ status: 'ok', inserted_count: inserted.length });
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch (_) {}
    console.error('students bulk-upload error', err);
    res.status(500).json({ error: 'Bulk upload failed', detail: String(err) });
  }
});

// ------------------ Invigilators CRUD ------------------
router.get('/invigilators', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await db.query('SELECT id, invigilator_id, name, courses, availability, load_score, created_at FROM invigilators ORDER BY id');
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/invigilators', authenticate, authorizeRoles('admin'), async (req, res) => {
  const { invigilator_id, name, courses, availability, load_score } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    await db.query('INSERT INTO invigilators (invigilator_id, name, courses, availability, load_score) VALUES ($1,$2,$3,$4,$5)', [invigilator_id || null, name, courses || null, availability || null, load_score ? Number(load_score) : 0]);
    res.json({ status: 'ok' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Insert failed', detail: String(err) }); }
});

router.put('/invigilators/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  const id = req.params.id;
  const { invigilator_id, name, courses, availability, load_score } = req.body || {};
  try {
    await db.query('UPDATE invigilators SET invigilator_id=$1, name=$2, courses=$3, availability=$4, load_score=$5 WHERE id=$6', [invigilator_id || null, name || null, courses || null, availability || null, load_score ? Number(load_score) : 0, id]);
    res.json({ status: 'ok' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Update failed', detail: String(err) }); }
});

router.delete('/invigilators/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try { await db.query('DELETE FROM invigilators WHERE id=$1', [req.params.id]); res.json({ status: 'ok' }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Delete failed', detail: String(err) }); }
});

// ------------------ Rooms CRUD ------------------
router.get('/rooms/list', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await db.query('SELECT id, room_name, floor, total_capacity, bench_capacity, rows, columns, layout, created_at FROM rooms ORDER BY room_name');
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/rooms', authenticate, authorizeRoles('admin'), async (req, res) => {
  const { room_name, floor, total_capacity, bench_capacity, rows, columns, layout } = req.body || {};
  if (!room_name) return res.status(400).json({ error: 'room_name required' });
  try {
    await db.query('INSERT INTO rooms (room_name, floor, total_capacity, bench_capacity, rows, columns, layout) VALUES ($1,$2,$3,$4,$5,$6,$7)', [room_name, floor || null, total_capacity ? Number(total_capacity) : null, bench_capacity ? Number(bench_capacity) : null, rows ? Number(rows) : null, columns ? Number(columns) : null, layout ? JSON.stringify(layout) : null]);
    res.json({ status: 'ok' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Insert failed', detail: String(err) }); }
});

router.put('/rooms/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  const id = req.params.id;
  const { room_name, floor, total_capacity, bench_capacity, rows, columns, layout } = req.body || {};
  try {
    await db.query('UPDATE rooms SET room_name=$1, floor=$2, total_capacity=$3, bench_capacity=$4, rows=$5, columns=$6, layout=$7 WHERE id=$8', [room_name || null, floor || null, total_capacity ? Number(total_capacity) : null, bench_capacity ? Number(bench_capacity) : null, rows ? Number(rows) : null, columns ? Number(columns) : null, layout ? JSON.stringify(layout) : null, id]);
    res.json({ status: 'ok' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Update failed', detail: String(err) }); }
});

router.delete('/rooms/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try { await db.query('DELETE FROM rooms WHERE id=$1', [req.params.id]); res.json({ status: 'ok' }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Delete failed', detail: String(err) }); }
});

// ------------------ Exams CRUD ------------------
router.get('/exams', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const r = await db.query('SELECT id, exam_id, date, time_slot, course_codes, total_students, created_at FROM exams ORDER BY date, exam_id');
    res.json(r.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/exams', authenticate, authorizeRoles('admin'), async (req, res) => {
  const { exam_id, date, time_slot, course_codes, total_students } = req.body || {};
  if (!exam_id) return res.status(400).json({ error: 'exam_id required' });
  try {
    await db.query('INSERT INTO exams (exam_id, date, time_slot, course_codes, total_students) VALUES ($1,$2,$3,$4,$5)', [exam_id, date || null, time_slot || null, course_codes || null, total_students ? Number(total_students) : null]);
    res.json({ status: 'ok' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Insert failed', detail: String(err) }); }
});

router.put('/exams/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  const id = req.params.id;
  const { exam_id, date, time_slot, course_codes, total_students } = req.body || {};
  try {
    await db.query('UPDATE exams SET exam_id=$1, date=$2, time_slot=$3, course_codes=$4, total_students=$5 WHERE id=$6', [exam_id || null, date || null, time_slot || null, course_codes || null, total_students ? Number(total_students) : null, id]);
    res.json({ status: 'ok' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Update failed', detail: String(err) }); }
});

router.delete('/exams/:id', authenticate, authorizeRoles('admin'), async (req, res) => {
  try { await db.query('DELETE FROM exams WHERE id=$1', [req.params.id]); res.json({ status: 'ok' }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Delete failed', detail: String(err) }); }
});

// ------------------ Seating chart PDF generator ------------------
// GET /api/admin/exams/:examId/rooms/:roomId/seating-pdf
// returns application/pdf
router.get('/exams/:examId/rooms/:roomId/seating-pdf', authenticate, authorizeRoles('admin'), async (req, res) => {
  try {
    const examId = req.params.examId;
    const roomId = Number(req.params.roomId);

    // fetch exam pk
    const examRow = await db.query('SELECT id, exam_id, date, time_slot FROM exams WHERE exam_id = $1', [examId]);
    if (examRow.rowCount === 0) return res.status(404).json({ error: 'Exam not found' });
    const examPk = examRow.rows[0].id;

    // fetch room info
    const roomRes = await db.query('SELECT id, room_name, rows, columns FROM rooms WHERE id=$1', [roomId]);
    if (roomRes.rowCount === 0) return res.status(404).json({ error: 'Room not found' });
    const room = roomRes.rows[0];

    // fetch seat assignments for this exam+room
    const saQ = `
      SELECT sa.seat_id, s.roll_number, s.name
      FROM seat_assignments sa
      LEFT JOIN students s ON s.id = sa.student_id
      WHERE sa.exam_id = $1 AND sa.room_id = $2
      ORDER BY sa.seat_id
    `;
    const saRes = await db.query(saQ, [examPk, roomId]);
    const assignments = saRes.rows || [];

    // build a grid map from seat_id => student
    const map = {};
    for (const a of assignments) {
      map[String(a.seat_id || '').toLowerCase()] = { name: a.name || null, roll: a.roll_number || null };
    }

    // Create PDF doc
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="seating_${examId}_room_${room.room_name || room.id}.pdf"`);

    doc.fontSize(14).text(`Seating chart — Exam: ${examId}`, { align: 'left' });
    doc.fontSize(10).text(`Room: ${room.room_name || room.id}    Date/Slot: ${examRow.rows[0].date || ''} ${examRow.rows[0].time_slot || ''}`, { align: 'left' });
    doc.moveDown(0.5);

    // grid layout
    const rows = room.rows || 6;
    const cols = room.columns || 5;
    const startX = doc.x;
    let curY = doc.y + 6;

    const boxW = Math.min(90, (doc.page.width - doc.page.margins.left - doc.page.margins.right - 20) / cols);
    const boxH = 50;

    for (let r = 1; r <= rows; r++) {
      let curX = startX;
      for (let c = 1; c <= cols; c++) {
        const seatId = `r${r}c${c}`;
        // draw rect
        doc.rect(curX, curY, boxW - 6, boxH).stroke();
        // populate text: seat id then roll/name
        const seatKey = seatId.toLowerCase();
        const info = map[seatKey];
        doc.fontSize(8).text(`${seatId}`, curX + 4, curY + 4, { width: boxW - 14 });
        if (info && info.roll) {
          doc.fontSize(9).text(`${info.roll}`, curX + 4, curY + 18, { width: boxW - 14 });
          doc.fontSize(7).text(`${info.name || ''}`, curX + 4, curY + 30, { width: boxW - 14, ellipsis: true });
        } else {
          doc.fontSize(8).text(`(empty)`, curX + 4, curY + 18);
        }
        curX += boxW;
      }
      curY += boxH + 6;
      // handle page break
      if (curY + boxH + 40 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        curY = doc.y;
      }
    }

    doc.end();
    doc.pipe(res);
  } catch (err) {
    console.error('seating-pdf error', err);
    res.status(500).json({ error: 'Could not generate PDF', detail: String(err) });
  }
});

module.exports = router;

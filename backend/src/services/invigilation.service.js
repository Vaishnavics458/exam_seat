// backend/src/services/invigilation.service.js
// Improved subject-matching (tokenized) + two-pass invig allocation
const db = require('../models/db');
const { detectAssignTable } = require('../utils/schema-utils'); // <-- new
const { tokensFromString } = (function(){ // keep tokensFromString local to this module
  function tokensFromString(s) {
    if (!s) return [];
    return String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, ' ')
      .split(' ')
      .map(t => t.trim())
      .filter(Boolean);
  }
  return { tokensFromString };
})();

/**
 * Returns true if invigilatorCourses contains the examSubject as an exact token
 */
function invigilatorTeachesSubject(invigilatorCoursesString, examSubjectString) {
  if (!examSubjectString) return false;
  const subjTokens = tokensFromString(examSubjectString);
  if (subjTokens.length === 0) return false;
  const examToken = subjTokens[0]; // take first token as canonical subject (common case)
  const invTokens = tokensFromString(invigilatorCoursesString);
  return invTokens.includes(examToken);
}

async function assignInvigilatorsForExam(examPk, perRoom = 1, avoidSameSubject = true) {
  try {
    // detect assignment table name (now via util)
    const assignTable = await detectAssignTable();

    // find exam columns and choose a subject-like column if present
    const examColsRes = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'exams'`);
    const examCols = (examColsRes.rows || []).map(r => r.column_name);
    const subjectCandidates = ['subject_code','course','course_code','course_codes','subject','exam_subject','subjectid'];
    const subjectCol = subjectCandidates.find(c => examCols.includes(c));

    // read exam details using the chosen columns
    const examSelectCols = ['id', 'exam_id', 'date', 'time_slot'];
    if (subjectCol) examSelectCols.push(subjectCol);
    const examQ = `SELECT ${examSelectCols.join(', ')} FROM exams WHERE id = $1`;
    const examRes = await db.query(examQ, [examPk]);
    if (examRes.rowCount === 0) return { status: 'error', error: 'Exam not found' };
    const exam = examRes.rows[0];
    const examSubjectRaw = subjectCol ? (exam[subjectCol] || '') : '';
    const examSubjectTokens = tokensFromString(examSubjectRaw); // e.g. ['bcs501','bcs602']

    // rooms used by exam
    const roomsRes = await db.query(`
      SELECT DISTINCT r.id AS room_id, r.room_name
      FROM rooms r
      JOIN seat_assignments sa ON sa.room_id = r.id
      WHERE sa.exam_id = $1
      ORDER BY r.room_name;
    `, [examPk]);
    const rooms = roomsRes.rows || [];

    // invigilators list — fetch courses as text (COALESCE to empty)
    const invRes = await db.query(`SELECT id, name, COALESCE(courses::text, '') AS courses_text FROM invigilators ORDER BY id`);
    const invigilators = (invRes.rows || []).map(r => ({ id: r.id, name: r.name, courses: (r.courses_text||'') }));

    // assignment counts at the same time slot for fairness
    const assignmentCountsRes = await db.query(`
      SELECT ia.invigilator_id::int AS invigilator_id, COUNT(*) AS cnt
      FROM ${assignTable} ia
      LEFT JOIN exams e ON e.id = ia.exam_id
      WHERE e.time_slot = $1
      GROUP BY ia.invigilator_id;
    `, [exam.time_slot]);
    const countsMap = {};
    for (const r of (assignmentCountsRes.rows || [])) countsMap[r.invigilator_id] = Number(r.cnt);

    // existing assignments for this exam (we'll delete them but record IDs)
    const existingAssignedRes = await db.query(`SELECT ia.invigilator_id::int AS inv_id FROM ${assignTable} ia WHERE ia.exam_id = $1`, [examPk]);
    const alreadyAssignedSet = new Set((existingAssignedRes.rows || []).map(r => r.inv_id));

    // idempotent: delete previous assignments for this exam (MVP behavior)
    try {
      await db.query(`DELETE FROM ${assignTable} WHERE exam_id = $1`, [examPk]);
      alreadyAssignedSet.clear();
    } catch (delErr) {
      console.warn('Could not delete previous assignments (continuing):', delErr && delErr.message);
    }

    // candidate ordering by least assigned (fairness)
    function getSortedCandidates() {
      return invigilators.slice().sort((a, b) => {
        const ca = countsMap[a.id] || 0;
        const cb = countsMap[b.id] || 0;
        if (ca !== cb) return ca - cb;
        return a.id - b.id;
      });
    }

    const newAssignedSet = new Set();
    const roomAssignments = {};

    // PASS 1: strict - avoid same-subject (token match)
    for (const room of rooms) {
      roomAssignments[room.room_id] = [];
      let picked = 0;
      for (const inv of getSortedCandidates()) {
        if (picked >= perRoom) break;
        if (alreadyAssignedSet.has(inv.id)) continue;
        if (newAssignedSet.has(inv.id)) continue;

        // Strict check: skip if invigilator teaches ANY of the exam subject tokens
        if (avoidSameSubject && examSubjectTokens && examSubjectTokens.length > 0) {
          const invTokens = tokensFromString(inv.courses || '');
          const conflict = examSubjectTokens.some(et => invTokens.includes(et));
          if (conflict) {
            console.log(`SKIP inv ${inv.id} (${inv.name}) for room ${room.room_id} — teaches one of exam tokens ${examSubjectTokens.join(',')}`);
            continue;
          }
        }

        // assign
        roomAssignments[room.room_id].push(inv.id);
        newAssignedSet.add(inv.id);
        countsMap[inv.id] = (countsMap[inv.id] || 0) + 1;
        picked++;
      }
    }

    // PASS 2: relaxed - allow same-subject if needed (but still avoid double-book)
    for (const room of rooms) {
      let picked = roomAssignments[room.room_id].length;
      if (picked >= perRoom) continue;
      for (const inv of getSortedCandidates()) {
        if (picked >= perRoom) break;
        if (alreadyAssignedSet.has(inv.id)) continue;
        if (newAssignedSet.has(inv.id)) continue;
        // relaxed — assign even if they teach the same subject
        roomAssignments[room.room_id].push(inv.id);
        newAssignedSet.add(inv.id);
        countsMap[inv.id] = (countsMap[inv.id] || 0) + 1;
        picked++;
      }
    }

    // prepare inserts and unfilled rooms report
    const unfilledRooms = [];
    const assignmentsToInsert = [];
    for (const room of rooms) {
      const assignedList = roomAssignments[room.room_id] || [];
      if (assignedList.length < perRoom) {
        unfilledRooms.push({ room_id: room.room_id, room_name: room.room_name, assigned: assignedList.length, required: perRoom });
      }
      for (const invId of assignedList) {
        assignmentsToInsert.push({ exam_id: examPk, room_id: room.room_id, invigilator_id: invId });
      }
    }

    // Insert new assignments in a transaction
    await db.query('BEGIN');
    const inserted = [];
    try {
      for (const a of assignmentsToInsert) {
        try {
          const insQ = `INSERT INTO ${assignTable} (exam_id, room_id, invigilator_id, created_at) VALUES ($1,$2,$3,NOW()) RETURNING id`;
          const ir = await db.query(insQ, [a.exam_id, a.room_id, a.invigilator_id]);
          inserted.push({ id: ir.rows[0] && ir.rows[0].id, exam_id: a.exam_id, room_id: a.room_id, invigilator_id: a.invigilator_id });
        } catch (insErr) {
          if (insErr.message && insErr.message.includes('created_at')) {
            const insQ2 = `INSERT INTO ${assignTable} (exam_id, room_id, invigilator_id) VALUES ($1,$2,$3) RETURNING id`;
            const ir2 = await db.query(insQ2, [a.exam_id, a.room_id, a.invigilator_id]);
            inserted.push({ id: ir2.rows[0] && ir2.rows[0].id, exam_id: a.exam_id, room_id: a.room_id, invigilator_id: a.invigilator_id });
          } else {
            await db.query('ROLLBACK');
            console.error('invig assign insert failed', insErr && insErr.message);
            return { status: 'error', error: String(insErr) };
          }
        }
      }
      await db.query('COMMIT');
      return { status: 'ok', total_assigned: inserted.length, assignments: inserted, unfilled_rooms: unfilledRooms };
    } catch (finalErr) {
      await db.query('ROLLBACK');
      console.error('assignInvigilatorsForExam insert error', finalErr && finalErr.message);
      return { status: 'error', error: String(finalErr) };
    }
  } catch (err) {
    console.error('assignInvigilatorsForExam error', err && err.message);
    return { status: 'error', error: String(err) };
  }
}

module.exports = { assignInvigilatorsForExam, invigilatorTeachesSubject: invigilatorTeachesSubject };

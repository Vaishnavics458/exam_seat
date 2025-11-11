// backend/src/services/seating.service.js
const db = require('../models/db');

/**
 * Helper: build seat list for a room (row-major)
 * seat id format: r{row}c{col}, rows and cols are integers
 */
function buildSeats(rows, cols) {
  const seats = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      seats.push({ id: `r${r}c${c}`, row: r, col: c });
    }
  }
  return seats;
}

function areAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

/**
 * generateSeatingByExamId(exam_id_text)
 * - exam_id_text is the exam_id column (like "E001_10AM")
 */
async function generateSeatingByExamId(exam_id_text) {
  // 1) lookup exam row
  const examRes = await db.query('SELECT * FROM exams WHERE exam_id=$1', [exam_id_text]);
  if (examRes.rowCount === 0) throw new Error('Exam not found');
  const exam = examRes.rows[0];

  // 2) get registered students for the courses in this exam
  // for MVP we treat course_codes as CSV: split and match exact course_code in students.course_code
  const examCourses = (exam.course_codes || '').split(',').map(s => s.trim()).filter(Boolean);
  if (examCourses.length === 0) throw new Error('No courses for this exam');

  const studentsRes = await db.query(
    `SELECT * FROM students WHERE course_code = ANY($1::text[]) ORDER BY student_id`,
    [examCourses]
  );
  const students = studentsRes.rows.slice(); // array

  // 3) get rooms (all rooms)
  const roomsRes = await db.query('SELECT * FROM rooms ORDER BY room_name');
  const rooms = roomsRes.rows;

  // 4) prepare seating map
  const assignments = []; // {room_id, seat_id, student_id}
  const overflow = [];

  // Build seat structures for each room
  const roomMaps = rooms.map(room => {
    const rows = room.rows || 0;
    const cols = room.columns || 0;
    const seats = buildSeats(rows, cols);
    return { room, seats, assigned: {} }; // assigned seat_id -> student
  });

  // 5) place students grouped by course (largest groups first)
  const groups = {};
  for (const s of students) {
    const key = s.course_code;
    groups[key] = groups[key] || [];
    groups[key].push(s);
  }
  const groupList = Object.values(groups).sort((a, b) => b.length - a.length);

  // Optional: reserve for accommodations first (not implemented here - MVP)
  // Now greedy place
  for (const group of groupList) {
    for (const student of group) {
      let placed = false;
      // try each room
      for (const rm of roomMaps) {
        for (const seat of rm.seats) {
          if (rm.assigned[seat.id]) continue; // occupied
          // check adjacency to other same-course in this room
          let conflict = false;
          for (const [sid, stu] of Object.entries(rm.assigned)) {
            if (!stu) continue;
            if (stu.course_code === student.course_code) {
              const otherSeat = rm.seats.find(s => s.id === sid);
              if (areAdjacent(seat, otherSeat)) {
                conflict = true;
                break;
              }
            }
          }
          if (conflict) continue;
          // assign
          rm.assigned[seat.id] = student;
          assignments.push({ room_id: rm.room.id, seat_id: seat.id, student_id: student.id });
          placed = true;
          break;
        }
        if (placed) break;
      }
      if (!placed) overflow.push(student);
    }
  }

  // 6) persist assignments into DB (delete previous for this exam then insert)
  // find exam numeric id
  const examNumeric = exam.id;
  await db.query('BEGIN');
  try {
    await db.query('DELETE FROM seat_assignments WHERE exam_id=$1', [examNumeric]);
    const insertText = 'INSERT INTO seat_assignments (exam_id, room_id, seat_id, student_id) VALUES ($1,$2,$3,$4)';
    for (const a of assignments) {
      await db.query(insertText, [examNumeric, a.room_id, a.seat_id, a.student_id]);
    }
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }

  return { status: 'ok', total_assigned: assignments.length, overflow_count: overflow.length, overflow: overflow.map(s=>({id:s.id, name:s.name, course:s.course_code})) };
}

module.exports = { generateSeatingByExamId };

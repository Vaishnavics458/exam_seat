// backend/seeds/load_cleaned_csvs.js
const fs = require('fs');
const path = require('path');
// const parse = require('csv-parse/lib/sync');
const { parse } = require('csv-parse/sync');
const db = require('../src/models/db');

const dataDir = path.resolve(__dirname, '../../data');

async function loadCSV(filename) {
  const text = fs.readFileSync(path.join(dataDir, filename), 'utf8');
  return parse(text, { columns: true, skip_empty_lines: true });
}

async function seed() {
  try {
    const students = await loadCSV('students_cleaned.csv');
    const invigs = await loadCSV('invigilators_cleaned.csv');
    const rooms = await loadCSV('rooms_cleaned.csv');
    const exams = await loadCSV('exams_cleaned.csv');

    // insert students
    for (const s of students) {
      await db.query(
        `INSERT INTO students (student_id, roll_number, name, course_code, branch, semester)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (student_id) DO NOTHING`,
        [s.Student_ID || s.student_id, s.Roll_Number || s.roll_number, s.Name || s.name, s.Course_Code || s.course_code, s.Branch || s.branch, s.Semester || (s.semester ? parseInt(s.semester) : null)]
      );
    }

    // invigilators
    for (const iv of invigs) {
      await db.query(
        `INSERT INTO invigilators (invigilator_id, name, courses, availability, load_score)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (invigilator_id) DO NOTHING`,
        [iv.Invigilator_ID || iv.invigilator_id, iv.Name || iv.name, iv.Course || iv.courses, iv.Availability || iv.availability, iv.Load_Score != null ? parseInt(iv.Load_Score) : 0]
      );
    }

    // rooms
    for (const r of rooms) {
      const rows = r.Rows || (r.rows ? parseInt(r.rows) : null) || null;
      const cols = r.Columns || (r.columns ? parseInt(r.columns) : null) || null;
      const layout = { raw: r.Layout_Matrix || r.layout_matrix || null };
      await db.query(
        `INSERT INTO rooms (room_name, floor, total_capacity, bench_capacity, rows, columns, layout)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (room_name) DO NOTHING`,
        [r.Room_Name || r.room_name, r.Floor || r.floor, r.Total_Capacity || r.total_capacity || 0, r.Bench_Capacity || r.bench_capacity || 1, rows, cols, JSON.stringify(layout)]
      );
    }

    // exams (we store course_codes as string)
    for (const e of exams) {
      // convert Date_ISO to date
      const dt = e.Date_ISO || e.Date || e.date;
      await db.query(
        `INSERT INTO exams (exam_id, date, time_slot, course_codes, total_students)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (exam_id) DO NOTHING`,
        [e.Exam_ID || e.exam_id, dt ? dt : null, e.Time_Slot || e.time_slot, e.Course_Code || e.course_codes, e.Total_Students || e.total_students || 0]
      );
    }

    console.log('Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Seed error', err);
    process.exit(1);
  }
}

seed();

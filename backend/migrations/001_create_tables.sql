-- backend/migrations/001_create_tables.sql

-- students
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_id TEXT UNIQUE,
  roll_number TEXT,
  name TEXT,
  course_code TEXT,
  branch TEXT,
  semester INT,
  created_at TIMESTAMP DEFAULT now()
);

-- invigilators
CREATE TABLE IF NOT EXISTS invigilators (
  id SERIAL PRIMARY KEY,
  invigilator_id TEXT UNIQUE,
  name TEXT,
  courses TEXT, -- comma separated for MVP (e.g. "BCS501,BCS601")
  availability TEXT,
  load_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- rooms
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  room_name TEXT,
  floor TEXT,
  total_capacity INT,
  bench_capacity INT,
  rows INT,
  columns INT,
  layout JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- exams
CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  exam_id TEXT UNIQUE,
  date DATE,
  time_slot TEXT,
  course_codes TEXT, -- comma separated e.g. "BCS501,BCS601"
  total_students INT,
  created_at TIMESTAMP DEFAULT now()
);

-- seat_assignments
CREATE TABLE IF NOT EXISTS seat_assignments (
  id SERIAL PRIMARY KEY,
  exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
  room_id INT REFERENCES rooms(id),
  seat_id TEXT,
  student_id INT REFERENCES students(id),
  created_at TIMESTAMP DEFAULT now()
);

-- invig_assignments
CREATE TABLE IF NOT EXISTS invig_assignments (
  id SERIAL PRIMARY KEY,
  exam_id INT REFERENCES exams(id) ON DELETE CASCADE,
  room_id INT REFERENCES rooms(id),
  invigilator_id INT REFERENCES invigilators(id),
  created_at TIMESTAMP DEFAULT now()
);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  entity TEXT,
  entity_id TEXT,
  action TEXT,
  actor TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT now()
);

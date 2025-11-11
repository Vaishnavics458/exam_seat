CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  roll_number TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin','invigilator','student')) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

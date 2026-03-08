/*
  # Attendance System Database Schema

  ## Overview
  Creates a complete fingerprint-based attendance tracking system for students
  with check-in/check-out capabilities and monthly reporting.

  ## New Tables
  
  ### `students`
  Stores student information and fingerprint enrollment data
  - `id` (uuid, primary key) - Unique student identifier
  - `student_id` (text, unique) - Student roll number or ID
  - `name` (text) - Full name of the student
  - `fingerprint_id` (integer, unique) - Fingerprint sensor template ID
  - `email` (text, optional) - Student email address
  - `phone` (text, optional) - Contact number
  - `is_active` (boolean) - Active status
  - `created_at` (timestamptz) - Registration timestamp

  ### `attendance`
  Records daily attendance with check-in and check-out times
  - `id` (uuid, primary key) - Unique attendance record ID
  - `student_id` (uuid, foreign key) - References students table
  - `date` (date) - Attendance date
  - `check_in` (timestamptz) - First fingerprint scan of the day
  - `check_out` (timestamptz, nullable) - Last fingerprint scan of the day
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on all tables
  - Public read access for attendance marking (from Raspberry Pi)
  - Authenticated users can view all records
  - Only authenticated users can manage students

  ## Indexes
  - Index on attendance date for fast monthly queries
  - Index on student_id for quick lookups
  - Unique constraint on (student_id, date) to prevent duplicate records
*/

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  name text NOT NULL,
  fingerprint_id integer UNIQUE NOT NULL,
  email text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  check_in timestamptz NOT NULL DEFAULT now(),
  check_out timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_students_fingerprint_id ON students(fingerprint_id);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students table

CREATE POLICY "Anyone can view active students"
  ON students FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update students"
  ON students FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete students"
  ON students FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for attendance table

CREATE POLICY "Anyone can view attendance"
  ON attendance FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert attendance"
  ON attendance FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update attendance"
  ON attendance FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attendance"
  ON attendance FOR DELETE
  TO authenticated
  USING (true);
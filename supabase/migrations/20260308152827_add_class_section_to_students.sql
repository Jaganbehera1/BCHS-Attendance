/*
  # Add Class and Section to Students

  1. New Columns on students table:
    - `class_grade` (text, e.g., "6", "7", "8", "9", "10")
    - `section` (text, e.g., "A", "B", "C", "D")
  
  2. These fields are required for attendance filtering and reporting
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'class_grade'
  ) THEN
    ALTER TABLE students ADD COLUMN class_grade text NOT NULL DEFAULT '6';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'section'
  ) THEN
    ALTER TABLE students ADD COLUMN section text NOT NULL DEFAULT 'A';
  END IF;
END $$;

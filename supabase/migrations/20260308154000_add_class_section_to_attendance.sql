/*
  # Add Class and Section to Attendance

  Adds denormalized class/section fields so reports can be filtered
  without relying on a join. Fields will default to the student's
  current values when the record is created.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'class_grade'
  ) THEN
    ALTER TABLE attendance ADD COLUMN class_grade text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'section'
  ) THEN
    ALTER TABLE attendance ADD COLUMN section text;
  END IF;
END $$;

-- optionally index the new fields for faster filtering
CREATE INDEX IF NOT EXISTS idx_attendance_class_grade ON attendance(class_grade);
CREATE INDEX IF NOT EXISTS idx_attendance_section ON attendance(section);

/*
  # Update existing attendance records with class/section

  Updates any attendance records that have null class_grade/section
  to use the values from the associated student record.
*/

UPDATE attendance
SET
  class_grade = students.class_grade,
  section = students.section
FROM students
WHERE attendance.student_id = students.id
  AND (attendance.class_grade IS NULL OR attendance.section IS NULL)
  AND students.class_grade IS NOT NULL
  AND students.section IS NOT NULL;
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Student {
  id: string;
  student_id: string;
  name: string;
  fingerprint_id: number;
  email?: string;
  phone?: string;
  is_active: boolean;
  class_grade: string; // added for filtering/reporting
  section: string;     // added for filtering/reporting
  created_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  check_in: string;
  check_out?: string;
  class_grade?: string; // denormalized copy of student's class at time of record
  section?: string;     // denormalized copy of student's section
  created_at: string;
  updated_at: string;
  students?: Student;
}

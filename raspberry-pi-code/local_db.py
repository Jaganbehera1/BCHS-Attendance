import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict

class LocalAttendanceDB:
    def __init__(self, db_path: str = 'attendance_local.db'):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        """Initialize the local database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS attendance (
                    id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    check_in TEXT NOT NULL,
                    check_out TEXT,
                    class_grade TEXT,
                    section TEXT,
                    synced BOOLEAN DEFAULT 0,
                    created_at TEXT,
                    updated_at TEXT,
                    UNIQUE(student_id, date)
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS students (
                    id TEXT PRIMARY KEY,
                    student_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    fingerprint_id INTEGER UNIQUE NOT NULL,
                    email TEXT,
                    phone TEXT,
                    class_grade TEXT,
                    section TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    synced BOOLEAN DEFAULT 0,
                    created_at TEXT,
                    updated_at TEXT
                )
            ''')
            conn.commit()

    def store_attendance(self, record: Dict) -> bool:
        """Store attendance record locally"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('''
                    INSERT OR REPLACE INTO attendance
                    (id, student_id, date, check_in, check_out, class_grade, section, synced, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    record['id'],
                    record['student_id'],
                    record['date'],
                    record['check_in'],
                    record['check_out'],
                    record['class_grade'],
                    record['section'],
                    record.get('synced', False),
                    record['created_at'],
                    record['updated_at']
                ))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error storing attendance locally: {e}")
            return False

    def get_unsynced_records(self) -> List[Dict]:
        """Get all unsynced attendance records"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute('SELECT * FROM attendance WHERE synced = 0')
                columns = [desc[0] for desc in cursor.description]
                return [dict(zip(columns, row)) for row in cursor.fetchall()]
        except Exception as e:
            print(f"Error getting unsynced records: {e}")
            return []

    def mark_synced(self, record_id: str) -> bool:
        """Mark a record as synced"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('UPDATE attendance SET synced = 1 WHERE id = ?', (record_id,))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error marking record as synced: {e}")
            return False

    def get_student_by_fingerprint(self, fingerprint_id: int) -> Optional[Dict]:
        """Get student by fingerprint ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute('SELECT * FROM students WHERE fingerprint_id = ? AND is_active = 1', (fingerprint_id,))
                columns = [desc[0] for desc in cursor.description]
                row = cursor.fetchone()
                return dict(zip(columns, row)) if row else None
        except Exception as e:
            print(f"Error getting student: {e}")
            return None

    def sync_students_from_api(self, students_data: List[Dict]):
        """Sync students data from API"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                for student in students_data:
                    conn.execute('''
                        INSERT OR REPLACE INTO students
                        (id, student_id, name, fingerprint_id, email, phone, class_grade, section, is_active, synced, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    ''', (
                        student['id'],
                        student['student_id'],
                        student['name'],
                        student['fingerprint_id'],
                        student.get('email'),
                        student.get('phone'),
                        student.get('class_grade'),
                        student.get('section'),
                        student.get('is_active', True),
                        student.get('created_at', datetime.now().isoformat()),
                        student.get('updated_at', datetime.now().isoformat())
                    ))
                conn.commit()
                print(f"Synced {len(students_data)} students locally")
        except Exception as e:
            print(f"Error syncing students: {e}")

    def get_all_students(self) -> List[Dict]:
        """Get all students"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute('SELECT * FROM students WHERE is_active = 1')
                columns = [desc[0] for desc in cursor.description]
                return [dict(zip(columns, row)) for row in cursor.fetchall()]
        except Exception as e:
            print(f"Error getting students: {e}")
            return []
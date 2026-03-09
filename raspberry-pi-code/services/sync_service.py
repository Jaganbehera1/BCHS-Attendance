"""
Sync Service Module
Handles synchronization between local database and Supabase
"""

import time
from typing import List, Dict, Any
from local_db import LocalAttendanceDB

class SyncService:
    """Service for syncing data between local and remote databases"""

    def __init__(self, api_url: str):
        self.api_url = api_url
        self.local_db = LocalAttendanceDB()

    def is_online(self) -> bool:
        """Check internet connectivity"""
        try:
            import requests
            requests.get("https://www.google.com", timeout=5)
            return True
        except:
            return False

    def sync_students_from_supabase(self) -> bool:
        """Sync student data from Supabase to local database"""
        if not self.is_online():
            print("❌ No internet connection for student sync")
            return False

        try:
            import requests
            # Note: This assumes you have a student endpoint
            # You may need to create this in your Supabase functions
            student_url = self.api_url.replace('/mark-attendance', '/get-students')

            headers = {
                "apikey": "your-supabase-anon-key",  # Replace with actual key
                "Authorization": "Bearer your-supabase-anon-key",  # Replace with actual key
                "Content-Type": "application/json"
            }

            response = requests.get(student_url, headers=headers, timeout=30)

            if response.status_code == 200:
                students_data = response.json()
                self.local_db.sync_students_from_api(students_data)
                print(f"✅ Synced {len(students_data)} students locally")
                return True
            else:
                print(f"❌ Failed to fetch students: {response.status_code}")
                return False

        except Exception as e:
            print(f"❌ Error syncing students: {e}")
            return False

    def sync_attendance_to_supabase(self) -> Dict[str, int]:
        """Sync local attendance records to Supabase"""
        if not self.is_online():
            print("❌ No internet connection for attendance sync")
            return {"synced": 0, "failed": 0}

        unsynced_records = self.local_db.get_unsynced_records()

        if not unsynced_records:
            print("ℹ️  No unsynced records found")
            return {"synced": 0, "failed": 0}

        print(f"🔄 Syncing {len(unsynced_records)} records...")

        synced_count = 0
        failed_count = 0

        for record in unsynced_records:
            try:
                # Get student info
                students = self.local_db.get_all_students()
                student = next((s for s in students if s['student_id'] == record['student_id']), None)

                if not student:
                    print(f"⚠️  Student {record['student_id']} not found locally, skipping")
                    failed_count += 1
                    continue

                # Try to sync
                if self._sync_single_record(record, student):
                    self.local_db.mark_synced(record['id'])
                    synced_count += 1
                    print(f"✅ Synced {student['name']}")
                else:
                    failed_count += 1
                    print(f"❌ Failed to sync {student['name']}")

            except Exception as e:
                print(f"❌ Error syncing record {record['id']}: {e}")
                failed_count += 1

        print(f"📊 Sync complete: {synced_count} synced, {failed_count} failed")
        return {"synced": synced_count, "failed": failed_count}

    def _sync_single_record(self, record: Dict[str, Any], student: Dict[str, Any]) -> bool:
        """Sync a single attendance record"""
        try:
            import requests
            payload = {
                "fingerprint_id": student['fingerprint_id']
            }

            headers = {
                "Content-Type": "application/json"
            }

            response = requests.post(
                self.api_url,
                json=payload,
                headers=headers,
                timeout=15
            )

            return response.status_code == 200

        except Exception as e:
            return False

    def get_sync_status(self) -> Dict[str, Any]:
        """Get current sync status"""
        unsynced = len(self.local_db.get_unsynced_records())
        total_students = len(self.local_db.get_all_students())

        return {
            "unsynced_records": unsynced,
            "total_students": total_students,
            "is_online": self.is_online()
        }

    def force_sync_all(self) -> Dict[str, int]:
        """Force sync all data"""
        print("🔄 Starting full sync...")

        # Sync students first
        student_sync = self.sync_students_from_supabase()

        # Then sync attendance
        attendance_sync = self.sync_attendance_to_supabase()

        return {
            "students_synced": student_sync,
            "attendance_synced": attendance_sync["synced"],
            "attendance_failed": attendance_sync["failed"]
        }
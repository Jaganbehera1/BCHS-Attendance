#!/usr/bin/env python3
"""
Sync script for Raspberry Pi attendance system
Runs periodically to sync local attendance records with Supabase
"""

import requests
import time
import json
from datetime import datetime
from local_db import LocalAttendanceDB

class AttendanceSync:
    def __init__(self, api_url):
        self.api_url = api_url
        self.local_db = LocalAttendanceDB()

    def sync_students(self):
        """Sync students from Supabase to local DB"""
        try:
            print("Syncing students from Supabase...")
            # Note: This assumes there's an endpoint to get all students
            # You might need to add this to your Supabase functions
            response = requests.get(f"{self.api_url.replace('/mark-attendance', '/get-students')}", timeout=30)

            if response.status_code == 200:
                students_data = response.json()
                self.local_db.sync_students_from_api(students_data)
                print(f"Synced {len(students_data)} students")
            else:
                print(f"Failed to sync students: {response.status_code}")
        except Exception as e:
            print(f"Error syncing students: {e}")

    def sync_attendance(self):
        """Sync local attendance records to Supabase"""
        print("Checking for unsynced attendance records...")
        unsynced_records = self.local_db.get_unsynced_records()

        if not unsynced_records:
            print("No unsynced records found")
            return

        print(f"Found {len(unsynced_records)} unsynced records")

        synced_count = 0
        failed_count = 0

    def sync_attendance(self):
        """Sync local attendance records to Supabase"""
        print("Checking for unsynced attendance records...")
        unsynced_records = self.local_db.get_unsynced_records()

        if not unsynced_records:
            print("No unsynced records found")
            return

        print(f"Found {len(unsynced_records)} unsynced records")

        synced_count = 0
        failed_count = 0

        for record in unsynced_records:
            try:
                # Get student info to get fingerprint_id
                students = self.local_db.get_all_students()
                student = next((s for s in students if s['student_id'] == record['student_id']), None)

                if not student:
                    print(f"Student {record['student_id']} not found locally, skipping")
                    failed_count += 1
                    continue

                # Check if this record already exists in Supabase (simplified check)
                if self.record_exists_in_supabase(record, student):
                    print(f"Record for {student['name']} already exists in Supabase, marking as synced")
                    self.local_db.mark_synced(record['id'])
                    synced_count += 1
                    continue

                # Try to sync by calling the API
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

                if response.status_code == 200:
                    api_data = response.json()
                    print(f"Synced {api_data['type']} for {student['name']}")
                    self.local_db.mark_synced(record['id'])
                    synced_count += 1
                else:
                    print(f"Failed to sync {student['name']}: {response.status_code} - {response.text}")
                    failed_count += 1

            except Exception as e:
                print(f"Error syncing record {record['id']}: {e}")
                failed_count += 1

        print(f"Sync complete: {synced_count} synced, {failed_count} failed")

    def record_exists_in_supabase(self, record, student):
        """Check if a record already exists in Supabase"""
        try:
            # This is a simplified check - in practice, you might need a dedicated endpoint
            # For now, we'll assume if we get a successful API call, it means the record was processed
            # This prevents duplicate API calls for the same attendance session
            return False  # Always try to sync for now
        except:
            return False

    def run_sync(self):
        """Run the complete sync process"""
        print(f"Starting sync at {datetime.now()}")

        try:
            self.sync_students()
            self.sync_attendance()
            print("Sync completed successfully")
        except Exception as e:
            print(f"Sync failed: {e}")

def main():
    # Get API URL from environment or config
    api_url = "https://your-supabase-url.supabase.co/functions/v1/mark-attendance"

    sync = AttendanceSync(api_url)
    sync.run_sync()

if __name__ == "__main__":
    main()
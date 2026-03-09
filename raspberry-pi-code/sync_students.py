#!/usr/bin/env python3
"""
Manual student sync script for Raspberry Pi
Syncs student data from Supabase to local database when online
"""

import requests
import json
from datetime import datetime
from local_db import LocalAttendanceDB

class StudentSync:
    def __init__(self, supabase_url, supabase_key):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.local_db = LocalAttendanceDB()

    def sync_students(self):
        """Sync students from Supabase to local DB"""
        try:
            print("Fetching students from Supabase...")

            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json"
            }

            response = requests.get(
                f"{self.supabase_url}/rest/v1/students?select=*",
                headers=headers,
                timeout=30
            )

            if response.status_code == 200:
                students_data = response.json()
                print(f"Found {len(students_data)} students in Supabase")

                self.local_db.sync_students_from_api(students_data)
                print("✓ Students synced successfully to local database")
                return True
            else:
                print(f"✗ Failed to fetch students: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"✗ Error syncing students: {e}")
            return False

def main():
    # These should be provided as environment variables or config
    supabase_url = "https://your-project.supabase.co"
    supabase_key = "your-anon-key"

    print("Manual Student Sync Tool")
    print("=" * 30)
    print(f"Supabase URL: {supabase_url}")
    print()

    sync = StudentSync(supabase_url, supabase_key)

    if sync.sync_students():
        print("\n✓ Sync completed successfully!")
        print("Students are now available for offline attendance marking.")
    else:
        print("\n✗ Sync failed. Check your internet connection and API keys.")

if __name__ == "__main__":
    main()
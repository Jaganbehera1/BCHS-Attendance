"""
Attendance Service Module
Handles fingerprint-based attendance marking with offline support
"""

import time
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from fingerprint_utils import FingerprintSensor
from local_db import LocalAttendanceDB

class AttendanceService:
    """Service for handling attendance marking operations"""

    def __init__(self, api_url: str, sensor_port: str = '/dev/ttyUSB0'):
        self.api_url = api_url
        self.sensor_port = sensor_port
        self.sensor: Optional[FingerprintSensor] = None
        self.local_db = LocalAttendanceDB()
        self.marked_today: set = set()
        self.cooldown_period = 10
        self.is_running = False

    def initialize_sensor(self) -> bool:
        """Initialize and connect to fingerprint sensor"""
        try:
            self.sensor = FingerprintSensor(port=self.sensor_port)
            if not self.sensor.serial or not self.sensor.serial.is_open:
                print("❌ Failed to connect to fingerprint sensor")
                return False
            print("✅ Fingerprint sensor connected")
            return True
        except Exception as e:
            print(f"❌ Error initializing sensor: {e}")
            return False

    def is_online(self) -> bool:
        """Check if we can reach the API"""
        try:
            import requests
            requests.get("https://www.google.com", timeout=5)
            return True
        except:
            return False

    def get_student_by_fingerprint(self, fingerprint_id: int) -> Optional[Dict[str, Any]]:
        """Get student info from local database"""
        return self.local_db.get_student_by_fingerprint(fingerprint_id)

    def store_attendance_locally(self, record: Dict[str, Any]) -> bool:
        """Store attendance record in local database"""
        return self.local_db.store_attendance(record)

    def sync_record_to_api(self, record: Dict[str, Any], student: Dict[str, Any]) -> bool:
        """Sync a single record to the API"""
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
                timeout=10
            )

            if response.status_code == 200:
                api_data = response.json()
                print(f"  API Response: {api_data['student_name']} - {api_data['type']}")
                return True
            else:
                print(f"  API Error: {response.status_code}")
                return False

        except Exception as e:
            print(f"  Connection error: {e}")
            return False

    def mark_attendance(self, fingerprint_id: int) -> bool:
        """Mark attendance with local storage first, then sync if online"""
        try:
            # Get student info from local DB
            student = self.get_student_by_fingerprint(fingerprint_id)
            if not student:
                print(f"✗ Student with fingerprint ID {fingerprint_id} not found locally")
                print("Please sync students first when online")
                return False

            current_time = datetime.now()
            today = current_time.date().isoformat()
            now_iso = current_time.isoformat()

            # Check if already marked today
            if fingerprint_id in self.marked_today:
                print(f"Student {student['name']} already marked today")
                return False

            # Create attendance record - ALWAYS store locally first
            attendance_record = {
                'id': str(uuid.uuid4()),
                'student_id': student['student_id'],
                'date': today,
                'check_in': now_iso,
                'check_out': None,
                'class_grade': student.get('class_grade'),
                'section': student.get('section'),
                'synced': False,
                'created_at': now_iso,
                'updated_at': now_iso
            }

            # Store locally first
            if not self.store_attendance_locally(attendance_record):
                print("✗ Failed to store attendance locally")
                return False

            print(f"✓ Stored attendance locally for {student['name']}")

            # Try to sync with API if online
            if self.is_online():
                print(f"Online - syncing with API...")
                if self.sync_record_to_api(attendance_record, student):
                    self.local_db.mark_synced(attendance_record['id'])
                    print("✓ Synced with API successfully")
                else:
                    print("✗ Failed to sync with API, will retry later")
            else:
                print("Offline - attendance stored locally, will sync when online")

            self.marked_today.add(fingerprint_id)
            return True

        except Exception as e:
            print(f"✗ Error: {str(e)}")
            return False

    def start_monitoring(self) -> None:
        """Start continuous fingerprint monitoring"""
        if not self.sensor:
            if not self.initialize_sensor():
                return

        print("\n🖐️  Fingerprint Attendance System Started")
        print("Place your finger to mark attendance...")
        print("Press Ctrl+C to stop\n")

        self.is_running = True
        last_mark = {}

        try:
            while self.is_running:
                if self.sensor.get_image():
                    if self.sensor.image_to_tz(1):
                        finger_id, score = self.sensor.search()

                        if finger_id is not None:
                            current_time = time.time()

                            if finger_id in last_mark:
                                if current_time - last_mark[finger_id] < self.cooldown_period:
                                    print(f"Fingerprint {finger_id} already marked recently. Please wait...")
                                    time.sleep(2)
                                    continue

                            print(f"\nFingerprint detected: ID {finger_id} (Score: {score})")
                            self.mark_attendance(finger_id)
                            last_mark[finger_id] = current_time
                            print("Remove finger and wait for next scan...\n")
                            time.sleep(2)
                        else:
                            print("Fingerprint not recognized")

                    time.sleep(0.5)

        except KeyboardInterrupt:
            print("\n\nStopping attendance system...")
        finally:
            self.stop_monitoring()

    def stop_monitoring(self) -> None:
        """Stop attendance monitoring"""
        self.is_running = False
        if self.sensor:
            self.sensor.disconnect()
            print("✅ Sensor disconnected")

    def reset_daily_marks(self) -> None:
        """Reset daily attendance marks (call this daily)"""
        self.marked_today.clear()
        print("✅ Daily attendance marks reset")
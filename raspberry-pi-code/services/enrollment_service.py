"""
Enrollment Service Module
Handles fingerprint enrollment operations
"""

from typing import Optional, List, Dict, Any
from fingerprint_utils import FingerprintSensor
from local_db import LocalAttendanceDB

class EnrollmentService:
    """Service for managing fingerprint enrollment"""

    def __init__(self, sensor_port: str = '/dev/ttyUSB0'):
        self.sensor_port = sensor_port
        self.sensor: Optional[FingerprintSensor] = None
        self.local_db = LocalAttendanceDB()

    def initialize_sensor(self) -> bool:
        """Initialize fingerprint sensor"""
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

    def enroll_fingerprint(self, fingerprint_id: int) -> bool:
        """Enroll a new fingerprint"""
        if not self.sensor:
            if not self.initialize_sensor():
                return False

        print(f"🖐️  Enrolling Fingerprint ID: {fingerprint_id}")

        # Check if already assigned
        students = self.local_db.get_all_students()
        assigned_to = None
        for student in students:
            if student.get('fingerprint_id') == fingerprint_id:
                assigned_to = student
                break

        if assigned_to:
            print(f"⚠️  Fingerprint ID {fingerprint_id} already assigned to {assigned_to['name']}")
            response = input("Continue anyway? (y/N): ").lower().strip()
            if response != 'y':
                return False

        # Start enrollment
        self.sensor.led_on()
        success = self.sensor.enroll_fingerprint(fingerprint_id)
        self.sensor.led_off()

        if success:
            print(f"✅ Fingerprint {fingerprint_id} enrolled successfully!")
            return True
        else:
            print(f"❌ Failed to enroll fingerprint {fingerprint_id}")
            return False

    def verify_fingerprint(self, fingerprint_id: int) -> bool:
        """Verify an enrolled fingerprint"""
        if not self.sensor:
            if not self.initialize_sensor():
                return False

        print(f"🔍 Verifying Fingerprint ID: {fingerprint_id}")
        print("Place finger on sensor...")

        self.sensor.led_on()
        try:
            if self.sensor.get_image():
                found_id, score = self.sensor.search()

                if found_id == fingerprint_id:
                    print(f"✅ Verification successful! Found ID {found_id} with score {score}")
                    return True
                elif found_id is not None:
                    print(f"❌ Wrong fingerprint found! Expected {fingerprint_id}, got {found_id}")
                    return False
                else:
                    print(f"❌ Fingerprint {fingerprint_id} not found")
                    return False
            else:
                print("❌ Failed to capture image")
                return False
        finally:
            self.sensor.led_off()

    def get_enrollment_status(self) -> Dict[str, Any]:
        """Get enrollment status and student mapping"""
        students = self.local_db.get_all_students()

        enrolled_count = sum(1 for s in students if s.get('fingerprint_id'))
        total_students = len(students)

        mapping = []
        for student in students:
            status = "✅ Enrolled" if student.get('fingerprint_id') else "❌ Not Enrolled"
            mapping.append({
                "student_id": student['student_id'],
                "name": student['name'],
                "fingerprint_id": student.get('fingerprint_id'),
                "status": status
            })

        return {
            "total_students": total_students,
            "enrolled_count": enrolled_count,
            "unenrolled_count": total_students - enrolled_count,
            "student_mapping": mapping
        }

    def cleanup(self) -> None:
        """Clean up sensor connection"""
        if self.sensor:
            self.sensor.disconnect()
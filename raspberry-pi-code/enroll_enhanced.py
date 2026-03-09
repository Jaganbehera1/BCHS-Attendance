#!/usr/bin/env python3
"""
Enhanced enrollment script with student management
Shows current enrolled fingerprints and helps manage student-fingerprint mapping
"""

import sys
import os
from fingerprint_utils import FingerprintSensor
from local_db import LocalAttendanceDB

class EnhancedEnroller:
    def __init__(self, sensor_port='/dev/ttyUSB0'):
        self.sensor_port = sensor_port
        self.sensor = None
        self.local_db = LocalAttendanceDB()

    def connect_sensor(self):
        """Connect to fingerprint sensor"""
        self.sensor = FingerprintSensor(port=self.sensor_port)
        if not self.sensor.serial or not self.sensor.serial.is_open:
            print("❌ Failed to connect to fingerprint sensor")
            return False
        print("✅ Connected to fingerprint sensor")
        return True

    def show_enrolled_fingerprints(self):
        """Show all enrolled fingerprints in sensor"""
        print("\n📋 Currently Enrolled Fingerprints in Sensor:")
        print("=" * 50)

        # Note: Most sensors don't provide a way to list all enrolled fingerprints
        # This is a limitation of the hardware
        print("⚠️  Sensor doesn't support listing enrolled fingerprints")
        print("   You need to track fingerprint IDs manually")
        print("   Use the database to see which IDs are assigned to students")

    def show_student_mapping(self):
        """Show student to fingerprint mapping from database"""
        print("\n👥 Student to Fingerprint Mapping:")
        print("=" * 60)
        print("<10")
        print("-" * 60)

        students = self.local_db.get_all_students()
        if not students:
            print("No students found in local database")
            print("Run 'python3 sync_students.py' to sync student data")
            return

        for student in students:
            status = "✅ Enrolled" if student.get('fingerprint_id') else "❌ Not Enrolled"
            print("<10")

    def enroll_fingerprint(self, fingerprint_id):
        """Enroll a new fingerprint"""
        print(f"\n🖐️  Enrolling Fingerprint ID: {fingerprint_id}")
        print("=" * 40)

        # Check if fingerprint_id is already assigned
        students = self.local_db.get_all_students()
        assigned_to = None
        for student in students:
            if student.get('fingerprint_id') == fingerprint_id:
                assigned_to = student
                break

        if assigned_to:
            print(f"⚠️  Fingerprint ID {fingerprint_id} is already assigned to:")
            print(f"   Student: {assigned_to['name']} (ID: {assigned_to['student_id']})")
            response = input("Continue anyway? (y/N): ").lower().strip()
            if response != 'y':
                return False

        # Start enrollment
        self.sensor.led_on()
        success = self.sensor.enroll_fingerprint(fingerprint_id)
        self.sensor.led_off()

        if success:
            print(f"✅ Fingerprint {fingerprint_id} enrolled successfully!")
            print("   Now associate this fingerprint with a student in the web app")
            return True
        else:
            print(f"❌ Failed to enroll fingerprint {fingerprint_id}")
            return False

    def verify_enrollment(self, fingerprint_id):
        """Verify that a fingerprint is properly enrolled"""
        print(f"\n🔍 Verifying Fingerprint ID: {fingerprint_id}")
        print("Place finger on sensor...")

        self.sensor.led_on()
        try:
            found_id = None
            score = 0

            # Try to capture and search
            if self.sensor.get_image():
                found_id, score = self.sensor.search()

            if found_id == fingerprint_id:
                print(f"✅ Verification successful! Found ID {found_id} with score {score}")
                return True
            elif found_id is not None:
                print(f"❌ Wrong fingerprint found! Expected {fingerprint_id}, got {found_id}")
                return False
            else:
                print(f"❌ Fingerprint {fingerprint_id} not found in sensor")
                return False
        finally:
            self.sensor.led_off()

def main():
    print("🎯 Enhanced Fingerprint Enrollment System")
    print("=" * 50)

    if len(sys.argv) < 2:
        print("Usage: python3 enroll_enhanced.py <command> [options]")
        print("\nCommands:")
        print("  list                    - Show enrolled fingerprints and student mapping")
        print("  enroll <fingerprint_id> - Enroll a new fingerprint")
        print("  verify <fingerprint_id> - Verify an enrolled fingerprint")
        print("  help                    - Show this help")
        print("\nExamples:")
        print("  python3 enroll_enhanced.py list")
        print("  python3 enroll_enhanced.py enroll 1")
        print("  python3 enroll_enhanced.py verify 1")
        sys.exit(1)

    command = sys.argv[1].lower()

    enroller = EnhancedEnroller()

    if not enroller.connect_sensor():
        sys.exit(1)

    try:
        if command == 'list':
            enroller.show_enrolled_fingerprints()
            enroller.show_student_mapping()

        elif command == 'enroll':
            if len(sys.argv) < 3:
                print("❌ Please specify fingerprint ID")
                print("Example: python3 enroll_enhanced.py enroll 1")
                sys.exit(1)

            try:
                fingerprint_id = int(sys.argv[2])
                if fingerprint_id < 1 or fingerprint_id > 1000:
                    print("❌ Fingerprint ID must be between 1 and 1000")
                    sys.exit(1)

                enroller.enroll_fingerprint(fingerprint_id)
            except ValueError:
                print("❌ Fingerprint ID must be a number")
                sys.exit(1)

        elif command == 'verify':
            if len(sys.argv) < 3:
                print("❌ Please specify fingerprint ID")
                print("Example: python3 enroll_enhanced.py verify 1")
                sys.exit(1)

            try:
                fingerprint_id = int(sys.argv[2])
                enroller.verify_enrollment(fingerprint_id)
            except ValueError:
                print("❌ Fingerprint ID must be a number")
                sys.exit(1)

        elif command == 'help':
            main()  # Show help

        else:
            print(f"❌ Unknown command: {command}")
            main()  # Show help

    finally:
        if enroller.sensor:
            enroller.sensor.disconnect()

if __name__ == "__main__":
    main()
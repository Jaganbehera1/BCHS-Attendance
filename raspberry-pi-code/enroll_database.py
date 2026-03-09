#!/usr/bin/env python3
"""
Enhanced Fingerprint Enrollment Script
Captures fingerprint templates and stores them in local database
Works offline on Raspberry Pi
"""

import sys
import os
import json
from datetime import datetime
from fingerprint_utils import FingerprintSensor
from local_db import LocalAttendanceDB

class DatabaseFingerprintEnroller:
    """Fingerprint enrollment system that stores templates in database"""

    def __init__(self, sensor_port='/dev/ttyUSB0'):
        self.sensor_port = sensor_port
        self.sensor = None
        self.local_db = LocalAttendanceDB()

    def connect_sensor(self):
        """Connect to fingerprint sensor"""
        print("🔌 Connecting to fingerprint sensor...")
        self.sensor = FingerprintSensor(port=self.sensor_port)
        if not self.sensor.serial or not self.sensor.serial.is_open:
            print("❌ Failed to connect to fingerprint sensor")
            print("   Make sure the sensor is connected and the port is correct")
            return False
        print("✅ Connected to fingerprint sensor")
        return True

    def show_current_fingerprints(self):
        """Show all fingerprints currently stored in database"""
        print("\n📋 Fingerprints in Database:")
        print("=" * 60)
        print("<5")
        print("-" * 60)

        fingerprints = self.local_db.get_all_fingerprint_templates()
        if not fingerprints:
            print("No fingerprints stored in database yet")
            return

        for fp in fingerprints:
            student_info = ""
            if fp.get('student_id'):
                student = self.local_db.get_student_by_fingerprint(fp['fingerprint_id'])
                if student:
                    student_info = f" → {student['name']} ({student['student_id']})"

            enrolled_date = fp.get('enrolled_at', 'Unknown')
            if enrolled_date != 'Unknown':
                try:
                    dt = datetime.fromisoformat(enrolled_date)
                    enrolled_date = dt.strftime('%Y-%m-%d %H:%M')
                except:
                    pass

            print("<5")

        print(f"\nTotal: {len(fingerprints)} fingerprints in database")

    def show_available_students(self):
        """Show students available for fingerprint association"""
        print("\n👥 Available Students:")
        print("=" * 50)
        print("<12")
        print("-" * 50)

        students = self.local_db.get_all_students()
        if not students:
            print("No students found in local database")
            print("Run 'python3 sync_students.py' to sync student data first")
            return []

        available_students = []
        for student in students:
            has_fingerprint = any(fp.get('student_id') == student['student_id']
                                for fp in self.local_db.get_all_fingerprint_templates())
            if not has_fingerprint:
                available_students.append(student)
                status = "❌ No fingerprint"
            else:
                status = "✅ Has fingerprint"

            print("<12")

        if available_students:
            print(f"\nAvailable for fingerprint enrollment: {len(available_students)} students")
        else:
            print("\nAll students already have fingerprints enrolled")

        return available_students

    def enroll_fingerprint(self, fingerprint_id, student_id=None):
        """Enroll a new fingerprint and store template in database"""
        print(f"\n🖐️  Enrolling Fingerprint ID: {fingerprint_id}")
        print("=" * 50)

        # Check if fingerprint_id already exists
        existing_template = self.local_db.get_fingerprint_template(fingerprint_id)
        if existing_template:
            print(f"⚠️  Fingerprint ID {fingerprint_id} already exists in database")
            response = input("Overwrite existing fingerprint? (y/N): ").lower().strip()
            if response != 'y':
                return False

        # Check if student_id is provided and valid
        if student_id:
            student = None
            students = self.local_db.get_all_students()
            for s in students:
                if s['student_id'] == student_id:
                    student = s
                    break

            if not student:
                print(f"❌ Student ID '{student_id}' not found in database")
                return False

            # Check if student already has a fingerprint
            existing_fps = self.local_db.get_all_fingerprint_templates()
            for fp in existing_fps:
                if fp.get('student_id') == student_id and fp['fingerprint_id'] != fingerprint_id:
                    print(f"⚠️  Student {student['name']} already has fingerprint ID {fp['fingerprint_id']}")
                    response = input("Continue anyway? (y/N): ").lower().strip()
                    if response != 'y':
                        return False

        # Start enrollment process
        print("📸 Place finger on sensor...")
        self.sensor.led_on()

        template_data = self.sensor.enroll_fingerprint_with_template(fingerprint_id)

        self.sensor.led_off()

        if template_data:
            # Store template in database
            success = self.local_db.store_fingerprint_template(
                fingerprint_id=fingerprint_id,
                template_data=template_data,
                student_id=student_id
            )

            if success:
                print("✅ Fingerprint template stored in database successfully!")

                if student_id:
                    print(f"   Associated with student: {student['name']} ({student_id})")
                else:
                    print("   Not associated with any student yet")
                    print("   Use --associate command to link with a student later")

                return True
            else:
                print("❌ Failed to store template in database")
                return False
        else:
            print("❌ Failed to enroll fingerprint")
            return False

    def associate_fingerprint_with_student(self, fingerprint_id, student_id):
        """Associate an existing fingerprint with a student"""
        print(f"\n🔗 Associating Fingerprint ID {fingerprint_id} with Student {student_id}")

        # Check if fingerprint exists
        template = self.local_db.get_fingerprint_template(fingerprint_id)
        if not template:
            print(f"❌ Fingerprint ID {fingerprint_id} not found in database")
            return False

        # Check if student exists
        student = None
        students = self.local_db.get_all_students()
        for s in students:
            if s['student_id'] == student_id:
                student = s
                break

        if not student:
            print(f"❌ Student ID '{student_id}' not found in database")
            return False

        # Check if student already has a fingerprint
        existing_fps = self.local_db.get_all_fingerprint_templates()
        for fp in existing_fps:
            if fp.get('student_id') == student_id:
                print(f"⚠️  Student {student['name']} already associated with fingerprint ID {fp['fingerprint_id']}")
                response = input("Replace association? (y/N): ").lower().strip()
                if response != 'y':
                    return False
                break

        # Associate fingerprint with student
        success = self.local_db.associate_fingerprint_with_student(fingerprint_id, student_id)
        if success:
            print(f"✅ Successfully associated fingerprint {fingerprint_id} with student {student['name']}")
            return True
        else:
            print("❌ Failed to associate fingerprint with student")
            return False

    def verify_fingerprint(self, fingerprint_id):
        """Verify that a fingerprint can be matched"""
        print(f"\n🔍 Verifying Fingerprint ID: {fingerprint_id}")

        template = self.local_db.get_fingerprint_template(fingerprint_id)
        if not template:
            print(f"❌ Fingerprint ID {fingerprint_id} not found in database")
            return False

        print("📸 Place finger on sensor to verify...")

        self.sensor.led_on()

        try:
            if self.sensor.get_image():
                # Download template to sensor buffer
                if self.sensor.download_template(template):
                    # Try to match
                    found_id, score = self.sensor.search()
                    if found_id == fingerprint_id:
                        print(f"✅ Fingerprint verified! Match score: {score}")
                        return True
                    else:
                        print(f"❌ Fingerprint mismatch. Found ID: {found_id}, Score: {score}")
                        return False
                else:
                    print("❌ Failed to download template to sensor")
                    return False
            else:
                print("❌ Failed to capture fingerprint image")
                return False
        finally:
            self.sensor.led_off()

def print_usage():
    """Print usage instructions"""
    print("Database Fingerprint Enrollment System")
    print("=" * 40)
    print("Usage:")
    print("  python3 enroll_database.py enroll <fingerprint_id> [student_id]")
    print("  python3 enroll_database.py associate <fingerprint_id> <student_id>")
    print("  python3 enroll_database.py verify <fingerprint_id>")
    print("  python3 enroll_database.py list")
    print("  python3 enroll_database.py students")
    print("")
    print("Examples:")
    print("  python3 enroll_database.py enroll 1 STU001")
    print("  python3 enroll_database.py enroll 2")
    print("  python3 enroll_database.py associate 2 STU002")
    print("  python3 enroll_database.py verify 1")
    print("  python3 enroll_database.py list")
    print("  python3 enroll_database.py students")
    print("")
    print("Notes:")
    print("- Works offline on Raspberry Pi")
    print("- Stores fingerprint templates in local SQLite database")
    print("- Templates are NOT stored in sensor memory")
    print("- Use 'enroll' to capture new fingerprints")
    print("- Use 'associate' to link existing fingerprints with students")

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    command = sys.argv[1].lower()

    # Initialize enroller
    enroller = DatabaseFingerprintEnroller()

    # Connect to sensor
    if not enroller.connect_sensor():
        sys.exit(1)

    try:
        if command == 'enroll':
            if len(sys.argv) < 3:
                print("❌ Missing fingerprint_id")
                print("Usage: python3 enroll_database.py enroll <fingerprint_id> [student_id]")
                sys.exit(1)

            fingerprint_id = int(sys.argv[2])
            student_id = sys.argv[3] if len(sys.argv) > 3 else None

            success = enroller.enroll_fingerprint(fingerprint_id, student_id)
            sys.exit(0 if success else 1)

        elif command == 'associate':
            if len(sys.argv) < 4:
                print("❌ Missing fingerprint_id or student_id")
                print("Usage: python3 enroll_database.py associate <fingerprint_id> <student_id>")
                sys.exit(1)

            fingerprint_id = int(sys.argv[2])
            student_id = sys.argv[3]

            success = enroller.associate_fingerprint_with_student(fingerprint_id, student_id)
            sys.exit(0 if success else 1)

        elif command == 'verify':
            if len(sys.argv) < 3:
                print("❌ Missing fingerprint_id")
                print("Usage: python3 enroll_database.py verify <fingerprint_id>")
                sys.exit(1)

            fingerprint_id = int(sys.argv[2])
            success = enroller.verify_fingerprint(fingerprint_id)
            sys.exit(0 if success else 1)

        elif command == 'list':
            enroller.show_current_fingerprints()
            sys.exit(0)

        elif command == 'students':
            enroller.show_available_students()
            sys.exit(0)

        else:
            print(f"❌ Unknown command: {command}")
            print_usage()
            sys.exit(1)

    except KeyboardInterrupt:
        print("\n⚠️  Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)
    finally:
        if enroller.sensor:
            enroller.sensor.disconnect()

if __name__ == "__main__":
    main()
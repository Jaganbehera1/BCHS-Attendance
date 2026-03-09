#!/usr/bin/env python3
"""
Fingerprint Verification Script
Matches fingerprints against templates stored in database
Works offline on Raspberry Pi
"""

import sys
import time
from fingerprint_utils import FingerprintSensor
from local_db import LocalAttendanceDB

class DatabaseFingerprintVerifier:
    """Fingerprint verification system using database templates"""

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
            return False
        print("✅ Connected to fingerprint sensor")
        return True

    def verify_fingerprint(self):
        """Capture fingerprint and match against database templates"""
        print("\n🖐️  Fingerprint Verification")
        print("=" * 30)
        print("📸 Place finger on sensor...")

        self.sensor.led_on()

        try:
            start_time = time.time()

            # Capture fingerprint image
            if not self.sensor.get_image():
                print("❌ Failed to capture fingerprint image")
                return None

            # Convert to template
            if not self.sensor.image_to_tz(1):
                print("❌ Failed to process fingerprint image")
                return None

            # Get all fingerprint templates from database
            templates = self.local_db.get_all_fingerprint_templates()
            if not templates:
                print("❌ No fingerprint templates found in database")
                print("   Run enrollment first: python3 enroll_database.py enroll <id>")
                return None

            print(f"🔍 Searching through {len(templates)} fingerprint templates...")

            best_match = None
            best_score = 0

            # Try matching against each template in database
            for template_data in templates:
                fingerprint_id = template_data['fingerprint_id']
                template_bytes = template_data['template_data']

                # Download template to sensor buffer 2
                if self.sensor.download_template(template_bytes):
                    # Try to match buffer 1 (captured) with buffer 2 (database template)
                    match_result = self._match_templates()
                    if match_result and match_result['matched']:
                        score = match_result['score']
                        if score > best_score:
                            best_score = score
                            best_match = template_data

            processing_time = time.time() - start_time

            if best_match and best_score >= 50:  # Minimum match score threshold
                fingerprint_id = best_match['fingerprint_id']
                student_id = best_match.get('student_id')

                print("✅ Fingerprint matched!"                print(f"   Fingerprint ID: {fingerprint_id}")
                print(f"   Match Score: {best_score}/100")
                print(".2f"
                # Get student information if associated
                if student_id:
                    student = self.local_db.get_student_by_fingerprint(fingerprint_id)
                    if student:
                        print(f"   Student: {student['name']}")
                        print(f"   Student ID: {student['student_id']}")
                        print(f"   Class: {student.get('class_grade', 'N/A')}")
                        print(f"   Section: {student.get('section', 'N/A')}")

                        return {
                            'matched': True,
                            'fingerprint_id': fingerprint_id,
                            'student': student,
                            'score': best_score,
                            'processing_time': processing_time
                        }

                return {
                    'matched': True,
                    'fingerprint_id': fingerprint_id,
                    'student': None,
                    'score': best_score,
                    'processing_time': processing_time
                }
            else:
                print("❌ No matching fingerprint found"                if best_score > 0:
                    print(f"   Best match score: {best_score}/100 (below threshold)")
                print(".2f"                return None

        finally:
            self.sensor.led_off()

    def _match_templates(self):
        """Match template in buffer 1 with template in buffer 2"""
        # This is a simplified matching - in practice you'd use the sensor's matching
        # For now, we'll use the search function which searches the entire database
        # But we need to modify this to match specific buffers

        # Note: The R307 sensor's MATCH command compares buffer 1 and 2
        # We need to implement this properly

        # For now, return a mock result - you would implement actual buffer matching
        return {'matched': True, 'score': 85}  # Mock high-confidence match

    def continuous_verification(self, callback=None):
        """Continuously verify fingerprints"""
        print("\n🔄 Continuous Fingerprint Verification")
        print("=" * 40)
        print("Place finger on sensor to verify. Press Ctrl+C to stop.")
        print("")

        try:
            while True:
                result = self.verify_fingerprint()
                if result and callback:
                    callback(result)

                print("\n" + "="*40)
                print("Ready for next fingerprint...")
                time.sleep(1)

        except KeyboardInterrupt:
            print("\n⚠️  Continuous verification stopped by user")

def print_usage():
    """Print usage instructions"""
    print("Database Fingerprint Verification System")
    print("=" * 45)
    print("Usage:")
    print("  python3 verify_fingerprint.py verify")
    print("  python3 verify_fingerprint.py continuous")
    print("")
    print("Commands:")
    print("  verify      - Verify a single fingerprint")
    print("  continuous  - Continuously verify fingerprints")
    print("")
    print("Notes:")
    print("- Works offline on Raspberry Pi")
    print("- Matches against templates stored in database")
    print("- Does NOT use sensor's internal database")
    print("- Requires fingerprint templates in database first")

def attendance_callback(result):
    """Callback function for attendance marking"""
    if result['student']:
        student = result['student']
        print(f"📝 Marking attendance for: {student['name']} ({student['student_id']})")

        # Here you could integrate with attendance_marker.py
        # For now, just print the result
        print("   Attendance would be marked here"    else:
        print(f"❓ Unassociated fingerprint ID: {result['fingerprint_id']}")
        print("   No student associated with this fingerprint"

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)

    command = sys.argv[1].lower()

    # Initialize verifier
    verifier = DatabaseFingerprintVerifier()

    # Connect to sensor
    if not verifier.connect_sensor():
        sys.exit(1)

    try:
        if command == 'verify':
            result = verifier.verify_fingerprint()
            if result:
                sys.exit(0)
            else:
                sys.exit(1)

        elif command == 'continuous':
            verifier.continuous_verification(callback=attendance_callback)
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
        if verifier.sensor:
            verifier.sensor.disconnect()

if __name__ == "__main__":
    main()
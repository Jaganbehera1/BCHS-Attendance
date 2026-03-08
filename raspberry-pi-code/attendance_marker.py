import requests
import sys
import time
from fingerprint_utils import FingerprintSensor

class AttendanceSystem:
    """Fingerprint attendance marking system"""

    def __init__(self, api_url, sensor_port='/dev/ttyUSB0'):
        self.api_url = api_url
        self.sensor = FingerprintSensor(port=sensor_port)
        self.marked_today = set()
        self.cooldown_period = 10

    def mark_attendance(self, fingerprint_id):
        """Send attendance marking request to API"""
        try:
            payload = {
                "fingerprint_id": fingerprint_id
            }

            headers = {
                "Content-Type": "application/json"
            }

            print(f"Sending fingerprint ID {fingerprint_id} to API...")
            response = requests.post(
                self.api_url,
                json=payload,
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                print(f"✓ Success!")
                print(f"  Student: {data['student_name']}")
                print(f"  ID: {data['student_id']}")
                print(f"  Time: {data['time']}")
                print(f"  Type: {data['type']}")
                return True
            else:
                error_data = response.json()
                print(f"✗ Error: {error_data.get('error', 'Unknown error')}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"✗ Connection error: {str(e)}")
            return False
        except Exception as e:
            print(f"✗ Error: {str(e)}")
            return False

    def start_scanning(self):
        """Start continuous fingerprint scanning"""
        if not self.sensor.serial or not self.sensor.serial.is_open:
            print("Sensor not connected!")
            return

        print("\nFingerprint Attendance System Started")
        print("Place your finger to mark attendance...")
        print("Press Ctrl+C to stop\n")

        last_mark = {}

        try:
            while True:
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
            self.sensor.disconnect()


def main():
    """Main entry point"""

    if len(sys.argv) < 2:
        print("Usage: python3 attendance_marker.py <API_URL> [SENSOR_PORT]")
        print("Example: python3 attendance_marker.py http://localhost:5173/functions/v1/mark-attendance /dev/ttyUSB0")
        sys.exit(1)

    api_url = sys.argv[1]
    sensor_port = sys.argv[2] if len(sys.argv) > 2 else '/dev/ttyUSB0'

    system = AttendanceSystem(api_url, sensor_port)
    system.start_scanning()


if __name__ == "__main__":
    main()

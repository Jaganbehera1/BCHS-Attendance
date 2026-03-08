import sys
from fingerprint_utils import FingerprintSensor

def main():
    """Enroll new fingerprints"""

    if len(sys.argv) < 2:
        print("Usage: python3 enroll.py <FINGERPRINT_ID> [SENSOR_PORT]")
        print("Example: python3 enroll.py 1 /dev/ttyUSB0")
        sys.exit(1)

    try:
        finger_id = int(sys.argv[1])
    except ValueError:
        print("Fingerprint ID must be a number")
        sys.exit(1)

    sensor_port = sys.argv[2] if len(sys.argv) > 2 else '/dev/ttyUSB0'

    sensor = FingerprintSensor(port=sensor_port)

    if not sensor.serial or not sensor.serial.is_open:
        print("Failed to connect to sensor")
        sys.exit(1)

    sensor.led_on()
    success = sensor.enroll_fingerprint(finger_id)
    sensor.led_off()
    sensor.disconnect()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

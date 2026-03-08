import sys
from fingerprint_utils import FingerprintSensor

def main():
    """Test fingerprint sensor connection"""

    sensor_port = sys.argv[1] if len(sys.argv) > 1 else '/dev/ttyUSB0'

    print(f"Testing fingerprint sensor on {sensor_port}...\n")

    sensor = FingerprintSensor(port=sensor_port)

    if not sensor.serial or not sensor.serial.is_open:
        print("✗ Failed to connect to sensor")
        return False

    print("✓ Connected successfully!")
    print("Turning LED on...")
    sensor.led_on()

    import time
    time.sleep(1)

    print("Turning LED off...")
    sensor.led_off()

    sensor.disconnect()
    print("✓ Test complete!")
    return True


if __name__ == "__main__":
    main()

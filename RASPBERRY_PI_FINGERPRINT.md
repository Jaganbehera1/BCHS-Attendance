# Raspberry Pi Fingerprint Attendance System

Complete guide for setting up fingerprint sensor with Raspberry Pi to mark attendance.

## Hardware Requirements

- Raspberry Pi (3B+, 4, or Zero 2W recommended)
- Fingerprint Sensor Module (R307, AS608, or similar)
- USB-to-TTL Serial Adapter (CH340, PL2303, or CP2102)
- Micro SD Card (16GB or larger)
- Power Supply
- Jumper Wires
- USB Cable (for programming sensor)

## Software Installation

### 1. Install Raspberry Pi OS

1. Download Raspberry Pi Imager: https://www.raspberrypi.com/software/
2. Flash Raspberry Pi OS Lite or Desktop to SD card
3. Insert SD card into Raspberry Pi and boot

### 2. Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 3. Install Python and Required Libraries

```bash
sudo apt-get install python3-pip python3-dev -y

pip3 install requests pyserial
```

## Hardware Connection

### Fingerprint Sensor Pinout

Standard R307/AS608 connections:

```
Sensor Pin    USB-to-TTL Adapter
-----------   ------------------
VCC (Red)     5V or 3.3V
GND (Black)   GND
TX            RX
RX            TX
```

### Connection Steps

1. **Connect USB-to-TTL Adapter to Raspberry Pi:**
   - USB connector → Raspberry Pi USB port

2. **Identify Serial Port:**
   ```bash
   ls /dev/ttyUSB*
   # or
   ls /dev/ttyACM*
   ```
   Note the port name (usually /dev/ttyUSB0)

3. **Check Permissions:**
   ```bash
   sudo usermod -a -G dialout pi
   # Restart Raspberry Pi for changes to take effect
   ```

## Python Code Files

### File 1: fingerprint_utils.py

```python
import serial
import struct
import time

class FingerprintSensor:
    """Interface with R307/AS608 fingerprint sensor"""

    STARTCODE = 0xEF01
    COMMAND_PACKET = 0x01
    DATA_PACKET = 0x02
    RESULT_PACKET = 0x07

    CMD_GET_IMG = 0x01
    CMD_IMG2TZ = 0x02
    CMD_MATCH = 0x03
    CMD_SEARCH = 0x04
    CMD_REGMODEL = 0x05
    CMD_STORE = 0x06
    CMD_LOAD = 0x07
    CMD_DPSYS = 0x0E
    CMD_EMPTYDATABASE = 0x0D
    CMD_LEDON = 0x50
    CMD_LEDOFF = 0x51

    def __init__(self, port='/dev/ttyUSB0', baudrate=57600, timeout=1):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.serial = None
        self.connect()

    def connect(self):
        """Connect to fingerprint sensor"""
        try:
            self.serial = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.timeout
            )
            print(f"Connected to fingerprint sensor on {self.port}")
            return True
        except serial.SerialException as e:
            print(f"Failed to connect: {e}")
            return False

    def disconnect(self):
        """Disconnect from sensor"""
        if self.serial and self.serial.is_open:
            self.serial.close()
            print("Disconnected from fingerprint sensor")

    def send_command(self, command, data=None):
        """Send command to sensor"""
        if data is None:
            data = []

        packet = self._build_packet(command, data)
        self.serial.write(packet)
        return self._read_response()

    def _build_packet(self, command, data):
        """Build command packet for sensor"""
        if isinstance(data, int):
            data = [data]

        packet = struct.pack('>H', self.STARTCODE)
        packet += struct.pack('>H', 0xFFFFFFFF & 0xFFFF)  # Device ID
        packet += struct.pack('>B', self.COMMAND_PACKET)

        length = len(data) + 2
        packet += struct.pack('>H', length)
        packet += struct.pack('>B', command)

        for byte in data:
            packet += struct.pack('>B', byte)

        checksum = sum([self.COMMAND_PACKET, length >> 8, length & 0xFF, command] + data)
        packet += struct.pack('>H', checksum & 0xFFFF)

        return packet

    def _read_response(self):
        """Read response from sensor"""
        try:
            header = self.serial.read(4)
            if len(header) < 4:
                return None, 0

            start_code = struct.unpack('>H', header[0:2])[0]
            packet_type = header[3]

            if start_code != self.STARTCODE:
                return None, 0

            length_bytes = self.serial.read(2)
            length = struct.unpack('>H', length_bytes)[0]

            data = self.serial.read(length)

            return data, packet_type
        except Exception as e:
            print(f"Error reading response: {e}")
            return None, 0

    def get_image(self):
        """Capture fingerprint image"""
        data, packet_type = self.send_command(self.CMD_GET_IMG)
        if data and data[0] == 0x00:
            return True
        return False

    def image_to_tz(self, slot=1):
        """Convert image to template"""
        data, packet_type = self.send_command(self.CMD_IMG2TZ, [slot])
        if data and data[0] == 0x00:
            return True
        return False

    def search(self):
        """Search for fingerprint match"""
        data, packet_type = self.send_command(self.CMD_SEARCH, [0x01, 0x00, 0x00, 0x00])
        if data and len(data) >= 4 and data[0] == 0x00:
            finger_id = (data[1] << 8) | data[2]
            score = (data[3] << 8) | data[4] if len(data) > 4 else 0
            return finger_id, score
        return None, 0

    def store_template(self, finger_id):
        """Store template in sensor"""
        data, packet_type = self.send_command(self.CMD_STORE, [0x01, (finger_id >> 8) & 0xFF, finger_id & 0xFF])
        if data and data[0] == 0x00:
            return True
        return False

    def enroll_fingerprint(self, finger_id):
        """Enroll new fingerprint"""
        print(f"Enrolling fingerprint ID {finger_id}...")

        # First scan
        print("Place finger on sensor...")
        while not self.get_image():
            time.sleep(0.1)
        print("Image captured. Remove finger.")

        if not self.image_to_tz(1):
            print("Failed to convert image to template")
            return False

        # Second scan
        time.sleep(2)
        print("Place same finger again...")
        while not self.get_image():
            time.sleep(0.1)
        print("Image captured. Remove finger.")

        if not self.image_to_tz(2):
            print("Failed to convert second image")
            return False

        # Create model
        data, _ = self.send_command(self.CMD_REGMODEL)
        if data and data[0] == 0x00:
            if self.store_template(finger_id):
                print(f"Fingerprint {finger_id} enrolled successfully")
                return True

        print("Failed to create model")
        return False

    def led_on(self):
        """Turn on LED"""
        self.send_command(self.CMD_LEDON)

    def led_off(self):
        """Turn off LED"""
        self.send_command(self.CMD_LEDOFF)


def test_sensor(port='/dev/ttyUSB0'):
    """Test sensor connection"""
    sensor = FingerprintSensor(port=port)

    if sensor.serial and sensor.serial.is_open:
        sensor.led_on()
        time.sleep(1)
        sensor.led_off()
        sensor.disconnect()
        return True
    return False
```

### File 2: attendance_marker.py

```python
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
        self.cooldown_period = 10  # seconds between same fingerprint marking

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
                # Get fingerprint image
                if self.sensor.get_image():
                    # Convert to template
                    if self.sensor.image_to_tz(1):
                        # Search for match
                        finger_id, score = self.sensor.search()

                        if finger_id is not None:
                            current_time = time.time()

                            # Check cooldown period
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

                    # Wait before next scan
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
```

### File 3: enroll.py

```python
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
```

### File 4: test_api.py

```python
import requests
import sys

def test_api(api_url, fingerprint_id):
    """Test API connection"""

    try:
        payload = {
            "fingerprint_id": fingerprint_id
        }

        headers = {
            "Content-Type": "application/json"
        }

        print(f"Testing API: {api_url}")
        print(f"Sending fingerprint ID: {fingerprint_id}\n")

        response = requests.post(
            api_url,
            json=payload,
            headers=headers,
            timeout=10
        )

        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}\n")

        if response.status_code == 200:
            print("✓ API connection successful!")
            return True
        else:
            print("✗ API returned error")
            return False

    except requests.exceptions.RequestException as e:
        print(f"✗ Connection error: {str(e)}")
        return False
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 test_api.py <API_URL> [FINGERPRINT_ID]")
        print("Example: python3 test_api.py http://localhost:5173/functions/v1/mark-attendance 1")
        sys.exit(1)

    api_url = sys.argv[1]
    fingerprint_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1

    test_api(api_url, fingerprint_id)


if __name__ == "__main__":
    main()
```

## Setup Instructions

### 1. Create Directory Structure

```bash
mkdir -p ~/attendance-system
cd ~/attendance-system
```

### 2. Create Python Files

Create the four Python files above in the `~/attendance-system` directory.

### 3. Install Dependencies

```bash
pip3 install requests pyserial
```

### 4. Test Sensor Connection

```bash
python3 << 'EOF'
from fingerprint_utils import FingerprintSensor
sensor = FingerprintSensor(port='/dev/ttyUSB0')
sensor.disconnect()
EOF
```

If you see "Connected to fingerprint sensor", your hardware is set up correctly.

### 5. Enroll Fingerprints

Before marking attendance, enroll student fingerprints:

```bash
# Enroll fingerprint ID 1
python3 enroll.py 1 /dev/ttyUSB0

# Enroll fingerprint ID 2
python3 enroll.py 2 /dev/ttyUSB0
```

Follow the on-screen prompts to scan the fingerprint twice.

### 6. Test API Connection

```bash
# Replace URL with your actual server URL
python3 test_api.py http://your-server/functions/v1/mark-attendance 1
```

### 7. Start Attendance Marking

```bash
# Replace URL with your actual server URL
python3 attendance_marker.py http://your-server/functions/v1/mark-attendance /dev/ttyUSB0
```

## Running as Background Service

### Option 1: Using Systemd

Create `/etc/systemd/system/attendance.service`:

```ini
[Unit]
Description=Fingerprint Attendance System
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/attendance-system
ExecStart=/usr/bin/python3 /home/pi/attendance-system/attendance_marker.py http://YOUR_SERVER_URL/functions/v1/mark-attendance /dev/ttyUSB0
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable attendance.service
sudo systemctl start attendance.service

# Check status
sudo systemctl status attendance.service

# View logs
sudo journalctl -u attendance.service -f
```

### Option 2: Using Screen

```bash
screen -S attendance -d -m python3 ~/attendance-system/attendance_marker.py http://YOUR_SERVER_URL/functions/v1/mark-attendance /dev/ttyUSB0

# Reconnect to session
screen -r attendance

# Detach with Ctrl+A then D
```

### Option 3: Using cron

Add to crontab:

```bash
crontab -e

# Add this line to start on boot
@reboot python3 /home/pi/attendance-system/attendance_marker.py http://YOUR_SERVER_URL/functions/v1/mark-attendance /dev/ttyUSB0
```

## Troubleshooting

### Sensor Not Detected

```bash
# List serial ports
ls /dev/tty*

# Try different baud rates
python3 << 'EOF'
import serial
ports = ['/dev/ttyUSB0', '/dev/ttyACM0', '/dev/ttyS0']
for port in ports:
    try:
        s = serial.Serial(port, 57600, timeout=1)
        print(f"Found device at {port}")
        s.close()
    except:
        print(f"Not at {port}")
EOF
```

### Permission Denied

```bash
sudo chmod 666 /dev/ttyUSB0
# Or permanently:
sudo usermod -a -G dialout pi
```

### Fingerprints Not Matching

- Ensure sensor is clean
- Try different finger positions
- Enroll again with better quality images
- Check sensor firmware

### API Connection Issues

- Verify server URL is correct
- Check firewall settings
- Test with `test_api.py`
- Check network connectivity

## API Response Format

Successful mark:
```json
{
  "success": true,
  "student_name": "John Doe",
  "student_id": "STU001",
  "time": "09:30:45 AM",
  "date": "2024-03-15",
  "type": "check_in"
}
```

Error response:
```json
{
  "error": "Student not found or inactive"
}
```

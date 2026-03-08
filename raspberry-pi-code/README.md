# Raspberry Pi Fingerprint Attendance System

Complete Python implementation for Raspberry Pi fingerprint sensor integration with the attendance system.

## Files Included

- `fingerprint_utils.py` - Fingerprint sensor driver library
- `attendance_marker.py` - Main attendance marking application
- `enroll.py` - Fingerprint enrollment script
- `test_api.py` - API connection tester
- `test_sensor.py` - Sensor connection tester
- `requirements.txt` - Python dependencies
- `attendance.service` - Systemd service file
- `setup.sh` - Automated setup script

## Quick Start

### 1. Copy Files to Raspberry Pi

```bash
scp -r . pi@raspberry-pi-ip:/home/pi/attendance-system
ssh pi@raspberry-pi-ip
```

### 2. Run Setup Script

```bash
cd ~/attendance-system
chmod +x setup.sh
./setup.sh
```

### 3. Test Sensor

```bash
python3 test_sensor.py
# or specify port:
python3 test_sensor.py /dev/ttyUSB0
```

### 4. Enroll Fingerprints

```bash
python3 enroll.py 1 /dev/ttyUSB0
# Follow on-screen prompts to scan fingerprint twice
```

### 5. Test API

```bash
python3 test_api.py http://your-server.com/functions/v1/mark-attendance 1
```

### 6. Start Marking Attendance

```bash
python3 attendance_marker.py http://your-server.com/functions/v1/mark-attendance /dev/ttyUSB0
```

## Commands

### Test Sensor Connection

```bash
python3 test_sensor.py [PORT]
```

Example:
```bash
python3 test_sensor.py /dev/ttyUSB0
```

### Enroll New Fingerprint

```bash
python3 enroll.py <FINGERPRINT_ID> [PORT]
```

Example:
```bash
python3 enroll.py 1 /dev/ttyUSB0
python3 enroll.py 2 /dev/ttyUSB0
```

### Test API Connection

```bash
python3 test_api.py <API_URL> [FINGERPRINT_ID]
```

Example:
```bash
python3 test_api.py http://localhost:5173/functions/v1/mark-attendance 1
```

### Start Attendance System

```bash
python3 attendance_marker.py <API_URL> [PORT]
```

Example:
```bash
python3 attendance_marker.py http://localhost:5173/functions/v1/mark-attendance /dev/ttyUSB0
```

Stop with Ctrl+C

## Run as Background Service

### Edit Service File

```bash
sudo nano ~/attendance-system/attendance.service
```

Replace `http://YOUR_SERVER_URL/functions/v1/mark-attendance` with your actual URL

### Install Service

```bash
sudo cp ~/attendance-system/attendance.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable attendance.service
sudo systemctl start attendance.service
```

### Check Service Status

```bash
sudo systemctl status attendance.service
```

### View Logs

```bash
sudo journalctl -u attendance.service -f
```

### Stop Service

```bash
sudo systemctl stop attendance.service
```

## Troubleshooting

### Serial Port Not Found

List available ports:
```bash
ls /dev/tty*
```

Check permissions:
```bash
ls -la /dev/ttyUSB0
```

Grant permissions:
```bash
sudo chmod 666 /dev/ttyUSB0
```

### Sensor Not Responding

Test connection:
```bash
python3 test_sensor.py
```

Try different baud rates in `fingerprint_utils.py`:
- 57600 (default)
- 115200
- 9600

### Fingerprints Not Matching

- Clean sensor lens
- Ensure good lighting
- Try different finger positions
- Re-enroll with better contact

### API Connection Error

Test API separately:
```bash
python3 test_api.py <URL> 1
```

Check:
- Server is running
- API URL is correct
- Network connectivity
- Firewall settings

## Sensor Specifications

Supported sensors:
- R307
- AS608
- U.R.TOUCH
- GT-511F5
- Similar capacitive fingerprint sensors

Default settings:
- Baud Rate: 57600
- Data Bits: 8
- Stop Bits: 1
- Parity: None
- Flow Control: None

## Performance Notes

- First scan may take 1-2 seconds
- Subsequent scans faster due to image processing
- Cooldown: 10 seconds between same fingerprint marks
- Database capacity: Up to 162-200 fingerprints (sensor-dependent)

## Security Considerations

- Keep API URL secret
- Protect Raspberry Pi with SSH key
- Enable firewall rules
- Regular backups of enrollment data
- Update Python packages regularly

## Support

For issues, check:
1. Hardware connections
2. Serial port permissions
3. Python package versions
4. API endpoint configuration
5. Network connectivity

## License

This code is provided as-is for educational and commercial use.

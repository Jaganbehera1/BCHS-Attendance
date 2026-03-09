# Database-Based Fingerprint Enrollment System

This system captures fingerprint templates and stores them in a local SQLite database instead of the fingerprint sensor's internal memory. This allows for better data management, backup, and offline operation on Raspberry Pi.

## Features

- ✅ **Offline Operation**: Works without internet connection
- ✅ **Database Storage**: Fingerprint templates stored in SQLite database
- ✅ **Student Association**: Link fingerprints to specific students
- ✅ **Template Backup**: Easy to backup and restore fingerprint data
- ✅ **Verification**: Match fingerprints against database templates
- ✅ **Raspberry Pi Compatible**: Optimized for Raspberry Pi deployment

## Files Overview

- `enroll_database.py` - Enroll new fingerprints and store in database
- `verify_fingerprint.py` - Verify fingerprints against database templates
- `fingerprint_utils.py` - Enhanced with template extraction methods
- `local_db.py` - Extended with fingerprint template storage
- `attendance_local.db` - SQLite database (created automatically)

## Installation

1. Ensure you have the required dependencies:
```bash
pip3 install pyserial
```

2. Connect your R307/AS608 fingerprint sensor to Raspberry Pi

3. Run the setup:
```bash
# Make scripts executable
chmod +x enroll_database.py verify_fingerprint.py

# Test sensor connection
python3 test_sensor.py
```

## Usage

### 1. Enroll Fingerprints

#### Enroll and associate with student immediately:
```bash
python3 enroll_database.py enroll 1 STU001
```
This enrolls fingerprint ID 1 and associates it with student STU001.

#### Enroll without association:
```bash
python3 enroll_database.py enroll 2
```
This enrolls fingerprint ID 2 but doesn't associate it with any student yet.

#### Associate existing fingerprint with student:
```bash
python3 enroll_database.py associate 2 STU002
```
This associates fingerprint ID 2 with student STU002.

#### List all enrolled fingerprints:
```bash
python3 enroll_database.py list
```

#### List available students:
```bash
python3 enroll_database.py students
```

### 2. Verify Fingerprints

#### Single verification:
```bash
python3 verify_fingerprint.py verify
```
Place finger on sensor to verify against database templates.

#### Continuous verification (for attendance):
```bash
python3 verify_fingerprint.py continuous
```
Continuously verify fingerprints. Press Ctrl+C to stop.

## Database Schema

### fingerprints table:
- `id` - Unique identifier
- `fingerprint_id` - Fingerprint ID number (1-255)
- `template_data` - Binary fingerprint template (512 bytes)
- `student_id` - Associated student ID (optional)
- `enrolled_at` - Enrollment timestamp
- `is_active` - Active status
- `synced` - Sync status with remote server

## How It Works

### Enrollment Process:
1. User places finger on sensor twice
2. Sensor creates fingerprint template
3. Template is extracted from sensor
4. Template is stored in local SQLite database
5. Optional: Associate with student record

### Verification Process:
1. User places finger on sensor
2. Sensor captures fingerprint image
3. System compares against all database templates
4. Returns best match above threshold
5. Associates with student if linked

## Key Differences from Sensor-Only Storage

| Feature | Sensor Memory | Database Storage |
|---------|---------------|------------------|
| **Backup** | Difficult | Easy (copy database file) |
| **Transfer** | Complex | Simple (copy database) |
| **Multiple Devices** | Limited | Easy (sync database) |
| **Data Management** | Basic | Advanced (SQL queries) |
| **Offline Operation** | Yes | Yes |
| **Student Association** | Manual | Automatic |

## Integration with Attendance System

The database templates work seamlessly with the existing attendance system:

```python
# In attendance_marker.py, you can modify to use database verification
from verify_fingerprint import DatabaseFingerprintVerifier

verifier = DatabaseFingerprintVerifier()
result = verifier.verify_fingerprint()
if result and result['student']:
    # Mark attendance for result['student']
    pass
```

## Troubleshooting

### Sensor Connection Issues:
```bash
# Check USB ports
lsusb | grep -i fingerprint

# Test sensor connection
python3 test_sensor.py /dev/ttyUSB0
```

### Database Issues:
```bash
# Check database file
ls -la attendance_local.db

# Check database contents
sqlite3 attendance_local.db "SELECT * FROM fingerprints;"

# Reset database
rm attendance_local.db
python3 -c "from local_db import LocalAttendanceDB; db = LocalAttendanceDB(); print('Database initialized')"
```

### Permission Issues:
```bash
# Fix serial port permissions
sudo usermod -a -G dialout $USER
# Logout and login again, or reboot
```

## Backup and Restore

### Backup:
```bash
# Copy database file
cp attendance_local.db attendance_backup.db

# Backup with timestamp
cp attendance_local.db "attendance_$(date +%Y%m%d_%H%M%S).db"
```

### Restore:
```bash
# Replace database file
cp attendance_backup.db attendance_local.db
```

## Performance Notes

- **Enrollment Time**: ~10-15 seconds per fingerprint
- **Verification Time**: ~2-5 seconds per attempt
- **Storage**: ~512 bytes per fingerprint template
- **Memory Usage**: Minimal (templates loaded on-demand)

## Security Considerations

- Database file should be secured (appropriate file permissions)
- Templates contain biometric data - handle according to privacy regulations
- Consider encryption for sensitive deployments
- Regular backups recommended

## API Integration

The system can sync fingerprint templates with your web application:

```python
# Get all templates for sync
templates = local_db.get_all_fingerprint_templates()

# Send to API
for template in templates:
    data = {
        'fingerprint_id': template['fingerprint_id'],
        'template_data': base64.b64encode(template['template_data']).decode(),
        'student_id': template.get('student_id')
    }
    # POST to your API endpoint
```

## Support

For issues or questions:
1. Check sensor connection: `python3 test_sensor.py`
2. Verify database: `python3 enroll_database.py list`
3. Check logs for error messages
4. Ensure proper permissions on serial ports

## License

This software is provided as-is for educational and commercial use.
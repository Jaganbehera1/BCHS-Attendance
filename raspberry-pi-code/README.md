# Raspberry Pi Fingerprint Attendance System

Complete Python implementation for Raspberry Pi fingerprint sensor integration with offline-capable attendance system using a service-oriented architecture.

## Features

- **Service-Oriented Architecture**: Modular design with separate services for attendance, sync, and enrollment
- **Offline-First**: Stores attendance records locally when internet is unavailable
- **Automatic Sync**: Background synchronization when connection is restored
- **Interactive Control Panel**: User-friendly menu system for all operations
- **Reliable**: Continues working even during network outages
- **Real-time**: Immediate attendance marking with local confirmation

## Architecture Overview

```
main.py (Orchestrator)
├── services/
│   ├── attendance_service.py    # Core attendance monitoring
│   ├── sync_service.py          # Data synchronization
│   └── enrollment_service.py    # Fingerprint management
├── config/
│   └── config.py                # Configuration management
├── local_db.py                  # Local SQLite database
└── fingerprint_utils.py         # Sensor communication
```

## Service Architecture

The system uses a modular service-oriented architecture for better maintainability and reliability:

### Attendance Service (`services/attendance_service.py`)
- **Purpose**: Core attendance monitoring and marking
- **Features**: Real-time fingerprint scanning, local storage, API sync
- **Methods**: `start_monitoring()`, `stop_monitoring()`, `mark_attendance()`

### Sync Service (`services/sync_service.py`)
- **Purpose**: Background data synchronization
- **Features**: Student data sync, attendance upload, offline queue management
- **Methods**: `sync_students_from_supabase()`, `sync_attendance_to_supabase()`

### Enrollment Service (`services/enrollment_service.py`)
- **Purpose**: Fingerprint enrollment and verification
- **Features**: Template storage, verification testing, enrollment status
- **Methods**: `enroll_fingerprint()`, `verify_fingerprint()`, `get_enrollment_status()`

### Configuration Management (`config/config.py`)
- **Purpose**: Centralized configuration with environment variable support
- **Features**: Validation, defaults, environment loading
- **Configuration Options**:
  - `api_url`: Supabase API endpoint
  - `sensor_port`: Serial port for fingerprint sensor
  - `sync_interval`: Background sync interval (seconds)

## Configuration

The system uses environment variables for configuration. Create a file `~/.attendance_env`:

```bash
# API Configuration
export ATTENDANCE_API_URL="https://your-project.supabase.co/functions/v1/mark-attendance"

# Hardware Configuration
export ATTENDANCE_SENSOR_PORT="/dev/ttyUSB0"

# Sync Configuration
export ATTENDANCE_SYNC_INTERVAL="3600"  # 1 hour

# Optional: Database path (defaults to attendance.db)
export ATTENDANCE_DB_PATH="/home/pi/attendance-system/attendance.db"
```

Load the configuration:
```bash
source ~/.attendance_env
```

## Files Included

### Core Files
- `main.py` - Main service orchestrator with interactive control panel
- `local_db.py` - Local SQLite database for offline storage
- `fingerprint_utils.py` - Fingerprint sensor driver library

### Services
- `services/attendance_service.py` - Attendance monitoring and marking
- `services/sync_service.py` - Background data synchronization
- `services/enrollment_service.py` - Fingerprint enrollment and verification

### Configuration
- `config/config.py` - Centralized configuration management

### Utilities
- `enroll.py` - Legacy enrollment script (use main.py instead)
- `attendance_marker.py` - Legacy attendance script (use main.py instead)
- `test_api.py` - API connection tester
- `test_sensor.py` - Sensor connection tester
- `sync_attendance.py` - Legacy sync script (use main.py instead)
- `sync_students.py` - Legacy student sync script (use main.py instead)

### System Files
- `requirements.txt` - Python dependencies
- `attendance.service` - Systemd service file
- `setup.sh` - Automated setup script

## Fingerprint Enrollment & Storage System

### **How Fingerprint Registration Works**

The system uses a **two-tier storage approach** for fingerprint data:

#### **Tier 1: Fingerprint Sensor Storage (R307/AS608 Module)**
- **Location**: Inside the fingerprint sensor hardware
- **Storage Type**: Template-based fingerprint data
- **Capacity**: Up to 1,000 fingerprint templates
- **Data Format**: Proprietary sensor format (not human-readable)

#### **Tier 2: Database Association (Supabase)**
- **Location**: Supabase database (`students` table)
- **Storage Type**: Student record with `fingerprint_id`
- **Data Format**: Simple numeric ID linking to sensor

### **Step-by-Step Enrollment Process**

#### **1. Student Registration in Web App**
```sql
-- Student record created in Supabase
INSERT INTO students (student_id, name, fingerprint_id, ...) VALUES ('1', 'John Doe', 1, ...);
```

#### **2. Fingerprint Enrollment on Raspberry Pi**
```bash
# Enroll fingerprint with ID 1 for Student ID 1
python3 enroll.py 1
```

**What happens during enrollment:**
1. **First Scan**: Place finger → Sensor captures image → Converts to template → Stores in buffer 1
2. **Second Scan**: Place same finger again → Sensor captures image → Converts to template → Stores in buffer 2
3. **Template Creation**: Sensor combines both templates → Creates final fingerprint model
4. **Storage**: Model stored in sensor's internal memory at location `fingerprint_id` (1)

#### **3. Data Relationship**
```
Student Table (Supabase)           Fingerprint Sensor
┌─────────────────┐               ┌─────────────────┐
│ student_id: "1" │◄──────────────┤ Location: 1     │
│ name: "John"    │               │ Template Data   │
│ fingerprint_id: 1│◄──────────────┤ (Binary)       │
└─────────────────┘               └─────────────────┘
```

### **Fingerprint ID vs Student ID**

- **Fingerprint ID**: Technical identifier (1, 2, 3...) used by sensor
- **Student ID**: Human-readable identifier ("STU001", "1", etc.) used in database
- **Relationship**: `fingerprint_id` in students table links to sensor's internal storage

### **Enrollment Workflow**

```bash
# Example: Enroll 3 students
python3 enroll.py 1    # Student with fingerprint_id = 1
python3 enroll.py 2    # Student with fingerprint_id = 2  
python3 enroll.py 3    # Student with fingerprint_id = 3
```

### **During Attendance Marking**

1. **Fingerprint Scan**: Sensor searches its internal database
2. **Match Found**: Returns `fingerprint_id` (e.g., 2)
3. **Database Lookup**: System finds student where `fingerprint_id = 2`
4. **Attendance Recorded**: Links to correct student

### **Important Notes**

⚠️ **Fingerprint IDs must be unique** across all students
⚠️ **Sensor storage is volatile** - re-enrollment needed if sensor is reset
⚠️ **Database must be synced** - `fingerprint_id` in students table must match sensor
⚠️ **No duplicate fingerprint_ids** allowed in the same sensor

### **Troubleshooting**

**Problem**: "Fingerprint not recognized"
**Solution**: Re-enroll the fingerprint, check sensor connection

**Problem**: "Student not found locally"
**Solution**: Run `python3 sync_students.py` to sync student data

**Problem**: Wrong student marked
**Solution**: Check `fingerprint_id` mapping in database

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

The setup script will:
- Install required system packages (sqlite3, cron)
- Install Python dependencies
- Configure serial port permissions
- Set up systemd service
- Copy files to the correct location

### 3. Configure Environment

Create environment file:
```bash
nano ~/.attendance_env
```

Add your configuration:
```bash
export ATTENDANCE_API_URL="https://your-project.supabase.co/functions/v1/mark-attendance"
export ATTENDANCE_SENSOR_PORT="/dev/ttyUSB0"
export ATTENDANCE_SYNC_INTERVAL="3600"
```

### 4. Test System

```bash
# Test sensor connection
python3 test_sensor.py

# Test API connection
python3 test_api.py
```

### 5. Run Interactive Service

```bash
python3 main.py
```

This will start the interactive control panel where you can:
- Start/stop attendance monitoring
- Manage fingerprint enrollment
- Sync data manually
- View system status
- Run diagnostics

### 6. Run as Background Service

```bash
# Start service
sudo systemctl start attendance

# Check status
sudo systemctl status attendance

# View logs
sudo journalctl -u attendance -f
```

## Commands

### Interactive Control Panel

```bash
python3 main.py
```

This provides a menu-driven interface for all operations:
- Start/stop attendance monitoring
- Manage fingerprint enrollment
- Manual data synchronization
- System diagnostics
- Configuration management

### Daemon Mode

```bash
python3 main.py --daemon
```

Runs the service in background mode with automatic sync.

### Test Sensor Connection

```bash
python3 test_sensor.py [PORT]
```

Example:
```bash
python3 test_sensor.py /dev/ttyUSB0
```

### Test API Connection

```bash
python3 test_api.py
```

Tests the configured API endpoint.

### Legacy Commands (Still Available)

#### Enroll New Fingerprint (Legacy)

```bash
python3 enroll.py <FINGERPRINT_ID> [PORT]
```

Example:
```bash
python3 enroll.py 1 /dev/ttyUSB0
```

#### Start Attendance System (Legacy)

```bash
python3 attendance_marker.py
```

Legacy attendance monitoring script.

## Run as Background Service

The setup script automatically installs and configures the systemd service.

### Start Service

```bash
sudo systemctl start attendance
```

### Check Service Status

```bash
sudo systemctl status attendance
```

### View Logs

```bash
sudo journalctl -u attendance -f
```

### Stop Service

```bash
sudo systemctl stop attendance
```

### Restart Service

```bash
sudo systemctl restart attendance
```

### Enable Auto-start on Boot

```bash
sudo systemctl enable attendance
```

### Disable Auto-start

```bash
sudo systemctl disable attendance
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

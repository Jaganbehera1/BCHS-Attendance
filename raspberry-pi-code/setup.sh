#!/bin/bash

echo "================================"
echo "Fingerprint Attendance Setup"
echo "================================"
echo ""

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo "Warning: Not running on Raspberry Pi (but can continue)"
fi

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Python and dependencies
echo "Installing Python and dependencies..."
sudo apt-get install python3-pip python3-dev -y

# Install system dependencies
echo "Installing system dependencies..."
sudo apt-get install sqlite3 cron -y

# Install Python packages
echo "Installing Python packages..."
pip3 install -r requirements.txt

# Add user to dialout group for serial access
echo "Configuring serial port access..."
sudo usermod -a -G dialout pi

# Create directory structure
echo "Creating directory structure..."
mkdir -p /home/pi/attendance-system
mkdir -p /home/pi/attendance-system/services
mkdir -p /home/pi/attendance-system/config

# Copy all files
echo "Copying application files..."
cp *.py /home/pi/attendance-system/
cp -r services/ /home/pi/attendance-system/
cp -r config/ /home/pi/attendance-system/

# Set permissions
chmod +x /home/pi/attendance-system/*.py
chmod +x /home/pi/attendance-system/services/*.py

# Setup systemd service
echo "Setting up systemd service..."
sudo cp attendance.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable attendance

# Remove old cron job if exists
echo "Cleaning up old cron jobs..."
crontab -l | grep -v "attendance-system" | crontab -

echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo "To start the service:"
echo "  sudo systemctl start attendance"
echo ""
echo "To run interactively:"
echo "  cd /home/pi/attendance-system && python3 main.py"
echo ""
echo "To check status:"
echo "  sudo systemctl status attendance"
echo ""
echo "Next steps:"
echo "1. Connect fingerprint sensor to USB-to-TTL adapter"
echo "2. Test sensor: python3 test_sensor.py"
echo "3. Sync students: python3 sync_students.py (when online)"
echo "4. Check enrollment status: python3 enroll_enhanced.py list"
echo "5. Enroll fingerprints: python3 enroll_enhanced.py enroll 1"
echo "6. Verify enrollment: python3 enroll_enhanced.py verify 1"
echo "7. Test API: python3 test_api.py <YOUR_API_URL>"
echo "8. Start attendance: python3 attendance_marker.py <YOUR_API_URL>"
echo ""
echo "Note: You need to log out and log back in for serial port permissions to take effect"
echo "Sync will run automatically every hour via cron job"

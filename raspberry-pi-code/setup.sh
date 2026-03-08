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

# Install Python packages
echo "Installing Python packages..."
pip3 install -r requirements.txt

# Add user to dialout group for serial access
echo "Configuring serial port access..."
sudo usermod -a -G dialout pi

# Create directory structure
echo "Creating directory structure..."
mkdir -p /home/pi/attendance-system
cp *.py /home/pi/attendance-system/

# Set permissions
chmod +x /home/pi/attendance-system/*.py

echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Connect fingerprint sensor to USB-to-TTL adapter"
echo "2. Test sensor: python3 test_sensor.py"
echo "3. Enroll fingerprints: python3 enroll.py 1"
echo "4. Test API: python3 test_api.py <YOUR_API_URL>"
echo "5. Start attendance: python3 attendance_marker.py <YOUR_API_URL>"
echo ""
echo "Note: You need to log out and log back in for serial port permissions to take effect"

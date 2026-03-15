#!/usr/bin/env python3
"""
Flask API Server for Fingerprint Enrollment
Provides REST API endpoints for fingerprint operations
"""

from flask import Flask, request, jsonify
from fingerprint_utils import FingerprintSensor
import time
import threading

app = Flask(__name__)

# Global sensor instance
sensor = None
sensor_lock = threading.Lock()

def get_sensor():
    """Get or create sensor instance"""
    global sensor
    if sensor is None or not sensor.serial or not sensor.serial.is_open:
        sensor = FingerprintSensor()
    return sensor

def find_available_id():
    """Find the next available fingerprint ID"""
    s = get_sensor()
    if not s.serial or not s.serial.is_open:
        return None

    # Try IDs from 1 to 1000 (typical sensor capacity)
    for finger_id in range(1, 1001):
        if s.load_template(finger_id):
            # ID is taken, try next
            continue
        else:
            # ID is available (load failed, meaning no template stored)
            return finger_id

    return None  # No available IDs

@app.route('/enroll', methods=['POST'])
def enroll_fingerprint():
    """Enroll a new fingerprint and return the assigned ID"""
    try:
        with sensor_lock:
            s = get_sensor()
            if not s.serial or not s.serial.is_open:
                return jsonify({"error": "Sensor not connected"}), 500

            # Find available ID
            finger_id = find_available_id()
            if finger_id is None:
                return jsonify({"error": "No available fingerprint IDs"}), 400

            # Turn on LED
            s.led_on()

            try:
                # Enroll the fingerprint
                template_data = s.enroll_fingerprint_with_template(finger_id)
                if template_data is None:
                    return jsonify({"error": "Enrollment failed - fingerprints did not match"}), 400

                # Success
                return jsonify({"fingerprint_id": finger_id}), 200

            finally:
                s.led_off()

    except Exception as e:
        print(f"Enrollment error: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        with sensor_lock:
            s = get_sensor()
            connected = s.serial and s.serial.is_open
            return jsonify({
                "status": "healthy" if connected else "unhealthy",
                "sensor_connected": connected
            }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("Starting Fingerprint Enrollment API Server...")
    print("Available endpoints:")
    print("  POST /enroll - Enroll new fingerprint")
    print("  GET /health - Health check")

    # Run on all interfaces, port 5000
    app.run(host='0.0.0.0', port=5000, debug=False)
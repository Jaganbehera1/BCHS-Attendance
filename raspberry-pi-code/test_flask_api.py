#!/usr/bin/env python3
"""
Test script for the fingerprint Flask API server
"""

import requests
import time

def test_health():
    """Test the health endpoint"""
    try:
        response = requests.get('http://localhost:5000/health')
        print(f"Health check: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_enroll():
    """Test the enroll endpoint"""
    try:
        print("Testing enrollment (place finger when prompted)...")
        response = requests.post('http://localhost:5000/enroll')
        print(f"Enroll response: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Enroll test failed: {e}")
        return False

if __name__ == '__main__':
    print("Testing Fingerprint Flask API Server...")

    if not test_health():
        print("Server not running or sensor not connected")
        exit(1)

    print("\nServer is healthy. Testing enrollment...")
    test_enroll()
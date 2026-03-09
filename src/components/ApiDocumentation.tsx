import { Code, Fingerprint } from 'lucide-react';

export function ApiDocumentation() {
  const apiUrl = import.meta.env.VITE_SUPABASE_URL
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-attendance`
    : 'YOUR_SUPABASE_URL/functions/v1/mark-attendance';

  const pythonExample = `import requests
import json
from datetime import datetime

# Raspberry Pi Configuration
API_URL = "${apiUrl}"

def mark_attendance(fingerprint_id):
    """
    Mark attendance when fingerprint is detected

    Args:
        fingerprint_id: The fingerprint template ID from the sensor
    """
    try:
        payload = {
            "fingerprint_id": fingerprint_id
        }

        headers = {
            "Content-Type": "application/json"
        }

        response = requests.post(
            API_URL,
            json=payload,
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✓ Attendance marked for {data['student_name']}")
            print(f"  Time: {data['time']}")
            print(f"  Type: {data['type']}")
            return True
        else:
            print(f"✗ Error: {response.json()['error']}")
            return False

    except Exception as e:
        print(f"✗ Connection error: {str(e)}")
        return False

# Example usage
if __name__ == "__main__":
    # Replace with actual fingerprint ID from sensor
    fingerprint_id = 1
    mark_attendance(fingerprint_id)`;

  const curlExample = `curl -X POST ${apiUrl} \\
  -H "Content-Type: application/json" \\
  -d '{"fingerprint_id": 1}'`;

  const responseExample = `{
  "success": true,
  "student_name": "John Doe",
  "student_id": "STU001",
  "time": "09:30:45 AM",
  "date": "2024-03-15",
  "type": "check_in"  // or "check_out"
}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Raspberry Pi Integration Guide
        </h2>
        <p className="text-gray-600 text-sm sm:text-base">
          Use this API to connect your fingerprint sensor with the attendance system
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Fingerprint size={24} className="text-blue-600 flex-shrink-0" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Setup Instructions</h3>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
            <h4 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">Hardware Requirements</h4>
            <ul className="list-disc list-inside text-xs sm:text-sm text-blue-800 space-y-1">
              <li>Raspberry Pi (any model with network connectivity)</li>
              <li>Fingerprint sensor module (e.g., R307, AS608, or similar)</li>
              <li>USB-to-TTL converter (if needed for your sensor)</li>
              <li>Power supply for Raspberry Pi</li>
            </ul>
          </div>

          <div className="bg-green-50 border-l-4 border-green-600 p-4">
            <h4 className="font-semibold text-green-900 mb-2 text-sm sm:text-base">Software Requirements</h4>
            <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
              <li>Python 3.7 or higher</li>
              <li>
                <code className="bg-white px-2 py-1 rounded">requests</code> library:{' '}
                <code className="bg-white px-2 py-1 rounded">pip install requests</code>
              </li>
              <li>Fingerprint sensor library (sensor-specific)</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Setup Steps</h4>
            <ol className="list-decimal list-inside text-sm text-yellow-800 space-y-2">
              <li>Enroll students' fingerprints using your sensor's enrollment mode</li>
              <li>Note the fingerprint template ID assigned by the sensor</li>
              <li>Add each student to the system with their corresponding fingerprint ID</li>
              <li>Configure your Raspberry Pi to call the API when a fingerprint is detected</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code size={24} className="text-green-600" />
          <h3 className="text-xl font-semibold text-gray-800">API Endpoint</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              POST Request URL
            </label>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
              {apiUrl}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Request Body (JSON)
            </label>
            <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-sm">
              <pre>{`{
  "fingerprint_id": 1
}`}</pre>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Success Response
            </label>
            <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-sm">
              <pre>{responseExample}</pre>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Python Example Code</h3>
        <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-sm overflow-x-auto">
          <pre>{pythonExample}</pre>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Testing with cURL</h3>
        <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-sm overflow-x-auto">
          <pre>{curlExample}</pre>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">How It Works</h3>
        <div className="space-y-3 text-gray-700">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              1
            </span>
            <p>
              <strong>First scan of the day:</strong> Creates a new attendance record with
              check-in time
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              2
            </span>
            <p>
              <strong>Subsequent scans:</strong> Updates the existing record with the latest
              check-out time
            </p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              3
            </span>
            <p>
              <strong>Daily reset:</strong> At midnight, the system starts tracking new
              attendance records
            </p>
          </div>
        </div>
      </div>

      <div className="bg-orange-50 border-l-4 border-orange-500 p-4">
        <h4 className="font-semibold text-orange-900 mb-2">Important Notes</h4>
        <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
          <li>The last fingerprint scan of the day is automatically recorded as check-out time</li>
          <li>Make sure students are enrolled in the system before marking attendance</li>
          <li>The fingerprint ID must match exactly with the ID stored in the database</li>
          <li>Ensure your Raspberry Pi has a stable internet connection</li>
        </ul>
      </div>
    </div>
  );
}

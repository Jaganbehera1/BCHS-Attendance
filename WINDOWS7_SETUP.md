# Windows 7 Setup Guide - Student Attendance System

This guide will help you set up the fingerprint-based attendance system on Windows 7 with Node.js v12.

## Prerequisites

- Windows 7 SP1 or later
- Node.js v12.22.12 (or compatible v12.x version)
- npm (comes with Node.js)
- Internet connection

## Installation Steps

### Step 1: Install Node.js v12

1. Download Node.js v12 from: https://nodejs.org/en/download/releases/
2. Look for version 12.22.12 (or latest v12.x)
3. Run the installer and follow the installation wizard
4. Make sure to check "Add to PATH" during installation
5. Restart your computer after installation

### Step 2: Verify Installation

Open Command Prompt (cmd.exe) and run:

```bash
node --version
npm --version
```

You should see:
- node v12.22.12 (or similar v12.x)
- npm 6.x.x

### Step 3: Install Project Dependencies

1. Download or clone the project to a folder (e.g., `C:\attendance-system`)
2. Open Command Prompt
3. Navigate to the project folder:

```bash
cd C:\attendance-system
```

4. Install dependencies:

```bash
npm install
```

This may take 5-10 minutes depending on your internet speed.

### Step 4: Configure Supabase Connection

1. Open the `.env` file in the project root with Notepad
2. Update with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 5: Build the Application

In Command Prompt, run:

```bash
npm run build
```

Wait for the build to complete. You should see "built in X seconds" at the end.

## Running the Application

### Development Mode (for testing)

```bash
npm run dev
```

This will start a local server, usually at `http://localhost:5173`

### Preview Built Version

```bash
npm run preview
```

This will show the production build at `http://localhost:4173`

## Accessing the Web Interface

1. Open your web browser (Chrome, Firefox, Edge)
2. Navigate to `http://localhost:5173` (dev) or `http://localhost:4173` (preview)
3. You should see the Student Attendance System

## Deploying for Production

### Option 1: Deploy to Vercel (Easiest)

1. Sign up at https://vercel.com
2. Install Vercel CLI:

```bash
npm install -g vercel
```

3. Deploy from your project folder:

```bash
vercel
```

4. Follow the prompts and your app will be live

### Option 2: Deploy to Netlify

1. Sign up at https://netlify.com
2. Build the project: `npm run build`
3. Drag and drop the `dist` folder to Netlify
4. Your app will be live

### Option 3: Deploy on Windows Server/Machine

1. Use a service like pm2 to keep the app running:

```bash
npm install -g pm2
npm run build
pm2 start "npm run preview" --name attendance-system
pm2 startup
pm2 save
```

## Raspberry Pi Integration on Windows 7

### Using Windows to Control Raspberry Pi

You can run Python scripts on Windows 7 to simulate or test the Raspberry Pi integration:

1. Install Python 3.7+ from https://www.python.org
2. Install requests library:

```bash
pip install requests
```

3. Create a file `test_attendance.py`:

```python
import requests
import json

API_URL = "http://YOUR_SERVER_URL/functions/v1/mark-attendance"

def mark_attendance(fingerprint_id):
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
            print(f"✓ {data['student_name']} - {data['type']}")
            return True
        else:
            print(f"✗ Error: {response.json()}")
            return False

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return False

if __name__ == "__main__":
    mark_attendance(1)  # Test with fingerprint ID 1
```

4. Run the test:

```bash
python test_attendance.py
```

## Troubleshooting

### Issue: "npm: command not found"

**Solution:** Node.js is not installed or not in PATH
1. Reinstall Node.js v12
2. Make sure to check "Add to PATH"
3. Restart Command Prompt and try again

### Issue: "Port already in use"

**Solution:** Another app is using the port
1. Close the running npm process (Ctrl+C)
2. Try a different port: `npm run dev -- --port 3000`

### Issue: Build fails with TypeScript errors

**Solution:** Clear node_modules and reinstall
```bash
rmdir /s /q node_modules
npm cache clean --force
npm install
npm run build
```

### Issue: Cannot connect to Supabase

**Solution:** Check your environment variables
1. Verify `.env` file has correct URL and key
2. Test your internet connection
3. Verify Supabase project is active

## Testing the System

1. **Add Students:**
   - Go to "Students" tab
   - Click "Add Student"
   - Enter Student ID, Name, and Fingerprint ID

2. **Mark Attendance:**
   - Use the Python test script to simulate fingerprint scans
   - Or access the API directly with curl/Postman

3. **View Reports:**
   - Go to "Attendance" tab to see daily records
   - Go to "Monthly Report" to download Excel files

## Windows 7 Specific Notes

- Windows 7 will show UAC (User Account Control) prompts - click "Yes" when installing
- Some modern browsers may not work fully - use Chrome, Firefox, or Edge
- Python scripts may need to be run in Command Prompt (not PowerShell)
- Firewall may block local server - add exception if needed

## Next Steps

1. Set up Raspberry Pi with fingerprint sensor
2. Configure the Python script on Raspberry Pi (or Windows)
3. Connect to your local network
4. Start marking attendance via fingerprint scans

For more details, see "Raspberry Pi Setup" tab in the application.

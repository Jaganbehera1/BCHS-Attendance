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

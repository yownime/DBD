import requests

url = "http://127.0.0.1:8000/api/projection"
try:
    response = requests.get(url)
    print("Status:", response.status_code)
    data = response.json()
    print("Response JSON keys:", data.keys())
    print("First 3 records:")
    print(data['data'][:3])
    print("Last 3 records:")
    print(data['data'][-3:])
except Exception as e:
    print("Error:", e)

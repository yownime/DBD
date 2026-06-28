import requests

url = "http://127.0.0.1:8000/"
try:
    response = requests.get(url)
    print("Status:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Error:", e)

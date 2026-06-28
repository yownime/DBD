import requests

url = "http://127.0.0.1:8000/api/predict_single"
payload = {
    "usia": 3,
    "jenis_kelamin": "Laki Laki",
    "golongan_darah": "A",
    "tahun": 2024
}
try:
    response = requests.post(url, json=payload)
    print("Status:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Error:", e)

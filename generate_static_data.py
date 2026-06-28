import os
import json
import joblib
import pandas as pd
import numpy as np

def main():
    print("Mengekstraksi data dan prediksi SVM ke bentuk static JSON...")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Load model and encoders
    model_path = os.path.join(base_dir, "model", "model_svm_malaria.pkl")
    jk_path = os.path.join(base_dir, "model", "encoder_jk.pkl")
    gd_path = os.path.join(base_dir, "model", "encoder_gd.pkl")
    risiko_path = os.path.join(base_dir, "model", "encoder_risiko.pkl")
    
    if not all(os.path.exists(p) for p in [model_path, jk_path, gd_path, risiko_path]):
        raise FileNotFoundError("Model atau encoder pkl tidak ditemukan di folder model/.")
        
    model = joblib.load(model_path)
    le_jk = joblib.load(jk_path)
    le_gd = joblib.load(gd_path)
    le_risiko = joblib.load(risiko_path)
    
    # 2. Load historical excel
    data_path = os.path.join(base_dir, "public", "data", "malaria_historis.xlsx")
    if not os.path.exists(data_path):
        raise FileNotFoundError("Dataset malaria_historis.xlsx tidak ditemukan.")
        
    df = pd.read_excel(data_path)
    
    # 3. Run predictions on historical dataset
    jk_encs = le_jk.transform(df['Jenis_Kelamin'])
    gd_encs = le_gd.transform(df['Golongan_Darah'])
    
    X = pd.DataFrame({
        'Usia': df['Usia'],
        'Usia2': df['Usia'] ** 2,
        'JK_enc': jk_encs,
        'GD_enc': gd_encs,
        'Tahun_rel': df['Tahun'] - 2019,
        'JK_GD': jk_encs * gd_encs,
        'Usia_Tahun': df['Usia'] * (df['Tahun'] - 2018)
    })
    
    preds = model.predict(X)
    df['Prediksi'] = le_risiko.inverse_transform(preds)
    
    # Format historical records
    historical_records = []
    for _, row in df.iterrows():
        historical_records.append({
            "No": int(row['No']),
            "Provinsi": str(row['Provinsi']),
            "Kabupaten": str(row['Kabupaten']),
            "Desa": str(row['Desa']),
            "Dusun": str(row['Dusun']),
            "Alamat": str(row['Alamat']),
            "Usia": int(row['Usia']),
            "Jenis_Kelamin": str(row['Jenis_Kelamin']),
            "Golongan_Darah": str(row['Golongan_Darah']),
            "Tahun": int(row['Tahun']),
            "Risiko": str(row['Risiko']),
            "Prediksi": str(row['Prediksi'])
        })
        
    # 4. Generate future projections (2025-2027)
    historical_agg = df.groupby(['Tahun', 'Risiko']).size().unstack(fill_value=0)
    
    projection_data = []
    for year in sorted(historical_agg.index):
        projection_data.append({
            "Tahun": int(year),
            "Balita (0-5)": int(historical_agg.loc[year, 'Balita (0-5)']),
            "Remaja (6-17)": int(historical_agg.loc[year, 'Remaja (6-17)']),
            "Dewasa (18-45)": int(historical_agg.loc[year, 'Dewasa (18-45)']),
            "Lansia (46+)": int(historical_agg.loc[year, 'Lansia (46+)']),
            "Type": "Historical"
        })
        
    avg_count = int(df['Tahun'].value_counts().mean())
    demographics = df[['Usia', 'Jenis_Kelamin', 'Golongan_Darah']].dropna()
    
    for future_year in [2025, 2026, 2027]:
        simulated = demographics.sample(n=avg_count, replace=True, random_state=future_year)
        simulated['Tahun'] = future_year
        
        jk_encs_sim = le_jk.transform(simulated['Jenis_Kelamin'])
        gd_encs_sim = le_gd.transform(simulated['Golongan_Darah'])
        
        X_sim = pd.DataFrame({
            'Usia': simulated['Usia'],
            'Usia2': simulated['Usia'] ** 2,
            'JK_enc': jk_encs_sim,
            'GD_enc': gd_encs_sim,
            'Tahun_rel': simulated['Tahun'] - 2019,
            'JK_GD': jk_encs_sim * gd_encs_sim,
            'Usia_Tahun': simulated['Usia'] * (simulated['Tahun'] - 2018)
        })
        
        preds_sim = model.predict(X_sim)
        simulated['Prediksi'] = le_risiko.inverse_transform(preds_sim)
        pred_counts = simulated['Prediksi'].value_counts()
        
        projection_data.append({
            "Tahun": int(future_year),
            "Balita (0-5)": int(pred_counts.get('Balita (0-5)', 0)),
            "Remaja (6-17)": int(pred_counts.get('Remaja (6-17)', 0)),
            "Dewasa (18-45)": int(pred_counts.get('Dewasa (18-45)', 0)),
            "Lansia (46+)": int(pred_counts.get('Lansia (46+)', 0)),
            "Type": "Projected"
        })
        
    # 5. Save all to public/data/malaria_data.json
    output_path = os.path.join(base_dir, "public", "data", "malaria_data.json")
    
    payload = {
        "historical": historical_records,
        "projection": projection_data
    }
    
    with open(output_path, 'w') as f:
        json.dump(payload, f, indent=2)
        
    print(f"File data JSON berhasil disimpan ke {output_path}!")

if __name__ == "__main__":
    main()
